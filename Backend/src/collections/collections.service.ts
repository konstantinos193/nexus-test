// ══════════════════════════════════════════════════════════════════════════════
// collections.service.ts
// The beating heart of this operation. Also the thing most likely to wake you
// up at 3 AM. (They are the same thing.)
// ══════════════════════════════════════════════════════════════════════════════

// NestJS's gift to us: exceptions with HTTP status codes baked in.
// ConflictException: because someone ALWAYS tries to create a duplicate.
import { ConflictException, Injectable } from '@nestjs/common';

// The sacred bridge between TypeORM and the DI container.
// Without @InjectRepository, you're just holding a promise and a prayer.
import { InjectRepository } from '@nestjs/typeorm';

// DataSource: for transactions. Repository: for everything else.
// Two tools, one goal: don't corrupt the database. (No promises.)
import { DataSource, Repository } from 'typeorm';

// The entity that actually lives in Postgres and keeps us employed.
// CollectionStatus is the mood ring of on-chain reality.
import { Collection, CollectionStatus } from '../database/entities/collection.entity';

// The DTO-shaped version of a Collection that we hand to the outside world.
// Cleaner than the raw entity. Less honest, more presentable.
import { NFTCollection } from './dto/collection.dto';

// What creators send us when they dare to launch something new.
// The optimism is palpable. The required fields are not.
import { CreateCollectionDto } from './dto/create-collection.dto';

// What creators send us when they regret their initial decisions.
// All fields optional — because commitment is hard.
import { UpdateCollectionDto } from './dto/update-collection.dto';

// The platform fee, in basis points. The single source of truth for what we charge
// on top of every mint. Used here to compute the buyer's all-in price server-side so
// the frontend never has to re-derive fee math. 100 = 1%, additive.
import { PLATFORM_FEE_BPS } from '../solana/constants';


// ── Status resolution ─────────────────────────────────────────────────────────
// The part of the code that decides whether a collection is living its best life
// or has quietly given up. We've all been there.

/**
 * These statuses are terminal — they do not auto-transition, they do not pass Go,
 * they do not collect 200 SOL. Once a collection is COMPLETED, PAUSED, or DRAFT,
 * the blockchain can chant at it all it wants. We're done here.
 *
 * (Much like my career ambitions after reading the Solana docs for the first time.)
 */
const LOCKED_STATUSES = new Set<string>([
  CollectionStatus.COMPLETED, // Finished. Cooked. Dropped. Gone.
  CollectionStatus.PAUSED,    // Someone hit the brakes. Existentially speaking.
  CollectionStatus.DRAFT,     // Born. Never shipped. Relatable.
]);

/**
 * Derive the effective status from the stored base status + phase schedule.
 *
 * Pure function — no side effects, deterministic at a given moment in time.
 * This is the only deterministic thing in the entire codebase. Treasure it.
 *
 * Used both to populate the effectiveStatus column on writes and to resolve
 * status in toNFTCollection() when effectiveStatus is not yet stored.
 * (Because we cannot be trusted to always store it. We are only human.)
 *
 * Transitions — a short tragedy in three acts:
 *   ready / preparing → minting    once any phase startDateTime has passed
 *   ready / preparing → completed  once all phases have a past endDateTime
 *   minting           → completed  once all phases have a past endDateTime
 *   completed / paused / draft     locked — never auto-transition
 *                                  (unlike my inbox, which never stops)
 *
 * @param baseStatus - What the database thinks the status is.
 * @param phases     - What time thinks the status should be.
 * @returns          - The uncomfortable truth.
 */
export function computeEffectiveStatus(baseStatus: string, phases: any[]): string {
  // If this collection is locked, we don't touch it. Respect the finality.
  if (LOCKED_STATUSES.has(baseStatus)) return baseStatus;

  // Wall clock time: the one source of truth that neither we nor the blockchain controls.
  const now = Date.now();

  // If every phase has ended, the collection is COMPLETED.
  // All things end. Even the good mint phases. Especially the good ones.
  if (
    phases.length > 0 &&
    phases.every(p => p.endDateTime && new Date(p.endDateTime).getTime() <= now)
  ) {
    return CollectionStatus.COMPLETED;
  }

  // If at least one phase has started, we're MINTING. Buckle up.
  // This is the chaos window. The bots have arrived. God help us.
  if (phases.some(p => p.startDateTime && new Date(p.startDateTime).getTime() <= now)) {
    return CollectionStatus.MINTING;
  }

  // Nothing has happened yet. We wait. As we always wait.
  return baseStatus;
}

/**
 * Columns for list endpoints — excludes heavy JSONB blobs (traits, phases, fundReceivers).
 * Because hauling 50KB of JSON for a grid card is not a personality. It's a performance issue.
 * SELECT * is the enemy of pagination. Don't be SELECT *.
 */
const LIST_SELECT: (keyof Collection)[] = [
  'id', 'name', 'slug', 'description', 'imageUrl', 'bannerUrl',
  'creator', 'creatorAddress', 'blockchain', 'totalSupply', 'minted',
  'price', 'status', 'effectiveStatus', 'featured', 'featuredRank', 'mintStart',
  'endDate', 'mintAddress', 'txSignature', 'twitterUrl', 'discordUrl', 'websiteUrl',
  'royaltyBasisPoints', 'platformFeeBasisPoints', 'createdAt', 'updatedAt',
];

/**
 * Columns for single-record detail view — includes JSONB blobs needed by the detail page.
 * The full picture. The unabridged edition. The thing Postgres weeps while serializing.
 * Worth it. (The phases are sacred. The fundReceivers are sacred-er.)
 */
const DETAIL_SELECT: (keyof Collection)[] = [
  ...LIST_SELECT,           // Everything from the list view, because we're thorough
  'traits',                 // Rarity data. NFT collectors live and die by this.
  'phases',                 // Mint phases. The schedule that determines our 3 AM alerts.
  'fundReceivers',          // Where the money goes. The most important JSONB column.
];


// ── Service ───────────────────────────────────────────────────────────────────
// The main event. The orchestrator. The thing that talks to TypeORM so you don't have to.

/**
 * CollectionsService
 *
 * Manages the full lifecycle of NFT Collections in the database.
 * CRUD with opinions. Pagination without regrets. Transactions with locks.
 *
 * If this service is down, the launchpad is down.
 * If the launchpad is down, creators are angry.
 * If creators are angry, someone is getting a Slack message at midnight.
 * That someone is probably us. (It's always us.)
 */
@Injectable()
export class CollectionsService {
  constructor(
    // The TypeORM repository — our primary interface with the Collection table.
    // Without this, we are nothing. Just TypeScript screaming into the void.
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,

    // DataSource: for when you need a transaction because a Repository.save() alone
    // is not pessimistic enough to make you feel safe. (Spoiler: it never is.)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Returns a QueryBuilder that always excludes soft-deleted rows.
   *
   * Use this instead of createQueryBuilder() directly to prevent accidental
   * exposure of deleted collections in future query additions. We soft-delete
   * because hard-deleting data is how you have a very bad Monday. And Tuesday.
   * (deletedAt IS NULL — the one WHERE clause that stands between order and chaos.)
   *
   * @param alias - The SQL alias for the Collection table. Defaults to 'c'.
   *               Because 'c' is for Collection, and also for Catharsis.
   */
  private baseQb(alias = 'c') {
    return this.collectionRepository
      .createQueryBuilder(alias)
      .where(`${alias}.deletedAt IS NULL`); // The soft-delete sentinel. Respect it.
  }

  /**
   * Find all featured collections, ordered by minted count descending.
   *
   * "Featured" means someone with admin access decided this collection deserves
   * the spotlight. Unlike my code PRs, which are never featured. Top 10 only —
   * because if you have more than 10 featured collections, you've lost the plot.
   *
   * @returns Up to 10 featured NFTCollections, sorted by hype (minted DESC).
   */
  async findFeatured(): Promise<NFTCollection[]> {
    // Project only list columns — no blobs for the grid view.
    const cols = LIST_SELECT.map(c => `c.${c}`);
    const collections = await this.baseQb()
      .select(cols)
      .andWhere('c.featured = true')               // Only the chosen ones.
      .orderBy('c.featuredRank', 'ASC', 'NULLS LAST') // Owner-curated order first…
      .addOrderBy('c.minted', 'DESC')               // …then most minted (and for unranked ones).
      .take(10)                                      // 10. Not 11. Discipline.
      .getMany();
    return collections.map(toNFTCollection);
  }

  /**
   * Find collections by tab — the homepage tabs that users click while
   * wondering which NFT collection will make them rich. (None of them. Probably.)
   *
   * Supports: 'trending', 'new', 'ending_soon', 'free_mint'.
   * Unknown tabs fall back to 'trending' — because at least one of us should
   * be optimistic about what's popular.
   *
   * @param tab - The tab identifier from the frontend. Handle with care.
   * @returns   - Up to 6 NFTCollections matching the tab criteria.
   */
  async findByTab(tab: string): Promise<NFTCollection[]> {
    const now = new Date();                             // Time of reckoning.
    const cols = LIST_SELECT.map(c => `c.${c}`);
    let qb = this.baseQb().select(cols);

    switch (tab) {
      case 'trending':
        // M-4: Filter to active collections only so stale high-mint collections
        // from months ago don't permanently dominate the trending tab.
        // The past should stay in the past. (Unless it's a rug pull, in which case,
        // the past follows you forever.)
        qb = qb
          .andWhere(
            '(c.effectiveStatus IN (:...statuses) OR (c.effectiveStatus IS NULL AND c.status IN (:...statuses)))',
            { statuses: [CollectionStatus.MINTING, CollectionStatus.READY] },
          )
          .andWhere('(c.endDate IS NULL OR c.endDate > :now)', { now }) // Not expired.
          .orderBy('c.minted', 'DESC')                                  // Hype-sorted.
          .take(6);                                                       // 6. The magic number.
        break;

      case 'new':
        // Freshest first. The new arrivals. The ones that still have hope.
        qb = qb.orderBy('c.createdAt', 'DESC').take(6);
        break;

      case 'ending_soon':
        // The ticking clock tab. The FOMO engine. The anxiety machine.
        // "Mint now or regret forever" — brought to you by ASC ordering.
        qb = qb
          .andWhere('c.endDate IS NOT NULL')             // Must have a deadline.
          .andWhere('c.endDate >= :now', { now })        // Must not already be over.
          .orderBy('c.endDate', 'ASC')                   // Closest to death first.
          .take(6);
        break;

      case 'free_mint':
        // The people's tab. The tab of zero-cost chaos.
        // Price IS NULL means "we forgot to set a price", which is basically free.
        qb = qb
          .andWhere('(c.price = 0 OR c.price IS NULL)')
          .take(6);
        break;

      default:
        // Unknown tab? We fall back to trending.
        // If you're not trending, you're defaulting. Story of my life.
        return this.findByTab('trending');
    }

    const raw = await qb.getMany();
    return raw.map(toNFTCollection); // Sanitize before sending to the outside world.
  }

  /**
   * Find all collections with filtering, sorting, searching, and cursor-based pagination.
   *
   * This is the workhorse. The beast. The method that handles every possible filter
   * the frontend can throw at it, plus a cursor that encodes time AND id in base64
   * so we can seek past the last row without an OFFSET. Because OFFSET is how you
   * turn a fast DB into a slow one. We've learned. Painfully.
   *
   * @param filters.status          - Filter by effectiveStatus. Exact match only.
   * @param filters.search          - ILIKE search on name and description.
   * @param filters.sortBy          - Sort strategy: 'oldest', 'name', 'minted', or default (newest).
   * @param filters.limit           - Page size. Defaults to 20 (or 15 with search).
   * @param filters.creatorAddress  - Filter to a single creator's collections.
   * @param filters.cursor          - Opaque pagination cursor. base64(JSON). Don't touch it.
   * @returns                       - A page of NFTCollections and the next cursor (or null).
   */
  async findAll(filters: {
    status?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    creatorAddress?: string;
    cursor?: string;
  }): Promise<{ data: NFTCollection[]; nextCursor: string | null }> {
    const cols = LIST_SELECT.map(c => `c.${c}`);
    const qb = this.baseQb().select(cols);

    // Creator filter — when someone wants to see their own portfolio of
    // "things I deployed at 2 AM and haven't slept since".
    if (filters.creatorAddress) {
      qb.andWhere('c.creatorAddress = :addr', { addr: filters.creatorAddress });
    }

    // C-4: Filter directly on the stored effectiveStatus column.
    // COALESCE falls back to status for rows not yet backfilled by the migration.
    // This eliminates the JS post-filter and broken pagination from the +30
    // over-fetch pattern. The old way was a lie. This is the truth.
    if (filters.status) {
      // Sargable form: lets the planner use idx_collection_effective_status_created_at.
      // COALESCE(effectiveStatus, status) is a function on a column and blocks index use.
      qb.andWhere(
        '(c.effectiveStatus = :status OR (c.effectiveStatus IS NULL AND c.status = :status))',
        { status: filters.status },
      );
    }

    // Full-text-ish search. ILIKE because we're case-insensitive and generous.
    // Postgres is doing the heavy lifting here. Buy Postgres a coffee.
    const search = filters.search?.trim();
    if (search) {
      qb.andWhere(
        '(c.name ILIKE :q OR c.description ILIKE :q)',
        { q: `%${search}%` }, // Wildcards on both sides: the "I'll know it when I see it" query.
      );
    }

    // Page size: slightly smaller when searching because we're fetching richer context.
    // The +1 trick: fetch one extra row to detect whether a next page exists without
    // a COUNT(*). COUNT(*) is slow. COUNT(*) is the enemy. We don't COUNT(*) here.
    const pageSize = filters.limit ?? (search ? 15 : 20);
    qb.take(pageSize + 1); // One extra scout to see over the hill.

    // Cursor-based pagination. The cursor encodes the sort key(s) + id as
    // base64(JSON) so the DB can seek past the last seen row without an OFFSET scan.
    // Each sortBy direction uses its own keyset predicate — using the wrong
    // direction (e.g. createdAt < cursor for an ASC sort) would skip pages silently.
    const sortBy = filters.sortBy ?? 'default';
    if (filters.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(filters.cursor, 'base64').toString('utf8'));
        const { id: curId } = decoded;
        switch (sortBy) {
          case 'oldest':
            qb.andWhere(
              '(c.createdAt > :cur OR (c.createdAt = :cur AND c.id > :curId))',
              { cur: new Date(decoded.createdAt), curId },
            );
            break;
          case 'name':
            qb.andWhere(
              '(c.name > :curName OR (c.name = :curName AND c.id > :curId))',
              { curName: decoded.name, curId },
            );
            break;
          case 'minted':
            qb.andWhere(
              '(c.minted < :cur OR (c.minted = :cur AND c.id < :curId))',
              { cur: decoded.minted, curId },
            );
            break;
          default:
            qb.andWhere(
              '(c.createdAt < :cur OR (c.createdAt = :cur AND c.id < :curId))',
              { cur: new Date(decoded.createdAt), curId },
            );
        }
      } catch {
        // Malformed cursor — start from the beginning.
      }
    }

    switch (sortBy) {
      case 'oldest': qb.orderBy('c.createdAt', 'ASC').addOrderBy('c.id', 'ASC');   break;
      case 'name':   qb.orderBy('c.name', 'ASC').addOrderBy('c.id', 'ASC');        break;
      case 'minted': qb.orderBy('c.minted', 'DESC').addOrderBy('c.id', 'DESC');    break;
      default:       qb.orderBy('c.createdAt', 'DESC').addOrderBy('c.id', 'DESC');
    }

    const rows = await qb.getMany();

    // The +1 trick resolution: if we got more than pageSize, there IS a next page.
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows; // Trim the scout row.

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = page[page.length - 1];
      // Encode the sort key(s) that match the active sortBy so the next request
      // uses the correct keyset field in the seek predicate.
      let cursorPayload: Record<string, unknown>;
      switch (sortBy) {
        case 'oldest':
          cursorPayload = { createdAt: last.createdAt.toISOString(), id: last.id };
          break;
        case 'name':
          cursorPayload = { name: last.name, id: last.id };
          break;
        case 'minted':
          cursorPayload = { minted: last.minted, id: last.id };
          break;
        default:
          cursorPayload = { createdAt: last.createdAt.toISOString(), id: last.id };
      }
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
    }

    return { data: page.map(toNFTCollection), nextCursor };
  }

  /**
   * Find one collection by UUID or slug.
   *
   * The detail page's best friend and only hope.
   * Accepts either a UUID (for internal links) or a slug (for pretty URLs).
   * Because /drops/cool-monkey-club-k0j9l is better than /drops/a4f3b2c1-...
   * (The slug is a kindness. The UUID is the truth.)
   *
   * @param idOrSlug - Either a UUID v4 or a URL-safe slug string.
   * @returns        - The full NFTCollection with JSONB blobs, or null if it ghosted us.
   */
  async findOne(idOrSlug: string): Promise<NFTCollection | null> {
    // Is it a UUID? The regex knows. The regex always knows.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    // Solana mint addresses: base58-encoded, 32–44 chars, no hyphens — edit page links use these
    const isMintAddress = !isUuid && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(idOrSlug);
    const cols = DETAIL_SELECT.map(c => `c.${c}`); // Full detail columns — blobs included.
    const collection = await this.baseQb()
      .select(cols)
      .andWhere(
        isUuid        ? 'c.id = :val' :
        isMintAddress ? 'c.mintAddress = :val' :
                        'c.slug = :val',
        { val: idOrSlug },
      )
      .getOne();
    return collection ? toNFTCollection(collection) : null; // null means it doesn't exist. Or it was deleted. Or we typo'd the slug.
  }

  /**
   * Persist a new collection to the database after the creator has initiated
   * an on-chain deployment. The collection record is created immediately —
   * confirmDeployment() locks in the txSignature once the blockchain agrees.
   *
   * The slug is generated from the name + a base36 timestamp suffix to ensure
   * uniqueness without a retry loop. Ugly but reliable. Like most solutions
   * written on a deadline. (Every solution is written on a deadline.)
   *
   * Throws ConflictException if the creator already has a collection with this name.
   * Because duplicate names are a UX crime, and we are the law. (Sort of.)
   *
   * @param data - The validated CreateCollectionDto from the controller.
   * @returns    - The new collection's id, mintAddress, and slug.
   */
  async deployCollection(data: CreateCollectionDto): Promise<{
    collectionId: string;
    collectionAddress: string;
    slug: string;
  }> {
    // Slugify the name: lowercase, alphanumeric, hyphens only.
    // Then append a base36 timestamp so two collections named "Cool Monkeys" don't collide.
    // Is it pretty? No. Does it work? Every time. That's the deal.
    const base = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const slug = `${base}-${Date.now().toString(36)}`;

    // Extract phase timing to compute the initial effectiveStatus.
    // First phase: where the journey begins. Last phase: where it (hopefully) ends.
    const firstPhase = data.phases?.[0];
    const lastPhase  = data.phases?.at(-1);
    const phases     = data.phases ?? []; // Default to empty — no phases = no schedule yet.

    // Build the entity. Every field mapped. Every undefined handled.
    // This is what careful code looks like at 11 PM.
    const entity = this.collectionRepository.create({
      name:               data.name,
      slug,
      description:        data.description,
      imageUrl:           data.collectionImage || '', // Fallback to empty string, not undefined.
      bannerUrl:          data.bannerImage,
      creator:            data.creatorAddress,
      creatorAddress:     data.creatorAddress,
      blockchain:         'solana',                   // Always Solana. This is a Solana launchpad. (For now.)
      totalSupply:        data.totalSupply        ?? 0,
      minted:             0,                          // Zero minted. This is day one. The dream is alive.
      price:              data.freeMint ? 0 : (data.mintPrice ?? 0), // Free mint respects no price. As it should.
      status:             CollectionStatus.READY,
      effectiveStatus:    computeEffectiveStatus(CollectionStatus.READY, phases), // Compute truth at birth.
      mintStart:          firstPhase?.startDateTime ? new Date(firstPhase.startDateTime) : undefined,
      endDate:            lastPhase?.endDateTime    ? new Date(lastPhase.endDateTime)    : undefined,
      featured:           false,                      // Not featured until someone with admin access says so.
      royaltyBasisPoints: Math.round((data.royaltyPercent ?? 0) * 100), // Percent to BPS. Math. Required.
      platformFeeBasisPoints: PLATFORM_FEE_BPS,        // The fee baked on-chain at init — store it so the row is truthful before the first sync.
      mintAddress:        data.collectionAddress,
      txSignature:        data.txSignature,
      phases:             data.phases,
      fundReceivers:      data.fundReceivers,         // The money routing table. Sacred.
      twitterUrl:         data.twitterUrl,
      discordUrl:         data.discordUrl,
      websiteUrl:         data.websiteUrl,
      updatedBy:          data.creatorAddress,        // Track who last touched this. Accountability.
      updatedAt:          new Date(),                 // Database requires this — track when we made it.
    });

    // Wrap in a transaction. Because if the save fails, we want a clean rollback,
    // not a half-inserted row haunting the database forever.
    return this.dataSource.transaction(async (manager) => {
      try {
        const saved = await manager.save(entity) as unknown as Collection;
        return {
          collectionId:      saved.id,
          collectionAddress: saved.mintAddress ?? '',
          slug:              saved.slug,
        };
      } catch (err: any) {
        // Unique index: idx_collection_creator_name_unique ON (creatorAddress, name)
        // Postgres error code 23505 = unique_violation. We catch it and throw something
        // that the frontend can actually display to the user. (They deserve to know.)
        if (err?.code === '23505' && err?.constraint === 'idx_collection_creator_name_unique') {
          throw new ConflictException('A collection with this name already exists for this creator.');
        }
        throw err; // Anything else: let it bubble. Not our fault. (Probably.)
      }
    });
  }

  /**
   * Update a collection's metadata. Creator-owned. Authorized by wallet address.
   *
   * Uses a pessimistic write lock because concurrent updates to the same collection
   * are a real edge case when creators are trigger-happy on the save button.
   * (They are always trigger-happy on the save button.)
   *
   * Fields not present in the DTO are left untouched. This is PATCH semantics.
   * If you want to nuke a field, send an empty string. We don't judge. Much.
   *
   * Recomputes effectiveStatus after every save because phases may have changed.
   * The status follows the phases. The phases follow the clock. The clock follows entropy.
   *
   * @param id            - Collection UUID. The authoritative identifier.
   * @param dto           - Partial update payload. All fields optional. (The dream.)
   * @param callerAddress - The wallet address making the request. Must match creatorAddress.
   * @returns             - The updated NFTCollection.
   */
  async updateCollection(
    id: string,
    dto: UpdateCollectionDto,
    callerAddress: string,
  ): Promise<NFTCollection> {
    return this.dataSource.transaction(async (manager) => {
      // Resolve the identifier — same logic as findOne: UUID, mintAddress, or slug.
      // The edit page passes mintAddress for deployed collections, so we need all three paths.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const isMintAddress = !isUuid && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
      const collection = await manager.findOne(Collection, {
        where: isUuid        ? { id }              :
               isMintAddress ? { mintAddress: id } :
                               { slug: id },
        lock: { mode: 'pessimistic_write' }, // Lock it. Own it. Save it.
      });
      if (!collection) throw new Error('Collection not found');       // Ghost collection. Sad.
      if (collection.creatorAddress !== callerAddress) throw new Error('Unauthorized'); // Not your collection, friend.

      // Apply only the fields that were actually sent. Undefined = "don't touch".
      // This pattern is repetitive, but it's explicit. Explicit is better than clever.
      if (dto.name           !== undefined) collection.name               = dto.name;
      if (dto.description    !== undefined) collection.description        = dto.description;
      if (dto.imageUrl       !== undefined) collection.imageUrl           = dto.imageUrl;
      if (dto.bannerUrl      !== undefined) collection.bannerUrl          = dto.bannerUrl;
      if (dto.twitterUrl     !== undefined) collection.twitterUrl         = dto.twitterUrl;
      if (dto.discordUrl     !== undefined) collection.discordUrl         = dto.discordUrl;
      if (dto.websiteUrl     !== undefined) collection.websiteUrl         = dto.websiteUrl;
      if (dto.royaltyPercent !== undefined) collection.royaltyBasisPoints = Math.round(dto.royaltyPercent * 100); // % → BPS
      if (dto.price          !== undefined) collection.price              = dto.price;
      if (dto.mintStart      !== undefined) collection.mintStart          = new Date(dto.mintStart);
      if (dto.endDate        !== undefined) collection.endDate            = new Date(dto.endDate);
      if (dto.phases         !== undefined) collection.phases             = dto.phases as any;        // JSONB. Trust the shape.
      if (dto.fundReceivers  !== undefined) collection.fundReceivers      = dto.fundReceivers as any; // JSONB. Count the percentages.

      // Recompute effectiveStatus whenever phases or status may have changed.
      // We do this on every update because phase schedules affect status and
      // we refuse to let stale status linger like a bad commit message.
      const phases = Array.isArray(collection.phases) ? collection.phases : [];
      collection.effectiveStatus = computeEffectiveStatus(collection.status, phases);
      collection.updatedBy = callerAddress; // Audit trail. Who done it? They done it.

      const saved = await manager.save(collection) as unknown as Collection;
      return toNFTCollection(saved); // Format before returning. Always format.
    });
  }

  /**
   * Confirm an on-chain deployment by recording the transaction signature.
   *
   * The collection was created optimistically in deployCollection(). This is
   * the moment of truth where we record the txSignature and stamp status READY.
   * The blockchain has spoken. We transcribe its words faithfully.
   *
   * (If the tx failed, you shouldn't be calling this. But we lock anyway.
   * Because we've seen things. And we no longer assume the frontend is careful.)
   *
   * @param collectionId - The UUID of the collection to confirm.
   * @param txSignature  - The Solana transaction signature. The receipt. The proof.
   * @returns            - The confirmed NFTCollection.
   */
  async confirmDeployment(collectionId: string, txSignature: string): Promise<NFTCollection> {
    return this.dataSource.transaction(async (manager) => {
      // Pessimistic lock: no double-confirmations, no race conditions.
      // We are careful people. (We became careful people the hard way.)
      const collection = await manager.findOne(Collection, {
        where: { id: collectionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!collection) throw new Error('Collection not found'); // The void returns nothing.

      // Recompute phases in case they were set before this confirmation.
      const phases = Array.isArray(collection.phases) ? collection.phases : [];

      // READY: the status of a collection that has been deployed and is waiting for mints.
      // The calm before the storm. The held breath. The "is it live?" moment.
      collection.status          = CollectionStatus.READY;
      collection.effectiveStatus = computeEffectiveStatus(CollectionStatus.READY, phases);
      collection.txSignature     = txSignature; // The on-chain receipt. Frame-worthy.

      const saved = await manager.save(collection) as unknown as Collection;
      return toNFTCollection(saved);
    });
  }
}


// ── Formatter ─────────────────────────────────────────────────────────────────
// The translator between raw DB entity and the sanitized DTO the outside world sees.
// It formats dates. It resolves statuses. It quietly fixes what Postgres hands us.
// It is humble. It asks for nothing. It receives no credit.

/**
 * Convert a raw Collection entity into a clean NFTCollection DTO.
 *
 * This is a pure function that:
 *   - Resolves the effective status (stored or computed, whichever is more current)
 *   - Converts Date objects to ISO strings (because JSON doesn't do Dates)
 *   - Coerces the blockchain type (it's always 'solana', but TypeScript needs convincing)
 *   - Normalizes traits to an empty array if missing (null is not an array, TypeScript)
 *
 * If you're adding a new field to the entity, add it here too.
 * The entity and the DTO are in a relationship. Respect the relationship.
 *
 * @param c - The raw Collection entity from the database.
 * @returns   A clean, API-safe NFTCollection DTO.
 */
function toNFTCollection(c: Collection): NFTCollection {
  const phases: any[] = Array.isArray(c.phases) ? c.phases : []; // Null-safe phase extraction.

  // Always recompute status from phases at read time so time-based transitions (ready→minting,
  // minting→completed) happen automatically without needing a write. Use the stored
  // effectiveStatus (or status) as the base so locked states (paused, completed) are respected.
  const resolvedStatus = computeEffectiveStatus(c.effectiveStatus || c.status, phases) as NFTCollection['status'];

  // Compute effective price: if there is exactly one currently active phase and it has a
  // priceOverride, surface that as the collection price so callers don't have to re-derive it.
  // When multiple phases are active simultaneously the caller (MintInteractionModule) uses
  // activePhase.priceOverride directly from the phases array — base price is the right fallback.
  const now = Date.now();
  const activePhases = phases.filter(p =>
    p.startDateTime &&
    new Date(p.startDateTime).getTime() <= now &&
    (!p.endDateTime || new Date(p.endDateTime).getTime() > now),
  );
  const effectivePrice =
    activePhases.length === 1 && activePhases[0].priceOverride != null
      ? parseFloat(activePhases[0].priceOverride)
      : c.price;

  // All-in price the buyer actually pays per NFT: the base mint price plus the additive
  // platform fee. The per-collection platformFeeBasisPoints column is currently unpopulated
  // (0) across all rows, so we use the platform-wide PLATFORM_FEE_BPS (the same 1% the
  // global config, the create form, and the mint page all charge), honoring a per-collection
  // value only when it's a real positive override. Computed once so the frontend renders it verbatim.
  const feeBps = c.platformFeeBasisPoints && c.platformFeeBasisPoints > 0
    ? c.platformFeeBasisPoints
    : PLATFORM_FEE_BPS;
  const base = c.price ?? 0;
  const buyerPrice = base > 0 ? base * (1 + feeBps / 10_000) : base;

  return {
    ...c,                                              // Spread the entity — inherit what we don't explicitly map.
    status:          resolvedStatus,                   // Always the effective (computed) status, not the raw base.
    effectiveStatus: resolvedStatus,                   // Explicit field — frontend reads c.effectiveStatus ?? c.status.
    mintAddress:     c.mintAddress ?? undefined,       // Explicit — not left to the spread so Swagger sees it.
    price:           effectivePrice,                   // Active single-phase priceOverride wins; multi-phase falls back to base.
    mintPrice:       c.price,                          // Always the base headline price — grid cards read this, never a phase override.
    buyerPrice:      buyerPrice,                       // Base + additive platform fee — what the buyer actually pays. Grid cards display this.
    createdAt:       c.createdAt.toISOString(),        // Dates → ISO strings. JSON doesn't do Date objects. Never did.
    updatedAt:       c.updatedAt.toISOString(),
    mintStart:       c.mintStart ? c.mintStart.toISOString() : undefined,
    endDate:         c.endDate   ? c.endDate.toISOString()   : undefined,
    blockchain:      c.blockchain as 'solana',
    traits:          (Array.isArray(c.traits) ? c.traits : []) as NFTCollection['traits'],
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// This service is the gatekeeper between the frontend's hopes and the database's
// cold reality. Every query here was written with intent, every lock was earned
// with a war story, and every transaction was wrapped with the knowledge that
// the blockchain does not forgive half-finished saves.
//
// If you're reading this because something broke: check the cursor first.
// It's always the cursor.
//
// If you're reading this because everything is fine: close this file.
// Don't tempt it.
// ══════════════════════════════════════════════════════════════════════════════
