// ─────────────────────────────────────────────────────────────────────────────
// collections.controller.ts — The Grand Central Station of NFT data.
//
// Every HTTP request related to collections passes through here.
// Featured, discover, paginated lists, individual lookups, updates,
// deploys, confirmations, on-chain reads — it's all in this file.
// If you need a collection for any reason, you talk to this controller.
// And the controller, in turn, talks to the service. The chain of command.
// ─────────────────────────────────────────────────────────────────────────────

// The NestJS HTTP toolkit. Everything you need to define a REST controller
// and wish deeply that HTTP was simpler than it is.
import {
  Controller,       // Turns a class into a route handler. The foundation.
  Get,              // Fetches things. Politely. Usually works.
  Patch,            // Partial updates. Because PUT felt too committal.
  Param,            // Extracts route path params like :id. Old faithful.
  Query,            // Extracts query string params. The chaotic option.
  Post,             // Creates things. Also triggers side effects. Use responsibly.
  HttpException,    // The controlled explosion. Throws with HTTP context.
  HttpStatus,       // The sacred catalog of numbers that mean things (200, 404, 500...).
  Body,             // Extracts the request body. Where the real data lives.
  UsePipes,         // Attaches a pipe to a specific route. Per-method validation.
  ValidationPipe,   // Validates the incoming DTO shape. Rejects chaos.
  Logger,           // Prints structured logs. The breadcrumbs we leave for future us.
  UseGuards,        // Attaches auth guards. The doorman at the velvet rope.
} from '@nestjs/common';

// Swagger decorators — because documentation doesn't write itself.
// (It does, actually, with these decorators. That's the whole point.)
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

// ThrottlerGuard — rate limiting per route.
// Applied to the sync endpoint specifically, because we don't need
// someone hammer-triggering blockchain sync on a Monday morning.
import { ThrottlerGuard } from '@nestjs/throttler';

// The brains of the operation. CollectionsService does the database work.
// The controller is just the face; this is the actual intelligence.
import { CollectionsService } from './collections.service';

// The sync service — talks to the blockchain and reconciles on-chain state
// with our database. Does the uncomfortable work so the main service doesn't have to.
import { CollectionsSyncService } from './collections-sync.service';

// The NFTCollection DTO — the shape of a collection as the outside world sees it.
// Not raw database rows. Curated, structured, presentable.
import { NFTCollection } from './dto/collection.dto';

// The standard API response wrapper. Every response goes through this.
// Consistency: the one thing we actually managed to enforce.
import { ApiResponseDto } from './dto/api-response.dto';

// CreateCollectionDto — what we expect when someone wants to deploy a new collection.
// If the incoming body doesn't match this shape, ValidationPipe will reject it loudly.
import { CreateCollectionDto } from './dto/create-collection.dto';

// UpdateCollectionDto — what we expect for partial collection metadata updates.
// Creator-only. If you're not the creator, the service will remind you of that.
import { UpdateCollectionDto } from './dto/update-collection.dto';

// ApiKeyGuard — the secret handshake guard for admin-only endpoints.
// Imported from the IPFS module because cross-domain code reuse is a virtue.
// (Or laziness. Let's call it pragmatic architecture.)
import { ApiKeyGuard } from '../ipfs/guards/api-key.guard';

// SolanaService — used directly here to verify on-chain transactions.
// Because if someone says "I deployed this," we check the chain.
// Trust but verify. Mostly just verify.
import { SolanaService } from '../solana/solana.service';

/**
 * CollectionsController — The HTTP face of the NeXus NFT collections feature.
 *
 * Mounted at: /api/collections
 * Tagged in Swagger as: 'collections'
 *
 * This controller exposes the full lifecycle of an NFT collection:
 * - Discovery (featured, discover tabs, filtered lists)
 * - Reading (single collection by ID or slug, on-chain data)
 * - Writing (deploy, confirm, update)
 * - Maintenance (manual blockchain sync trigger)
 *
 * All routes validate input, log errors, and return structured ApiResponseDto objects.
 * The chaos is handled. The structure is maintained. The blockchain is questioned politely.
 */
@ApiTags('collections') // Groups all these endpoints under "collections" in Swagger.
@Controller('api/collections') // Base path: /api/collections. Logical. Sensible. We're proud.
export class CollectionsController {
  // Our trusty logger. Named after this controller so log lines are traceable.
  // When something breaks (and it will), this logger is how you find out where.
  private readonly logger = new Logger(CollectionsController.name);

  /**
   * Constructor — where NestJS injects all the dependencies this controller
   * needs to do its job. The IoC container does the heavy lifting.
   * We just list what we need and NestJS obliges. Very polite system.
   *
   * @param collectionsService  - The database CRUD layer for collections.
   * @param syncService         - The blockchain sync layer. The one that talks to Solana.
   * @param solanaService       - Direct Solana access for tx verification.
   */
  constructor(
    private readonly collectionsService: CollectionsService,   // The workhorse.
    private readonly syncService: CollectionsSyncService,      // The night shift worker.
    private readonly solanaService: SolanaService,             // The blockchain oracle.
  ) {}

  // ── GET /api/collections/featured ──────────────────────────────────────────

  /**
   * getFeatured — Returns collections that have been marked as featured.
   *
   * The editorial selection. The front page. The collections deemed worthy
   * of being shown to users who haven't decided what to mint yet.
   * No filters. No pagination. Just the featured few.
   *
   * @returns A list of NFTCollection objects. Empty array if nothing is featured.
   *          (In which case, someone needs to update the database. Not it.)
   */
  @Get('featured')
  @ApiOperation({ summary: 'Get featured collections' })
  @ApiResponse({ status: 200, description: 'Featured collections retrieved successfully' })
  async getFeatured(): Promise<ApiResponseDto<NFTCollection[]>> {
    try {
      // Ask the service for the featured collections.
      // The service knows what "featured" means. We trust it.
      const collections = await this.collectionsService.findFeatured();

      // Wrap in the standard response envelope and return.
      // success: true because it worked. We celebrate small victories.
      return { success: true, data: collections };
    } catch (error) {
      // Something went wrong in the service layer.
      // We don't know what and at this point we're afraid to ask.
      throw new HttpException(
        { success: false, error: 'Failed to fetch featured collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── GET /api/collections/discover?tab= ─────────────────────────────────────

  /**
   * getDiscover — Returns collections filtered by a "discover" tab category.
   *
   * The browsing experience. This is where users find their next mint.
   * Tabs: trending, new, ending_soon, free_mint.
   * Default tab is 'trending', because nobody defaults to 'ending_soon'
   * unless they enjoy mild existential urgency.
   *
   * @param tab - Optional tab filter. Defaults to 'trending'.
   * @returns Filtered list of NFTCollection objects.
   */
  @Get('discover')
  @ApiOperation({ summary: 'Get collections by discover tab' })
  // Enum the tab options in Swagger so nobody sends 'vibes' as a tab name.
  @ApiQuery({ name: 'tab', enum: ['trending', 'new', 'ending_soon', 'free_mint'], required: false })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async getDiscover(@Query('tab') tab?: string): Promise<ApiResponseDto<NFTCollection[]>> {
    try {
      // Default to 'trending' if no tab is provided.
      // Because undefined tab should return something useful, not an error.
      const collections = await this.collectionsService.findByTab(tab || 'trending');

      // Return the curated tab results.
      return { success: true, data: collections };
    } catch (error) {
      // Discovery failed. Somewhat ironic. Couldn't discover the collections.
      throw new HttpException(
        { success: false, error: 'Failed to fetch discover collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── GET /api/collections ────────────────────────────────────────────────────

  /**
   * getAll — The kitchen-sink endpoint. Returns all collections with optional
   * filtering, sorting, searching, pagination, and creator filtering.
   *
   * This endpoint tries to be all things to all callers. It succeeds, mostly.
   * It powers the dashboard, the public browse page, and probably a few
   * places we forgot we added it to. The workhorse of the whole API.
   *
   * @param status        - Filter by collection status (e.g. 'live', 'upcoming').
   * @param search        - Free-text search against collection name/description.
   * @param sortBy        - Sort order: newest, oldest, name, or minted count.
   * @param limitStr      - Page size as a string (because query params are always strings).
   *                        Clamped between 1 and 50. Defaults to 20.
   * @param cursor        - Opaque cursor for keyset pagination. The page token.
   * @param creatorAddress - Filter to a specific creator wallet. For the dashboard.
   * @returns Paginated list of NFTCollection objects plus a nextCursor for the next page.
   */
  @Get()
  @ApiOperation({ summary: 'Get all collections with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', enum: ['newest', 'oldest', 'name', 'minted'], required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (1–50). Default 20.' })
  // The cursor — an opaque token. Don't try to decode it. Don't reverse-engineer it.
  // Just pass it back on the next request and trust the process.
  @ApiQuery({ name: 'cursor', required: false, description: 'Opaque pagination cursor returned by the previous page.' })
  @ApiQuery({ name: 'creator', required: false, description: 'Filter by creator wallet address (for dashboard)' })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async getAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limitStr?: string,       // It's a string. It's always a string. Query params.
    @Query('cursor') cursor?: string,
    @Query('creator') creatorAddress?: string,
  ): Promise<ApiResponseDto<NFTCollection[]> & { nextCursor: string | null }> {
    try {
      // ── Limit Parsing ──────────────────────────────────────────────────────
      // Query params arrive as strings. We need a number. Minimal ceremony.
      // If it parses cleanly and falls within [1, 50], we use it.
      // Otherwise we let the service decide the default. Trust the service.
      let limit: number | undefined;
      if (limitStr != null && limitStr !== '') {
        const n = parseInt(limitStr, 10);
        // Only accept valid integers in the sane range. No "0", no "9999", no "NaN".
        if (!Number.isNaN(n) && n >= 1 && n <= 50) limit = n;
      }

      // ── Service Delegation ─────────────────────────────────────────────────
      // Hand off all the messy filter options to the service.
      // Trim whitespace from string params because users cannot be trusted
      // to not accidentally add a space. (We've seen things.)
      const result = await this.collectionsService.findAll({
        status,
        search: search?.trim() || undefined,
        sortBy,
        limit,
        cursor: cursor?.trim() || undefined,
        creatorAddress: creatorAddress?.trim() || undefined,
      });

      // Return data + nextCursor for the frontend to request the next page.
      // If nextCursor is null, you've reached the end. Congratulations.
      return { success: true, data: result.data, nextCursor: result.nextCursor };
    } catch (error) {
      // Generic failure. The service threw something we didn't anticipate.
      // This is the "we're not sure what happened" response. Very honest.
      throw new HttpException(
        { success: false, error: 'Failed to fetch collections' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── GET /api/collections/:id ────────────────────────────────────────────────

  /**
   * getOne — Fetches a single collection by its ID or slug.
   *
   * The detail view. The dedicated collection page.
   * Works with both numeric IDs and human-readable slugs
   * because "nexus-cosmic-apes-v2" is a lot friendlier in a URL
   * than "e4f1a8b2-..." (UUIDs in URLs are a cry for help).
   *
   * @param idOrSlug - The collection ID (UUID) or slug (string). Both work.
   * @returns The collection, or a 404 if it doesn't exist.
   *          (If you get a 404, check your spelling. Or the database.)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single collection by ID or slug' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getOne(@Param('id') idOrSlug: string): Promise<ApiResponseDto<NFTCollection>> {
    try {
      // Ask the service to find it. By ID or slug. Whatever works.
      const collection = await this.collectionsService.findOne(idOrSlug);

      // If the service returned nothing, it doesn't exist.
      // We could panic, but a structured 404 is more professional.
      if (!collection) {
        throw new HttpException(
          { success: false, error: 'Collection not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Found it. Here it is. We were never worried.
      return { success: true, data: collection };
    } catch (error) {
      // If it's already an HttpException (like our 404 above), rethrow as-is.
      // We don't want to wrap a 404 in a 500. That would be dishonest.
      if (error instanceof HttpException) {
        throw error;
      }
      // Otherwise, something unexpected happened. Classic 500.
      throw new HttpException(
        { success: false, error: 'Failed to fetch collection' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── PATCH /api/collections/:id ──────────────────────────────────────────────

  /**
   * updateCollection — Partially updates collection metadata.
   *
   * Creator-only. If you didn't create this collection, the service
   * will throw 'Unauthorized' and we will convert that to a 403.
   * Your wallet address must match. The blockchain remembers.
   *
   * @param id  - The collection ID to update.
   * @param dto - The update payload. Only whitelisted fields accepted.
   *              Anything else gets stripped by the ValidationPipe.
   * @returns The updated NFTCollection, fresh from the database.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update collection metadata (creator only)' })
  @ApiResponse({ status: 200, description: 'Collection updated' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })  // Not your collection. Move on.
  @ApiResponse({ status: 404, description: 'Collection not found' })
  // Per-route validation pipe — transforms and whitelists the update DTO.
  // Belt AND suspenders. The global pipe already runs, but this is local reinforcement.
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateCollection(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<ApiResponseDto<NFTCollection>> {
    // Extract the caller's wallet address from the DTO.
    // If they didn't send one, it's an empty string and the service will reject it.
    // (As it should. Anonymous updates are not a feature we offer.)
    const caller = dto.creatorAddress ?? '';

    try {
      // Hand off to the service. It will check ownership and apply the changes.
      // If it returns, it worked. If it throws, we handle it below.
      const updated = await this.collectionsService.updateCollection(id, dto, caller);

      // Success. The collection has been updated. The data is fresh.
      return { success: true, data: updated };
    } catch (error: any) {
      // "Collection not found" — classic 404. Someone sent the wrong ID.
      if (error?.message === 'Collection not found') {
        throw new HttpException({ success: false, error: 'Collection not found' }, HttpStatus.NOT_FOUND);
      }
      // "Unauthorized" — the caller is not the creator. Blocked. 403.
      // The collection knows who created it. And it's not you.
      if (error?.message === 'Unauthorized') {
        throw new HttpException({ success: false, error: 'Unauthorized' }, HttpStatus.FORBIDDEN);
      }
      // Something else went wrong. We don't know what. The service is hiding things.
      throw new HttpException({ success: false, error: 'Failed to update collection' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ── POST /api/collections/sync ──────────────────────────────────────────────

  /**
   * syncCollections — Manually triggers a blockchain sync.
   *
   * Admin-only endpoint (requires valid API key).
   * Also rate-limited by ThrottlerGuard because even admins shouldn't
   * be able to hammer the Solana RPC with abandon.
   *
   * The sync runs in the BACKGROUND — this endpoint returns immediately,
   * confirming the sync was started. Whether it succeeds is a separate concern.
   * (Background sync: fire, forget, pray, check logs in 10 minutes.)
   *
   * @returns A confirmation that the sync was started.
   *          Not a confirmation that it worked. Nuanced difference.
   */
  @Post('sync')
  // Apply both guards: ThrottlerGuard limits frequency, ApiKeyGuard limits who.
  // Belt AND suspenders AND a padlock AND a guard dog.
  @UseGuards(ThrottlerGuard, ApiKeyGuard)
  @ApiOperation({ summary: 'Manually trigger collection sync from blockchain (admin only)' })
  @ApiResponse({ status: 200, description: 'Sync started successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized — requires API key' })
  async syncCollections(): Promise<ApiResponseDto<{ message: string }>> {
    try {
      // Fire off the sync and DO NOT await it.
      // The sync can take a while. We're not making the caller wait.
      // This is fire-and-forget. The background kind. The trusting kind.
      this.syncService.syncCollections().catch((error) => {
        // Log error but don't throw (sync runs in background)
        // If the background sync fails, we log it and move on.
        // The endpoint already returned 200. We're committed to that now.
        console.error('Background sync failed:', error);
      });

      // Return immediately with a "we started it" confirmation.
      // The sync is out there, doing its thing. We believe in it.
      return {
        success: true,
        data: { message: 'Collection sync started in background' },
      };
    } catch (error) {
      // If even starting the sync threw, something is deeply wrong.
      // Like, "check the SolanaModule is running" levels of wrong.
      throw new HttpException(
        { success: false, error: 'Failed to start sync' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── POST /api/collections/deploy ───────────────────────────────────────────

  /**
   * deployCollection — Saves a collection to the database after the frontend
   * has signed and confirmed the on-chain transaction.
   *
   * The flow here is: user signs on-chain (frontend) → calls this endpoint
   * → we save the collection record. The collection starts in a "pending" state
   * and transitions to "ready" once confirmDeployment is called.
   *
   * Think of this as "register the birth." The actual on-chain birth happens
   * in the user's wallet. We just record the paperwork.
   *
   * @param deployData - The CreateCollectionDto. Everything we need to know
   *                     about the new collection. Validated rigorously.
   * @returns The new collection's ID, on-chain address, and URL slug.
   */
  @Post('deploy')
  @ApiOperation({ summary: 'Save collection to DB after frontend signs and confirms the on-chain tx' })
  @ApiResponse({ status: 201, description: 'Collection saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid collection data' })
  @ApiResponse({ status: 500, description: 'Failed to save collection' })
  // Per-route validation: transform and whitelist the incoming DTO.
  // If you send garbage, you get a 400. The garbage does not reach the database.
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async deployCollection(
    @Body() deployData: CreateCollectionDto,
  ): Promise<ApiResponseDto<{ collectionId: string; collectionAddress: string; slug: string }>> {
    try {
      // Let the service do the heavy lifting: validate, persist, return the record.
      const result = await this.collectionsService.deployCollection(deployData);

      // Success. The collection exists in our database now.
      // It's pending confirmation, but it exists. Progress.
      return { success: true, data: result };
    } catch (error) {
      // Extract the error message for the response — if the service threw something
      // specific, the caller deserves to know what it was.
      // Otherwise fall back to a generic message that tells them nothing useful.
      const message = (error as any)?.message ?? String(error) ?? 'Failed to deploy collection';

      // Log with full error context for debugging.
      // The logger knows. The logger always knows.
      this.logger.error('deployCollection failed', error);

      throw new HttpException(
        { success: false, error: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── POST /api/collections/:id/confirm ──────────────────────────────────────

  /**
   * confirmDeployment — Called by the frontend after the on-chain transaction
   * is confirmed. Marks the collection as "ready" in the database.
   *
   * This is step 2 of the deploy flow. Step 1 was POST /deploy (saves the record).
   * Step 2 is this: verify the transaction actually landed on Solana,
   * then flip the collection status to ready.
   *
   * We verify the transaction ourselves. We don't take the frontend's word for it.
   * Trust issues? No. Cryptographic verification. Different thing entirely.
   *
   * @param collectionId - The ID of the collection to confirm.
   * @param body         - Must include the Solana transaction signature.
   *                       No signature, no confirmation. That's the deal.
   * @returns The fully confirmed NFTCollection with updated status.
   */
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm on-chain deployment — called by frontend after tx is confirmed' })
  @ApiResponse({ status: 200, description: 'Collection marked as ready' })
  @ApiResponse({ status: 400, description: 'Transaction not confirmed on-chain' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async confirmDeployment(
    @Param('id') collectionId: string,
    @Body() body: { signature: string },
  ): Promise<ApiResponseDto<NFTCollection>> {
    // ── Signature Presence Check ─────────────────────────────────────────────
    // If there's no signature, we can't verify anything.
    // Send a 400 and tell them clearly: signature is required.
    // No signature, no deal. This is not negotiable.
    if (!body?.signature) {
      throw new HttpException(
        { success: false, error: 'signature is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── On-Chain Verification ────────────────────────────────────────────────
    // Talk to Solana and confirm the transaction is actually there.
    // We don't trust self-reported confirmations. The blockchain is the source of truth.
    // This is where "trust" meets "verify" and "verify" wins. Every time.
    const confirmed = await this.solanaService.verifyTransaction(body.signature);

    // If Solana says no, we say no.
    // The transaction might have failed, expired, or been made up entirely.
    // We're not in the business of confirming ghosts.
    if (!confirmed) {
      throw new HttpException(
        { success: false, error: 'Transaction not confirmed on-chain' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── Update Collection Status ─────────────────────────────────────────────
    // The blockchain confirmed it. Now we make the database reflect reality.
    // Status update: pending → ready. The collection is officially live.
    try {
      const collection = await this.collectionsService.confirmDeployment(collectionId, body.signature);

      // The collection is confirmed. It's real. It's on Solana.
      // We can now sleep slightly better at night.
      return { success: true, data: collection };
    } catch (error) {
      // Collection was confirmed on-chain but not found in our DB.
      // This is an awkward situation. Blockchain: 1, Database: 0.
      if ((error as any)?.message === 'Collection not found') {
        throw new HttpException({ success: false, error: 'Collection not found' }, HttpStatus.NOT_FOUND);
      }
      // Some other failure during the status update. Genuinely unexpected.
      throw new HttpException(
        { success: false, error: 'Failed to confirm deployment' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ── GET /api/collections/onchain/:address ──────────────────────────────────

  /**
   * getCollectionOnChain — Fetches collection data directly from the Solana blockchain.
   *
   * Bypasses our database entirely. Goes straight to the source.
   * Useful for verifying what's actually on-chain versus what we think is on-chain.
   * (Sometimes they differ. The blockchain does not care about our database's feelings.)
   *
   * Not a frequently-used route. But when you need it, you REALLY need it.
   * The "let me check this myself" endpoint. The X-ray machine.
   *
   * @param address - The on-chain address of the collection.
   * @returns Raw collection data from the blockchain. Unfiltered. Honest. Cold.
   */
  @Get('onchain/:address')
  @ApiOperation({ summary: 'Get collection data directly from blockchain' })
  @ApiResponse({ status: 200, description: 'Collection data retrieved from blockchain' })
  async getCollectionOnChain(
    @Param('address') address: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      // Delegate to the sync service, which knows how to read on-chain state.
      // The sync service: the one actually brave enough to talk to Solana directly.
      const collection = await this.syncService.getCollectionOnChain(address);

      // If nothing came back, it doesn't exist on-chain. Period.
      // The chain has spoken. The chain does not lie. (Usually.)
      if (!collection) {
        throw new HttpException(
          { success: false, error: 'Collection not found on-chain' },
          HttpStatus.NOT_FOUND,
        );
      }

      // Found it on-chain. Here is what the blockchain actually says about it.
      // No database bias. Just raw, immutable, cryptographically-secured truth.
      return { success: true, data: collection };
    } catch (error) {
      // Rethrow proper HttpExceptions (like the 404 above) without wrapping them.
      if (error instanceof HttpException) {
        throw error;
      }
      // Something failed while reaching the blockchain.
      // Could be RPC timeout, network issues, or the blockchain just being moody.
      // (Solana has moods. We accept this.)
      throw new HttpException(
        { success: false, error: 'Failed to fetch collection from blockchain' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — 9 endpoints. A full lifecycle. Birth, growth, verification,
 * discovery, editing, and the occasional emergency blockchain sanity check.
 *
 * This controller is the front door to an NFT launchpad that lets people
 * put pictures on a blockchain and call it art. (No judgment. We're here for it.)
 *
 * If you add an endpoint, document it. If you break an endpoint, fix it.
 * If you stare at this file long enough, it starts to stare back.
 * ─────────────────────────────────────────────────────────────────────────────
 */
