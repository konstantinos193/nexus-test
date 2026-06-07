// ══════════════════════════════════════════════════════════════════════════════
// collections-sync.service.ts
//
// The bridge between the immutable truth of the blockchain and the mutable lies
// of our database. It wakes up every 5 minutes, puts on its hard hat, and goes
// to work crawling the Solana network like a determined, caffeinated spider.
//
// Nobody asked for this job. The job chose us.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Collections Sync Service
 *
 * This service syncs on-chain collection data to the database.
 * Because we can't trust the database to stay in sync with the blockchain.
 * (And because users will create collections on-chain without telling us —
 * they always do — they sign the transaction, close the tab, and vanish
 * like a ghost in a bear market.)
 *
 * Features:
 * - Poll on-chain registry for new collections (method 1: fast, elegant, occasionally broken)
 * - Fall back to getProgramAccounts when the registry fails (method 2: slow, reliable, ugly)
 * - Sync collection status and featured flags from on-chain state
 * - Update metadata URIs when changed on-chain (IPFS is forever, but URIs are not)
 * - Recompute effectiveStatus every 5 minutes via cron (the clock waits for no one)
 *
 * This is the bridge between the immutable blockchain and our mutable database.
 * (Blockchain for trust. Database for speed. This service for the existential dread in between.)
 */

// NestJS core: Injectable (we are born of DI), Logger (we narrate our own suffering),
// and OnModuleInit (because startup is its own adventure).
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// The cron decorator and expression constants — because "every 5 minutes, forever"
// is a sentence that deserves its own import.
import { Cron, CronExpression } from '@nestjs/schedule';

// The sacred TypeORM decorators. Without @InjectRepository, we are just
// a class that wishes it had a database connection.
import { InjectRepository } from '@nestjs/typeorm';

// DataSource: for transactions with full control.
// Repository: for the day-to-day.
// Together: the dynamic duo of "please don't corrupt the DB".
import { DataSource, Repository } from 'typeorm';

// The entity. The thing we're syncing into. The reason this file exists.
import { Collection, CollectionStatus } from '../database/entities/collection.entity';

// The status computation oracle — imported from the service that already
// figured out this math so we don't have to figure it out again.
// DRY: Don't Repeat Yourself. Or the status logic. Especially the status logic.
import { computeEffectiveStatus } from './collections.service';

// The Solana service — our connection to the blockchain.
// It holds the RPC connection. We hold the hope.
import { SolanaService } from '../solana/solana.service';

// The program ID — the Solana address of our on-chain program.
// One address. All collections. The registry of everything we care about.
import { PROGRAM_ID } from '../solana/constants';

// Solana web3.js: the library that lets us talk to the blockchain
// and occasionally scream at RPC nodes that don't respond.
import { Connection, PublicKey } from '@solana/web3.js';

// bs58: because Solana addresses are base58, and we need to encode
// the discriminator for getProgramAccounts filters. A niche tool for a niche job.
import bs58 from 'bs58';

// createHash: for generating the 8-byte Anchor account discriminator.
// SHA-256 of "account:Collection". The blockchain's fingerprinting system.
import { createHash } from 'crypto';

// Anchor is optional — only needed if IDL is available.
// If not available, we'll use manual decoding (see decodeCollectionAccount).
// Dynamic require so the app doesn't crash when Anchor isn't installed.
// (A graceful degradation. A rare thing. Cherish it.)
let AnchorModule: any;
try {
  AnchorModule = require('@coral-xyz/anchor');
} catch {
  // Anchor not installed — will use manual decoding.
  // Fallback mode: raw bytes, DataView, and prayer. (Mostly prayer.)
  AnchorModule = null;
}

// File system utils — for loading the IDL from disk.
// The IDL is the contract spec. Without it, we read raw bytes.
// With it, Anchor does the heavy lifting. One of those is more fun than the other.
import { readFileSync, existsSync } from 'fs';

// path.join: because __dirname + '../../../' is how people go insane.
import { join } from 'path';


// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Collection status mapping — on-chain u8 to database string.
 *
 * The blockchain stores status as a raw byte (0–5).
 * We store it as a human-readable string because we are considerate.
 * (The blockchain does not know what "completed" means. It only knows 4.
 *  We translate. That's our whole thing here.)
 */
const STATUS_MAP: Record<number, string> = {
  0: CollectionStatus.DRAFT,       // Born. Not yet ready.
  1: CollectionStatus.PREPARING,   // Getting ready. Stretching.
  2: CollectionStatus.READY,       // Locked and loaded. Waiting for minters.
  3: CollectionStatus.MINTING,     // It's happening. Bots are active. God help us.
  4: CollectionStatus.COMPLETED,   // Done. Minted out. The dream is over. Long live the floor price.
  5: CollectionStatus.PAUSED,      // Halted. By choice or by crisis. (Usually crisis.)
};

/**
 * H-4: Cap concurrent DB upserts to avoid exhausting the connection pool during bulk sync.
 *
 * 50 collections per batch. Not 500. Not infinity.
 * We learned this the hard way. The connection pool is finite.
 * So is our patience with "too many clients" errors at 2 AM.
 */
const SYNC_BATCH_SIZE = 50;


// ── Service ───────────────────────────────────────────────────────────────────

/**
 * CollectionsSyncService
 *
 * Implements OnModuleInit so it runs its initial sync on startup.
 * Then runs on a cron every 5 minutes to keep statuses fresh.
 *
 * Two sync concerns:
 *   1. syncCollections()           — full blockchain crawl, new collections, metadata refresh
 *   2. recomputeEffectiveStatuses()— DB-only cron that resolves phase time windows
 *
 * Together, these ensure the DB never drifts from reality for more than ~5 minutes.
 * (5 minutes is an eternity in NFT mints. We're aware. We've done what we can.)
 */
@Injectable()
export class CollectionsSyncService implements OnModuleInit {
  // The logger. Our narrator. The voice in the logs that says "things are happening"
  // or "things have gone very wrong." Usually one of those two.
  private readonly logger = new Logger(CollectionsSyncService.name);

  // The Anchor program instance — optional. If IDL is found, we use it.
  // If not, we fall back to manual byte parsing (see decodeCollectionAccount).
  private program: any; // Program type from Anchor (optional — aggressively optional)

  // The on-chain program ID as a PublicKey. Used for PDA derivation and account filtering.
  private programId: PublicKey;

  // The registry PDA — a derived address that holds the list of all collection addresses.
  // Null until onModuleInit completes. Touch it before then and suffer.
  private registryPda: PublicKey | null = null;

  // The bump seed for the registry PDA. Stored in case we need to re-derive.
  // (We probably won't. But we keep it. Just in case. Like all our other anxieties.)
  private registryBump: number | null = null;

  constructor(
    // The Collection repository — for reading and writing collection rows.
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,

    // DataSource — for transactions with pessimistic locking. Required for safe upserts.
    private readonly dataSource: DataSource,

    // The Solana service — provides the live RPC connection.
    // Lazy-loaded to handle startup ordering gracefully.
    private solanaService: SolanaService,
  ) {
    // Unified program — all three old programs merged into one.
    // Read from env so localnet/mainnet is a config swap, not a code change.
    // (As it should be. Config in code is a war crime.)
    this.programId = new PublicKey(PROGRAM_ID);
  }

  /**
   * Lazy getter for the Solana connection.
   *
   * Why lazy? Because the SolanaService initializes asynchronously after module bootstrap.
   * Accessing .connection in the constructor would get you undefined and a cryptic error.
   * We've been there. We don't go there anymore.
   */
  private get connection(): Connection {
    return this.solanaService.getConnection();
  }

  /**
   * NestJS lifecycle hook — called once after the module is fully initialized.
   *
   * Attempts to initialize the Anchor program (if IDL is available), then kicks
   * off the initial sync in the background. If the RPC is down at startup,
   * we retry with a fixed delay. (Baby steps toward resilience.)
   *
   * We do NOT block app startup on this. If the blockchain is having a moment,
   * the API should still serve cached data. We are resilient. (We have to be.)
   */
  async onModuleInit() {
    try {
      // ── Anchor initialization ──────────────────────────────────────────────
      // Try to stand up the Anchor program if the library is available.
      // A program instance gives us typed account decoding for free.
      // Free is good. We like free.
      if (AnchorModule) {
        // We need a dummy wallet for the provider — we're only reading, never signing.
        // A signer that signs nothing. The most honest kind of signer.
        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async (tx: any) => tx,           // Signs nothing. Returns everything.
          signAllTransactions: async (txs: any[]) => txs,   // Batch no-op. Very efficient.
        };

        // AnchorProvider: the glue between a Connection, a wallet, and commitment level.
        // 'confirmed' commitment: wait for the majority of validators to agree.
        // (We want consensus, not chaos. We get enough chaos for free.)
        const provider = new AnchorModule.AnchorProvider(
          this.connection,
          dummyWallet,
          { commitment: 'confirmed' },
        );

        // IDL file search — we check multiple possible locations because the build
        // output path varies depending on whether you're in Docker, CI, or chaos.
        // (Often all three simultaneously.)
        const possibleIdlPaths = [
          join(__dirname, '../../target/types/nexus_launchpad.json'),             // Local dev output
          join(__dirname, '../../../programs/target/types/nexus_launchpad.json'), // Monorepo layout
          join(process.cwd(), 'target/types/nexus_launchpad.json'),               // Docker CWD
          join(process.cwd(), 'programs/target/types/nexus_launchpad.json'),      // Docker monorepo
        ];

        let idl;
        // Iterate paths until we find one that exists and parses.
        // The first path that works wins. We celebrate small victories.
        for (const idlPath of possibleIdlPaths) {
          try {
            if (existsSync(idlPath)) {
              const idlData = readFileSync(idlPath, 'utf-8');
              idl = JSON.parse(idlData); // Parse the IDL. It's just JSON. Big JSON.
              this.logger.log(`Loaded IDL from ${idlPath}`);
              break; // Found it. Stop looking. Breathe.
            }
          } catch (error) {
            // This path failed. Try the next one. We do not panic. (Yet.)
            continue;
          }
        }

        if (idl) {
          // IDL found — create the fully-typed Anchor program instance.
          // From this point, account decoding is automatic and beautiful.
          this.program = new AnchorModule.Program(idl, this.programId, provider);
          this.logger.log('Anchor program initialized with IDL');
        } else {
          // No IDL anywhere. Manual decoding it is.
          // Welcome to the byte-offset layer. Mind your alignment.
          this.logger.warn('IDL file not found, will use manual decoding');
        }
      } else {
        // Anchor itself isn't installed. Raw bytes, DataView, and the struct layout
        // in decodeCollectionAccount. Godspeed.
        this.logger.warn('@coral-xyz/anchor not installed, will use manual decoding');
      }

      this.logger.log('Collections sync service initialized');

      // ── Initial sync ──────────────────────────────────────────────────────
      // Start initial sync in background; do not block or crash app if RPC is down.
      // The API must stay responsive even if the blockchain is sulking.
      this.runInitialSyncWithRetry();
    } catch (error) {
      // Something failed during initialization. Log it and move on.
      // A broken sync service is better than a broken app.
      this.logger.error('Failed to initialize sync service:', error);
    }
  }

  /**
   * Run initial sync with retries so transient RPC unavailability does not look like a crash.
   *
   * Retry logic: up to `retries` attempts with a fixed `delayMs` between each.
   * Not exponential backoff — because if the RPC is down for 5 minutes, we're
   * already past the point where backing off politely helps.
   *
   * Connection errors are detected by message content — not the most elegant approach,
   * but the Solana web3.js error types are not always what you'd hope for.
   * (We've read the error objects. They are expressive. In a raw, unfiltered way.)
   *
   * @param retries  - Max retry attempts. Default: 3. Because we believe in third chances.
   * @param delayMs  - Delay between retries in ms. Default: 5000. (5 seconds of hope.)
   */
  private runInitialSyncWithRetry(retries = 3, delayMs = 5000): void {
    const attempt = (attemptNumber: number) => {
      this.syncCollections()
        .then(() => {
          // It worked. Quietly celebrate. Don't tell anyone. They'll jinx it.
          this.logger.log('Initial collection sync completed');
        })
        .catch((error) => {
          // Check if it's a connection error (RPC is down, not a bug in our code).
          const isConnectionError =
            error?.cause?.code === 'ECONNREFUSED' ||
            error?.message?.includes('fetch failed') ||
            error?.message?.includes('ECONNREFUSED');

          if (isConnectionError && attemptNumber < retries) {
            // Transient failure. Wait and try again. We are patient.
            this.logger.warn(
              `Solana RPC unreachable (attempt ${attemptNumber}/${retries}). Retrying in ${delayMs / 1000}s...`,
            );
            setTimeout(() => attempt(attemptNumber + 1), delayMs);
          } else {
            // Either out of retries, or it's not a connection error — it's a real problem.
            // Log it and accept our fate. The cron will retry in 5 minutes anyway.
            this.logger.error('Initial sync failed (RPC may be down or misconfigured):', error?.message || error);
          }
        });
    };
    attempt(1); // Begin the first attempt. The journey starts here.
  }

  /**
   * Sync all collections from on-chain state to the database.
   *
   * This is the main sync function. It queries the blockchain for all known
   * collection accounts and upserts them into the database. Two strategies,
   * tried in order:
   *
   *   Method 1: Registry PDA — fast, but only works if the registry account exists
   *             and the Anchor program is available. When it works: beautiful.
   *             When it doesn't: we fall through to method 2.
   *
   *   Method 2: getProgramAccounts — slower (fetches ALL program accounts and filters
   *             by discriminator), but works everywhere, always, as long as the RPC
   *             doesn't rate-limit us. (They do. Eventually. They always do.)
   *
   * Processes in batches of SYNC_BATCH_SIZE to avoid killing the connection pool.
   * Logs created/updated counts because metrics are how we prove we did something.
   *
   * Does NOT rethrow errors — this runs in the background and the API must not crash
   * just because the blockchain is having a disagreement with itself.
   */
  async syncCollections(): Promise<void> {
    try {
      const connection = this.solanaService.getConnection();
      if (!connection) {
        // RPC not ready yet. Skip this cycle. Try again in 5 minutes.
        // (The cron is patient. The cron is always patient.)
        this.logger.warn('Solana connection not ready yet, skipping sync');
        return;
      }

      this.logger.log('Starting collection sync from blockchain...');

      // ── Method 1: Registry PDA ─────────────────────────────────────────────
      // The fast path. Derive the registry PDA, fetch it, decode the collection list.
      // If anything goes wrong (no registry, no Anchor), fall through silently.
      let collectionAddresses: PublicKey[] = [];

      try {
        // Derive the registry PDA using the canonical seed.
        // Seeds: ["registry"]. That's it. Simple. Clean. Derivable.
        const [registryPda, bump] = PublicKey.findProgramAddressSync(
          [Buffer.from('registry')],
          this.programId,
        );
        this.registryPda = registryPda;   // Cache for later use. Just in case.
        this.registryBump = bump;          // And the bump. For completeness.

        // Fetch the registry account data from the RPC.
        const registryAccount = await this.connection.getAccountInfo(registryPda);

        if (registryAccount && this.program) {
          // We have the account data AND the Anchor program to decode it. Luxury.
          const registry = this.program.account.collectionRegistry.coder.accounts.decode(
            'collectionRegistry',
            registryAccount.data,
          );
          // Map the raw public keys to PublicKey objects.
          collectionAddresses = registry.collections.map(
            (addr: any) => new PublicKey(addr),
          );
          this.logger.log(`Found ${collectionAddresses.length} collections in registry`);
        }
      } catch (error) {
        // Registry not available. Fall through to method 2. No drama.
        // (We maintain composure in the face of missing accounts. We are professionals.)
        this.logger.warn('Registry not found or not accessible, falling back to getProgramAccounts');
      }

      // ── Method 2: getProgramAccounts (fallback) ────────────────────────────
      // When the registry isn't available, we ask the RPC to give us every account
      // owned by our program that has the Collection discriminator. Slow. Reliable.
      // The workhorse strategy. Never elegant. Always there.
      if (collectionAddresses.length === 0) {
        this.logger.log('Using getProgramAccounts to find collections...');

        // Compute the 8-byte discriminator: first 8 bytes of SHA-256("account:Collection").
        // This is the Anchor convention. The filter ensures we only get Collection accounts,
        // not random program state garbage. (There is always random program state garbage.)
        const discriminator = this.getCollectionDiscriminator();
        const accounts = await this.connection.getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 0,                           // Discriminator is always at offset 0.
                bytes: bs58.encode(discriminator),   // base58-encoded for the RPC filter format.
              },
            },
          ],
        });

        collectionAddresses = accounts.map((acc) => acc.pubkey);
        this.logger.log(`Found ${collectionAddresses.length} collections via getProgramAccounts`);
      }

      // ── Batch processing ───────────────────────────────────────────────────
      // H-4: Process in batches to avoid exhausting the DB connection pool.
      // Each batch is processed concurrently within itself (Promise.all),
      // but batches run sequentially. Speed with discipline.
      let synced = 0;  // Total collections touched this run.
      let created = 0; // Newly discovered collections. Welcome to the database.
      let updated = 0; // Already-known collections with refreshed data.

      for (let i = 0; i < collectionAddresses.length; i += SYNC_BATCH_SIZE) {
        const batch = collectionAddresses.slice(i, i + SYNC_BATCH_SIZE);

        // Process each collection in the batch concurrently.
        // If one fails, it logs and returns null — it doesn't take down the whole batch.
        // Because one bad collection should not ruin the evening for everyone else.
        const results = await Promise.all(
          batch.map(async (addr) => {
            try {
              return await this.syncSingleCollection(addr);
            } catch (error) {
              // Log the failure and move on. This collection will be retried next cron cycle.
              this.logger.error(`Failed to sync collection ${addr.toString()}:`, error);
              return null; // Null result: this one didn't make it.
            }
          }),
        );

        // Tally the results. Nulls are failures — we count them as nothing.
        for (const r of results) {
          if (!r) continue;       // Failed. Skip. Grieve privately.
          if (r.created) created++;
          if (r.updated) updated++;
          synced++;
        }
      }

      // Log the final tally. This is how we prove the cron did something useful.
      this.logger.log(
        `Sync complete: ${synced} synced (${created} created, ${updated} updated)`,
      );
    } catch (error) {
      // Something catastrophic happened. Log it and move on.
      // The API is still up. The cron will try again in 5 minutes.
      // We do not rethrow. We endure.
      this.logger.error('Collection sync failed:', error);
      // Do not rethrow: sync runs in background; API should stay up
    }
  }

  /**
   * Sync a single collection account from the blockchain to the database.
   *
   * Fetches the on-chain account data, decodes it (via Anchor IDL or manual parsing),
   * fetches the metadata from the metadata URI (if present), and upserts the result
   * into the database keyed on mintAddress.
   *
   * Keying on mintAddress (not creatorAddress) is critical — a creator can have
   * multiple collections. Keying on creatorAddress would overwrite the first
   * every time they deploy a second. We learned this lesson. It was educational.
   *
   * @param collectionAddress - The on-chain PublicKey of the Collection account.
   * @returns                 - Whether the record was created or updated.
   */
  async syncSingleCollection(
    collectionAddress: PublicKey,
  ): Promise<{ created: boolean; updated: boolean }> {
    try {
      // ── Fetch account data ─────────────────────────────────────────────────
      // Go to the blockchain. Knock on the door. Ask for the account data.
      // If nobody's home (account doesn't exist), we throw and the caller logs it.
      const accountInfo = await this.connection.getAccountInfo(collectionAddress);
      if (!accountInfo) {
        // The account was in our address list but doesn't exist on-chain.
        // It may have been closed. It may be a ghost. Either way: not our problem right now.
        throw new Error('Collection account not found');
      }

      // ── Decode account data ────────────────────────────────────────────────
      // Preferred: Anchor IDL decoding — types, names, everything.
      // Fallback: manual DataView parsing — raw bytes, manual offset arithmetic, therapy.
      let collectionData;
      if (this.program) {
        // The civilized approach: Anchor handles the deserialization.
        collectionData = this.program.account.collection.coder.accounts.decode(
          'collection',
          accountInfo.data,
        );
      } else {
        // The manual approach: byte by byte, field by field.
        // It works. It's not fun. See decodeCollectionAccount for the full picture.
        collectionData = this.decodeCollectionAccount(accountInfo.data);
      }

      // ── Extract fields ─────────────────────────────────────────────────────
      // The on-chain data decoded into human-readable values.
      // toString() on PublicKey gives us the base58 string — the familiar Solana address format.
      const authority    = new PublicKey(collectionData.authority).toString(); // The creator.
      const mint         = new PublicKey(collectionData.mint).toString();      // The collection mint address.
      const metadataUri  = collectionData.metadataUri || '';                   // Where the off-chain metadata lives.
      const createdAt    = new Date(collectionData.createdAt.toNumber() * 1000); // Unix timestamp → JS Date. Always *1000.
      const status       = STATUS_MAP[collectionData.status] || 'draft';       // u8 → human string.
      const featured     = collectionData.featured || false;                   // Boolean. Simple. Refreshing.

      // ── Fetch metadata from URI ────────────────────────────────────────────
      // The on-chain account stores a URI. The actual name, description, and image
      // live off-chain (IPFS/Arweave). We fetch them now.
      //
      // Security check: cap at 5 MB. We've seen things uploaded to IPFS.
      // We don't want those things in our database.
      let metadata: any = {};
      if (metadataUri) {
        try {
          const response = await fetch(metadataUri); // Beg the metadata server for its secrets.
          if (response.ok) {
            const contentLength = response.headers.get('content-length');
            const MAX_BYTES = 5 * 1024 * 1024; // 5 MB. The hard limit. No exceptions.

            if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
              // Content-Length says it's too big. We believe it.
              this.logger.warn(`Skipping metadata from ${metadataUri}: content-length ${contentLength} exceeds 5 MB`);
            } else {
              const text = await response.text();
              if (text.length > MAX_BYTES) {
                // Body is too big even without Content-Length warning us first. Rude.
                this.logger.warn(`Skipping metadata from ${metadataUri}: body size ${text.length} exceeds 5 MB`);
              } else {
                metadata = JSON.parse(text); // Parse the JSON. This is the treasure.
              }
            }
          }
        } catch (error) {
          // Metadata fetch failed. Network issue, IPFS gateway down, invalid JSON — who knows.
          // We warn and continue with empty metadata. The collection name will be the fallback.
          this.logger.warn(`Failed to fetch metadata from ${metadataUri}:`, error);
        }
      }

      // ── Prepare upsert payload ─────────────────────────────────────────────
      // On-chain synced collections have no phase data, so effectiveStatus equals the on-chain status.
      const collectionDataToSave = {
        name:            metadata.name || `Collection ${mint.slice(0, 8)}`, // Fallback name: first 8 chars of mint.
        description:     metadata.description || '',
        imageUrl:        metadata.image || '',
        creator:         metadata.properties?.creators?.[0]?.address || authority, // Metaplex creator field.
        creatorAddress:  authority,
        mintAddress:     mint,
        blockchain:      'solana' as const,
        status:          status as CollectionStatus,
        effectiveStatus: computeEffectiveStatus(status, []), // No phases = status IS effectiveStatus.
        featured:        featured,
        traits: {
          metadataUri:      metadataUri,
          onChainAddress:   collectionAddress.toString(),
        } as any,
      };

      // ── Atomic upsert ──────────────────────────────────────────────────────
      // Keyed on mintAddress — globally unique per collection.
      // Pessimistic write lock: one sync worker owns this row at a time.
      // (Without the lock, concurrent syncs race. We've seen what racing looks like.
      //  It's not a photo finish. It's a stack trace.)
      return this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(Collection, {
          where: { mintAddress: mint },
          lock: { mode: 'pessimistic_write' },
        });

        if (existing) {
          // We've seen this collection before. Update it with fresh on-chain data.
          await manager.update(Collection, existing.id, collectionDataToSave);
          return { created: false, updated: true };
        }

        // New collection! We've never seen this one before. Welcome to the launchpad.
        const slug = this.generateSlug(collectionDataToSave.name);
        const newCollection = manager.create(Collection, { ...collectionDataToSave, slug });
        await manager.save(newCollection);
        return { created: true, updated: false };
      });
    } catch (error) {
      this.logger.error(
        `Failed to sync collection ${collectionAddress.toString()}:`,
        error,
      );
      throw error; // Rethrow: the buck stops at syncCollections, not here.
    }
  }

  /**
   * Compute the 8-byte Anchor account discriminator for Collection accounts.
   *
   * Anchor convention: discriminator = first 8 bytes of SHA-256("account:Collection").
   * This fingerprint is stored at offset 0 of every Collection account.
   * It's how getProgramAccounts knows which accounts are Collections
   * vs. which are other program state we don't care about.
   *
   * (SHA-256 for a fingerprint. Even NFT syncing requires cryptography. Wonderful.)
   *
   * @returns The 8-byte discriminator as a Uint8Array.
   */
  private getCollectionDiscriminator(): Uint8Array {
    return new Uint8Array(
      createHash('sha256').update('account:Collection').digest().slice(0, 8),
    );
  }

  /**
   * Decode a raw Collection account buffer into a structured object.
   *
   * This is the fallback for when the Anchor IDL is not available.
   * Manual binary parsing. Byte by byte. Field by field.
   * (Not how anyone wants to spend their afternoon. But here we are.)
   *
   * Layout mirrors programs/programs/nexus-launchpad/src/lib.rs Collection struct.
   * Regenerate the IDL (anchor build -- --features idl-build) to avoid needing this.
   * If the Rust struct changes and this method is not updated, everything breaks silently.
   * You've been warned. Pin this comment to your monitor.
   *
   * Fixed-size section (everything before metadata_uri):
   *   8   discriminator      — skip it, it's how we found this account in the first place
   *   32  authority          — the collection creator's wallet
   *   32  mint               — the collection's SPL token mint
   *   32  mint_authority     — who can mint (usually a PDA)
   *   32  creator_wallet     — where creator proceeds go
   *   32  platform_wallet    — where platform fees go
   *   8   max_supply (u64)   — total supply cap
   *   8   minted (u64)       — how many have been minted so far
   *   8   price (u64)        — mint price in lamports
   *   8   start_time (i64)   — Unix timestamp for mint start
   *   8   end_time (i64)     — Unix timestamp for mint end
   *   8   freeze_until (i64) — metadata freeze timestamp
   *   8   created_at (i64)   — account creation timestamp
   *   2   platform_fee_bps (u16) — platform fee in basis points
   *   1   mint_limit_per_wallet (u8) — max mints per wallet
   *   1   metadata_standard (u8) — Metaplex standard enum
   *   1   flags (u8)         — bitfield for various on/off features
   *   1   status (u8)        — collection lifecycle status
   *   1   featured (bool)    — whether this collection is featured
   *   1   bump (u8)          — PDA bump seed
   *   32  allowlist_root ([u8;32]) — Merkle root for allowlist verification
   *   4+N metadata_uri (String) — 4-byte length-prefix + UTF-8 bytes
   *
   * @param data - The raw account data Buffer from getAccountInfo.
   * @returns    - A structured object with decoded field values.
   */
  private decodeCollectionAccount(data: Buffer): any {
    // DataView gives us typed reads with endian control.
    // Little-endian throughout — Solana/Anchor serializes everything LE.
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 8; // Skip the 8-byte discriminator. We know it's a Collection. We put it here.

    // ── Public keys (32 bytes each) ────────────────────────────────────────
    const authority       = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
    const mint            = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
    const mintAuthority   = new PublicKey(data.subarray(offset, offset + 32)); offset += 32; // Must read to advance offset.
    const creatorWallet   = new PublicKey(data.subarray(offset, offset + 32)); offset += 32; // Same.
    const platformWallet  = new PublicKey(data.subarray(offset, offset + 32)); offset += 32; // Same.

    // ── 64-bit integers (8 bytes each, little-endian) ─────────────────────
    const maxSupply       = view.getBigUint64(offset, true); offset += 8;
    const minted          = view.getBigUint64(offset, true); offset += 8;
    const price           = view.getBigUint64(offset, true); offset += 8;
    const startTime       = view.getBigInt64(offset, true);  offset += 8;
    const endTime         = view.getBigInt64(offset, true);  offset += 8;
    const freezeUntil     = view.getBigInt64(offset, true);  offset += 8;
    const createdAt       = view.getBigInt64(offset, true);  offset += 8; // Used below.

    // ── Smaller fields ─────────────────────────────────────────────────────
    const platformFeeBps      = view.getUint16(offset, true); offset += 2;
    const mintLimitPerWallet  = data[offset];                 offset += 1;
    const metadataStandard    = data[offset];                 offset += 1;
    const flags               = data[offset];                 offset += 1; // Bitfield. Future-proof.
    const status              = data[offset];                 offset += 1; // The u8 we actually care about.
    const featured            = data[offset] !== 0;           offset += 1; // bool: nonzero = true.
    const bump                = data[offset];                 offset += 1;

    // allowlist_root [u8; 32] — must advance past it to reach metadata_uri.
    // We don't use the allowlist root for sync, but the byte cursor must move.
    offset += 32;

    // metadata_uri (String): Borsh encoding — 4-byte LE length prefix + UTF-8 bytes.
    // The string we've been reading 192 bytes of binary data to reach. Worth it.
    const uriLen      = view.getUint32(offset, true); offset += 4;
    const metadataUri = data.subarray(offset, offset + uriLen).toString('utf-8');

    return {
      authority,
      mint,
      mintAuthority,
      creatorWallet,
      platformWallet,
      maxSupply,
      minted,
      price,
      startTime,
      endTime,
      freezeUntil,
      createdAt: { toNumber: () => Number(createdAt) }, // Wrapped to match Anchor's BN interface.
      platformFeeBps,
      mintLimitPerWallet,
      metadataStandard,
      flags,
      status,
      featured,
      bump,
      metadataUri, // The one we came here for. The journey's reward.
    };
  }

  /**
   * Generate a URL-safe slug from a collection name.
   *
   * Lowercase. Alphanumeric + hyphens. Max 50 chars.
   * Leading/trailing hyphens stripped. (Because /drops/-cool-monkeys- is embarrassing.)
   *
   * @param name - The collection name as a string.
   * @returns    - A URL-safe slug, max 50 characters.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Everything that isn't alphanumeric becomes a hyphen.
      .replace(/^-+|-+$/g, '')     // Trim leading/trailing hyphens. Dignity matters.
      .slice(0, 50);               // Hard cap at 50 chars. URLs should be navigable, not novels.
  }

  /**
   * Cron job: reconcile effectiveStatus for collections whose phase time windows
   * have crossed wall-clock time since the last write.
   *
   * Runs every 5 minutes. (CronExpression.EVERY_5_MINUTES — the heartbeat of this service.)
   *
   * Writes in collections.service.ts already update effectiveStatus inline, so this
   * cron only touches rows where the stored value no longer matches reality.
   * The gap between a phase starting and this cron running: up to 5 minutes.
   * In NFT mint terms, 5 minutes is several lifetimes. We've accepted this.
   *
   * Uses a CTE + IS DISTINCT FROM to skip already-correct rows, limiting each
   * statement to 500 rows to bound lock duration and dead-tuple accumulation.
   * Loops until no more rows need updating — because 500 might not be enough
   * on a very active day. (On a very active day, we'll be watching this closely.)
   *
   * The SQL is raw because TypeORM's query builder cannot express "UPDATE FROM CTE"
   * without making our eyes bleed. Raw SQL: the honest choice when the ORM gives up.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async recomputeEffectiveStatuses(): Promise<void> {
    try {
      let totalUpdated = 0;
      let batchUpdated: number;

      do {
        // Select up to 500 candidates and compute their target effectiveStatus.
        // Update only rows where the stored value differs (IS DISTINCT FROM).
        // This avoids dead-tuple churn on already-correct rows and keeps lock
        // windows short even when the active-collection count grows large.
        const result = await this.dataSource.query(`
          WITH computed AS (
            SELECT id,
              CASE
                WHEN NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(phases) p
                  WHERE (p->>'endDateTime') IS NULL
                     OR (p->>'endDateTime')::timestamptz > NOW()
                ) THEN 'completed'
                WHEN EXISTS (
                  SELECT 1 FROM jsonb_array_elements(phases) p
                  WHERE (p->>'startDateTime') IS NOT NULL
                    AND (p->>'startDateTime')::timestamptz <= NOW()
                ) THEN 'minting'
                ELSE status
              END AS new_status
            FROM "Collection"
            WHERE "deletedAt" IS NULL
              AND status NOT IN ('completed', 'paused', 'draft')
              AND phases IS NOT NULL
              AND jsonb_array_length(phases) > 0
            LIMIT 500
          )
          UPDATE "Collection" c
          SET "effectiveStatus" = comp.new_status
          FROM computed comp
          WHERE c.id = comp.id
            AND c."effectiveStatus" IS DISTINCT FROM comp.new_status
        `);

        // result[1] is the row count from the UPDATE statement.
        batchUpdated = result[1] ?? 0;
        totalUpdated += batchUpdated;
      } while (batchUpdated > 0); // Keep going until the DB agrees with the clock.

      if (totalUpdated > 0) {
        this.logger.log(`effectiveStatus reconciled for ${totalUpdated} collections`);
      } else {
        this.logger.debug('effectiveStatus: no phase-time transitions pending'); // The peaceful log.
      }
    } catch (error) {
      this.logger.error('effectiveStatus recomputation failed:', error);
    }
  }

  /**
   * Fetch a single collection's on-chain state for real-time verification.
   *
   * Useful for: confirming a deployment just went through, debugging status mismatches,
   * and reassuring yourself that the blockchain actually did the thing you paid gas for.
   * (It did. Usually. Almost always. Check the explorer if you're nervous.)
   *
   * Returns null if the account doesn't exist or decoding fails.
   * Null is safe. Null is handled. Null is not an exception disguised as a value.
   *
   * @param collectionAddress - The base58 public key string of the collection account.
   * @returns                 - Decoded collection data, or null if unavailable.
   */
  /**
   * Resolves a stored address to the on-chain collection account.
   * Accepts either the collection PDA (legacy deploy) or the mint seed pubkey.
   */
  private async resolveCollectionAddress(storedAddress: string): Promise<PublicKey | null> {
    const stored = new PublicKey(storedAddress);
    const directInfo = await this.connection.getAccountInfo(stored);
    if (directInfo?.owner.equals(this.programId)) {
      return stored;
    }

    const [derived] = PublicKey.findProgramAddressSync(
      [Buffer.from('collection'), stored.toBuffer()],
      this.programId,
    );
    const derivedInfo = await this.connection.getAccountInfo(derived);
    if (derivedInfo?.owner.equals(this.programId)) {
      return derived;
    }

    return null;
  }

  async getCollectionOnChain(
    collectionAddress: string,
  ): Promise<any | null> {
    try {
      const address = await this.resolveCollectionAddress(collectionAddress);
      if (!address) {
        return null;
      }

      const accountInfo = await this.connection.getAccountInfo(address);

      if (!accountInfo) {
        // Account not found. Return null. The caller can panic if they want.
        return null;
      }

      if (this.program) {
        // Anchor-typed decode: clean, structured, reliable.
        return this.program.account.collection.coder.accounts.decode(
          'collection',
          accountInfo.data,
        );
      } else {
        // Manual decode: raw bytes, DataView, the works.
        return this.decodeCollectionAccount(accountInfo.data);
      }
    } catch (error) {
      // Something went wrong. Log it, return null.
      // The caller asked a question. We could not answer it. Life goes on.
      this.logger.error(`Failed to get collection ${collectionAddress}:`, error);
      return null;
    }
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// This service is the midnight watchman. It wakes every 5 minutes, walks the
// blockchain perimeter, and updates the database with whatever reality it finds.
// It does not sleep. It does not complain. It just syncs.
//
// If collections are out of sync: check the RPC endpoint first.
// If the cron stopped running: check the ScheduleModule.
// If the manual decoder is wrong: update it to match the Rust struct in
// nexus-launchpad/src/lib.rs. Then rebuild the IDL so this file never has to
// do manual decoding again.
//
// The IDL is the civilized solution.
// The manual decoder is the "I'll fix it later" solution.
// Later is now. Go build the IDL.
// ══════════════════════════════════════════════════════════════════════════════
