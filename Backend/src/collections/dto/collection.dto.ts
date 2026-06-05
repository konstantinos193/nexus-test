// ══════════════════════════════════════════════════════════════════════════════
// collection.dto.ts
//
// The public face of a Collection. The shape we show the world.
// Derived from the database entity but sanitized, formatted, and stripped
// of TypeORM internals before crossing the API boundary.
//
// If the entity is what Postgres knows, this is what the internet gets to see.
// ══════════════════════════════════════════════════════════════════════════════

// Swagger decorators: the annotations that turn a class definition into
// living, breathing API documentation. Without them: just types.
// With them: types AND a Swagger UI that developers actually use.
// (Developers use Swagger UI exactly once, then bookmark the URL forever.)
import { ApiProperty } from '@nestjs/swagger';


/**
 * NFTCollection
 *
 * The canonical DTO for a Collection as seen from the outside world.
 * This is the shape returned by every GET endpoint in the collections domain.
 *
 * Key design decisions:
 * - Dates are ISO strings (not Date objects) because JSON doesn't have a Date type.
 *   (JSON has never heard of Date. JSON doesn't care about Date. JSON is free.)
 * - status is the effectiveStatus (computed from phases + wall clock), not the raw DB status.
 *   What you see in this field is the truth as of the last write or the last cron run.
 * - traits, phases, fundReceivers are only present on detail responses (findOne).
 *   List endpoints omit them to keep payloads manageable. (50KB per row * 20 rows = grief.)
 * - blockchain is always 'solana'. This is a Solana launchpad. It will always be 'solana'.
 *   The union type is aspirational. (For now.)
 *
 * Field documentation is in the @ApiProperty decorators.
 * Swagger users will read those. Code readers read both. Welcome.
 */
export class NFTCollection {
  /**
   * The collection's UUID primary key.
   * Stable, unique, and boring — exactly what a primary key should be.
   * Use this for API calls that need a guaranteed-unique identifier.
   */
  @ApiProperty()
  id: string;

  /**
   * The URL-safe slug for the collection detail page.
   * Used in routes like /drops/[slug].
   * Generated at creation time from the name + a base36 timestamp suffix.
   * (Because two collections named "Cool Monkeys" are a fact of life on a launchpad.)
   */
  @ApiProperty({ description: 'URL-safe identifier for /drops/[slug]' })
  slug: string;

  /**
   * The collection's display name.
   * As chosen by the creator. For better or worse. Usually better.
   * (Occasionally worse. We've seen "Untitled Collection". Multiple times.)
   */
  @ApiProperty()
  name: string;

  /**
   * A description of the collection — the pitch, the lore, the "why mint this" text.
   * Markdown is not officially supported but people will try it anyway.
   * (They always try it anyway.)
   */
  @ApiProperty()
  description: string;

  /**
   * URL to the collection's primary display image.
   * The face of the project. The thing that appears on the card.
   * IPFS URLs are expected. HTTP URLs are accepted. Empty strings are tolerated.
   * (Empty strings are a cry for help. We hear it. We cannot fix it from here.)
   */
  @ApiProperty()
  imageUrl: string;

  /**
   * URL to the collection's banner image.
   * The wide-format header image. The billboard. The first impression.
   * Optional — not every creator has a banner. We respect that.
   */
  @ApiProperty({ required: false })
  bannerUrl?: string;

  /**
   * The creator's display name or label.
   * This comes from metadata. It may or may not match the wallet address.
   * (It almost never matches the wallet address. Wallets are not display names.)
   */
  @ApiProperty()
  creator: string;

  /**
   * The creator's Solana wallet address (base58).
   * The authoritative identity for authorization checks.
   * This is the address that signed the deployment transaction.
   * "With great wallet address comes great immutability." — Nobody, but should have.
   */
  @ApiProperty()
  creatorAddress: string;

  /**
   * The blockchain this collection lives on.
   * Currently always 'solana'. The type is a union in case we expand one day.
   * (We might expand one day. The architecture is ready. The ambition is ready.
   *  The budget for multi-chain is a conversation for another sprint.)
   */
  @ApiProperty({ enum: ['solana'] })
  blockchain: 'solana';

  /**
   * The total number of NFTs in this collection (max supply).
   * 0 means "open edition" or "not yet set." Ambiguous, but honest.
   */
  @ApiProperty()
  totalSupply: number;

  /**
   * How many NFTs have been minted so far.
   * The progress bar in number form. The metric everyone watches during a mint.
   * When minted === totalSupply: the dream is over. Time to check the floor price.
   */
  @ApiProperty()
  minted: number;

  /**
   * The mint price in SOL (or base units — check the context).
   * 0 means free mint. null means "we haven't decided yet."
   * (0 and null are different vibes. 0 is generosity. null is indecision.)
   */
  @ApiProperty({ required: false })
  price?: number;

  /**
   * The effective collection status — the computed, accurate status.
   *
   * This is NOT the raw database status. It is the status after applying
   * the phase schedule against wall-clock time. What you see here is reality.
   *
   * States:
   *   draft      — not yet deployed. The creator is still thinking.
   *   preparing  — deployed but not yet ready for minting. Almost there.
   *   ready      — deployed and open for minting (or about to be).
   *   minting    — actively minting. The bots have arrived. God help the gas fees.
   *   completed  — sold out or all phases ended. The collection has lived its life.
   *   paused     — manually paused. Something happened. We don't ask what.
   */
  @ApiProperty({ enum: ['draft', 'preparing', 'ready', 'minting', 'completed', 'paused'] })
  status: 'draft' | 'preparing' | 'ready' | 'minting' | 'completed' | 'paused';

  /**
   * Rarity traits for the collection — only present on detail (findOne) responses.
   * Array of { name, value, rarity? } objects for trait-rarity display.
   * On list responses this field is omitted to keep payloads small.
   * (On list responses, nobody needs the traits. On detail pages, everyone does.)
   */
  @ApiProperty({ required: false, type: 'array' })
  traits?: { name: string; value: string; rarity?: number }[];

  /**
   * ISO 8601 timestamp: when this collection was created in our database.
   * Not the on-chain creation time (that's in traits.metadataUri land).
   * The DB insertion time. When we first learned about this collection.
   */
  @ApiProperty()
  createdAt: string;

  /**
   * ISO 8601 timestamp: when this collection was last updated.
   * Changes on every metadata update, status change, or sync cycle.
   * (The updatedAt timestamp is the heartbeat of the record.
   *  If it stops moving, the sync service has stopped moving too.)
   */
  @ApiProperty()
  updatedAt: string;

  /**
   * ISO 8601 timestamp for the start of the first mint phase.
   * The moment the gates open. The beginning of the chaos.
   * Optional — not all collections have a scheduled start time.
   */
  @ApiProperty({ required: false })
  mintStart?: string;

  /**
   * ISO 8601 timestamp for when the mint ends (last phase closes).
   * The deadline. The FOMO engine. The "you have until X" field.
   * Optional — open-edition collections may run indefinitely.
   * (Open editions are brave. Open editions trust the market. Respect.)
   */
  @ApiProperty({ required: false })
  endDate?: string;

  /**
   * Whether this collection is featured on the homepage.
   * true = someone with admin access blessed this collection.
   * false = just another collection, doing its best.
   */
  @ApiProperty({ required: false })
  featured?: boolean;

  /**
   * Royalty in basis points (e.g., 500 = 5%).
   * The creator's ongoing cut of secondary sales.
   * Only indexed for tradable collections — not all collections have royalties.
   * (The ones without royalties are leaving money on the table. We don't judge.
   *  We just note it here, for posterity.)
   */
  @ApiProperty({ required: false, description: 'Royalty percentage (seller fee basis points, e.g., 500 = 5%) - only indexed for tradable collections' })
  royaltyBasisPoints?: number;

  /**
   * Platform fee in basis points (e.g., 100 = 1%).
   * Additive on top of the creator price. The house always takes a small cut.
   * (The house is running Postgres, the Solana RPC, and the sync cron.
   *  The house has operating costs. The house is reasonable about it.)
   */
  @ApiProperty({ required: false, description: 'Platform fee percentage (basis points, e.g., 100 = 1%) - additive on top of creator price' })
  platformFeeBasisPoints?: number;

  /**
   * The creator's Twitter/X URL. Optional social link.
   * Expect "https://twitter.com/..." or "https://x.com/..." — we don't validate the format.
   * (We validate the URL at write time. By the time you see this, it passed the check.)
   */
  @ApiProperty({ required: false })
  twitterUrl?: string;

  /**
   * The project's Discord invite URL. Optional social link.
   * Where the community lives. Where the "wen mint?" messages accumulate.
   * Where the mods get tired at 3 AM.
   */
  @ApiProperty({ required: false })
  discordUrl?: string;

  /**
   * The project's website URL. Optional.
   * The official home. The roadmap page. The "we have a roadmap" page.
   * (Having a website is a green flag. We record it faithfully.)
   */
  @ApiProperty({ required: false })
  websiteUrl?: string;

  /**
   * The mint phases — only present on detail (findOne) responses.
   *
   * Each phase has a name, start/end times, type (public vs allowlist),
   * price override, per-wallet limits, and more.
   *
   * This JSONB blob is the scheduling data that drives computeEffectiveStatus().
   * It is sacred. Handle with care. Don't mutate it directly in the DB.
   * Use the updateCollection() service method. Let it recompute effectiveStatus.
   */
  @ApiProperty({ required: false, type: 'array' })
  phases?: Record<string, any>[];

  /**
   * The fund receivers — only present on detail (findOne) responses.
   *
   * An array of { address, share } objects that define where mint proceeds go.
   * Can split revenue between the creator, team members, a charity wallet, etc.
   * The share values should sum to 100 (percent) or 10000 (basis points).
   * (They don't always sum correctly. We validate at write time. Mostly.)
   */
  @ApiProperty({ required: false, type: 'array' })
  fundReceivers?: Record<string, any>[];
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// NFTCollection: the contract between the backend and everyone who calls it.
// Every field here is a promise. Every optional field is a maybe.
// Every @ApiProperty is a note to whoever reads the Swagger docs at 11 PM
// while debugging a frontend layout bug.
//
// If you add a field to Collection entity, add it here too.
// The entity and the DTO are in a relationship.
// They are committed to each other.
// Respect the commitment.
// ══════════════════════════════════════════════════════════════════════════════
