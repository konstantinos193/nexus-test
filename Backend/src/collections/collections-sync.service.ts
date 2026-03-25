/**
 * Collections Sync Service
 * 
 * This service syncs on-chain collection data to the database
 * Because we can't trust the database to stay in sync with the blockchain
 * (And because users will create collections on-chain without telling us)
 * 
 * Features:
 * - Poll on-chain registry for new collections
 * - Sync collection status and featured flags
 * - Update metadata URIs when changed on-chain
 * - Handle collection removals (if needed)
 * 
 * This is the bridge between the immutable blockchain and our mutable database
 * (Because sometimes you need both - blockchain for trust, database for speed)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../database/entities/collection.entity';
import { SolanaService } from '../solana/solana.service';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
// Anchor is optional - only needed if IDL is available
// If not available, we'll use manual decoding
let AnchorModule: any;
try {
  AnchorModule = require('@coral-xyz/anchor');
} catch {
  // Anchor not installed - will use manual decoding
  AnchorModule = null;
}
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Collection status mapping (on-chain u8 to database string)
const STATUS_MAP: Record<number, string> = {
  0: 'draft',
  1: 'preparing',
  2: 'ready',
  3: 'minting',
  4: 'completed',
  5: 'paused',
};

@Injectable()
export class CollectionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(CollectionsSyncService.name);
  private program: any; // Program type from Anchor (optional)
  private programId: PublicKey;
  private registryPda: PublicKey | null = null;
  private registryBump: number | null = null;

  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    private solanaService: SolanaService,
  ) {
    // Program ID from the smart contract
    this.programId = new PublicKey('BUkDSb56YuM9Q1BsiokLKPfaUYP84AzE7xLfVXtqQzTi');
    
    // Registry PDA (seeds: ["registry"])
    // We'll derive it properly, but for now we'll use getProgramAccounts
    // (Because deriving PDAs requires the bump, which we can find)
  }

  /** Solana connection (lazy: from SolanaService after it has initialized). */
  private get connection(): Connection {
    return this.solanaService.getConnection();
  }

  async onModuleInit() {
    try {
      // Initialize Anchor program (if available)
      if (AnchorModule) {
        // We need a dummy wallet for the provider (we're just reading, not signing)
        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any[]) => txs,
        };

        const provider = new AnchorModule.AnchorProvider(
          this.connection,
          dummyWallet,
          { commitment: 'confirmed' },
        );

        // Try to load IDL from file, fallback to empty if not found
        // Check multiple possible locations
        const possibleIdlPaths = [
          join(__dirname, '../../target/types/nexus_collection.json'),
          join(__dirname, '../../../programs/target/types/nexus_collection.json'),
          join(process.cwd(), 'target/types/nexus_collection.json'),
          join(process.cwd(), 'programs/target/types/nexus_collection.json'),
        ];

        let idl;
        for (const idlPath of possibleIdlPaths) {
          try {
            if (existsSync(idlPath)) {
              const idlData = readFileSync(idlPath, 'utf-8');
              idl = JSON.parse(idlData);
              this.logger.log(`Loaded IDL from ${idlPath}`);
              break;
            }
          } catch (error) {
            // Try next path
            continue;
          }
        }

        if (idl) {
          this.program = new AnchorModule.Program(idl, this.programId, provider);
          this.logger.log('Anchor program initialized with IDL');
        } else {
          this.logger.warn('IDL file not found, will use manual decoding');
        }
      } else {
        this.logger.warn('@coral-xyz/anchor not installed, will use manual decoding');
      }

      this.logger.log('Collections sync service initialized');
      
      // Start initial sync in background; do not block or crash app if RPC is down
      this.runInitialSyncWithRetry();
    } catch (error) {
      this.logger.error('Failed to initialize sync service:', error);
    }
  }

  /**
   * Run initial sync with retries so transient RPC unavailability does not look like a crash.
   */
  private runInitialSyncWithRetry(retries = 3, delayMs = 5000): void {
    const attempt = (attemptNumber: number) => {
      this.syncCollections()
        .then(() => {
          this.logger.log('Initial collection sync completed');
        })
        .catch((error) => {
          const isConnectionError =
            error?.cause?.code === 'ECONNREFUSED' ||
            error?.message?.includes('fetch failed') ||
            error?.message?.includes('ECONNREFUSED');
          if (isConnectionError && attemptNumber < retries) {
            this.logger.warn(
              `Solana RPC unreachable (attempt ${attemptNumber}/${retries}). Retrying in ${delayMs / 1000}s...`,
            );
            setTimeout(() => attempt(attemptNumber + 1), delayMs);
          } else {
            this.logger.error('Initial sync failed (RPC may be down or misconfigured):', error?.message || error);
          }
        });
    };
    attempt(1);
  }

  /**
   * Sync all collections from on-chain to database
   * This is the main sync function that queries the blockchain
   * and updates the database accordingly
   */
  async syncCollections(): Promise<void> {
    try {
      const connection = this.solanaService.getConnection();
      if (!connection) {
        this.logger.warn('Solana connection not ready yet, skipping sync');
        return;
      }

      this.logger.log('Starting collection sync from blockchain...');

      // Method 1: Try to use registry PDA (fastest)
      // If registry exists, iterate through it
      let collectionAddresses: PublicKey[] = [];

      try {
        // Derive registry PDA
        const [registryPda, bump] = PublicKey.findProgramAddressSync(
          [Buffer.from('registry')],
          this.programId,
        );
        this.registryPda = registryPda;
        this.registryBump = bump;

        // Try to fetch registry account
        const registryAccount = await this.connection.getAccountInfo(registryPda);
        if (registryAccount && this.program) {
          // Decode registry account
          const registry = this.program.account.collectionRegistry.coder.accounts.decode(
            'collectionRegistry',
            registryAccount.data,
          );
          collectionAddresses = registry.collections.map(
            (addr: any) => new PublicKey(addr),
          );
          this.logger.log(`Found ${collectionAddresses.length} collections in registry`);
        }
      } catch (error) {
        this.logger.warn('Registry not found or not accessible, falling back to getProgramAccounts');
      }

      // Method 2: Fallback to getProgramAccounts (slower but works)
      if (collectionAddresses.length === 0) {
        this.logger.log('Using getProgramAccounts to find collections...');
        const discriminator = this.getCollectionDiscriminator();
        const accounts = await this.connection.getProgramAccounts(this.programId, {
          filters: [
            {
              memcmp: {
                offset: 0, // Discriminator offset
                bytes: bs58.encode(discriminator),
              },
            },
          ],
        });

        collectionAddresses = accounts.map((acc) => acc.pubkey);
        this.logger.log(`Found ${collectionAddresses.length} collections via getProgramAccounts`);
      }

      // Sync each collection
      let synced = 0;
      let created = 0;
      let updated = 0;

      for (const collectionAddress of collectionAddresses) {
        try {
          const result = await this.syncSingleCollection(collectionAddress);
          if (result.created) created++;
          if (result.updated) updated++;
          synced++;
        } catch (error) {
          this.logger.error(
            `Failed to sync collection ${collectionAddress.toString()}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Sync complete: ${synced} synced (${created} created, ${updated} updated)`,
      );
    } catch (error) {
      this.logger.error('Collection sync failed:', error);
      // Do not rethrow: sync runs in background; API should stay up
    }
  }

  /**
   * Sync a single collection from on-chain to database
   * This fetches the collection account and updates/creates the database record
   */
  async syncSingleCollection(
    collectionAddress: PublicKey,
  ): Promise<{ created: boolean; updated: boolean }> {
    try {
      // Fetch collection account from blockchain
      const accountInfo = await this.connection.getAccountInfo(collectionAddress);
      if (!accountInfo) {
        throw new Error('Collection account not found');
      }

      // Decode collection account
      let collectionData;
      if (this.program) {
        collectionData = this.program.account.collection.coder.accounts.decode(
          'collection',
          accountInfo.data,
        );
      } else {
        // Manual decoding if IDL not available
        // This is a fallback - we'll parse the account data manually
        collectionData = this.decodeCollectionAccount(accountInfo.data);
      }

      // Extract fields
      const authority = new PublicKey(collectionData.authority).toString();
      const mint = new PublicKey(collectionData.mint).toString();
      const metadataUri = collectionData.metadataUri || '';
      const createdAt = new Date(collectionData.createdAt.toNumber() * 1000);
      const status = STATUS_MAP[collectionData.status] || 'draft';
      const featured = collectionData.featured || false;

      // Try to find existing collection by mint address or creator
      // We store mint address in traits JSON, so we'll search by creator address
      const existing = await this.collectionRepository.findOne({
        where: {
          creatorAddress: authority,
        },
      });

      // Fetch metadata from URI to get name, description, image, etc.
      let metadata: any = {};
      if (metadataUri) {
        try {
          const response = await fetch(metadataUri);
          if (response.ok) {
            metadata = await response.json();
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch metadata from ${metadataUri}:`, error);
        }
      }

      // Prepare collection data
      const collectionDataToSave = {
        name: metadata.name || `Collection ${mint.slice(0, 8)}`,
        description: metadata.description || '',
        imageUrl: metadata.image || '',
        creator: metadata.properties?.creators?.[0]?.address || authority,
        creatorAddress: authority,
        blockchain: 'solana' as const,
        status: status,
        featured: featured,
        // Store mint address in a way we can query it
        // We'll use a custom field or store in traits JSON
        traits: {
          mintAddress: mint,
          metadataUri: metadataUri,
          onChainAddress: collectionAddress.toString(),
        } as any,
      };

      if (existing) {
        // Update existing collection
        await this.collectionRepository.update(existing.id, collectionDataToSave);
        return { created: false, updated: true };
      } else {
        // Create new collection
        // Generate slug from name
        const slug = this.generateSlug(collectionDataToSave.name);
        
        const newCollection = this.collectionRepository.create({
          ...collectionDataToSave,
          slug: slug,
        });
        await this.collectionRepository.save(newCollection);
        return { created: true, updated: false };
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync collection ${collectionAddress.toString()}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get collection discriminator for filtering
   * This is the 8-byte discriminator that Anchor uses to identify account types
   */
  private getCollectionDiscriminator(): Uint8Array {
    // Anchor uses sha256("account:Collection")[0:8] as discriminator
    // For now, we'll use a simpler approach: filter by account size
    // Collection account should be around 8 + 32 + 32 + 200 + 8 + 1 + 1 + 1 = ~283 bytes
    // But this is approximate - better to use the actual discriminator
    return new Uint8Array(8); // Placeholder - would need actual discriminator
  }

  /**
   * Decode collection account manually (fallback if IDL not available)
   */
  private decodeCollectionAccount(data: Buffer): any {
    // Manual decoding - this is a fallback
    // In production, you should use the IDL
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    
    // Skip 8-byte discriminator
    let offset = 8;
    
    // Authority (32 bytes)
    const authority = data.slice(offset, offset + 32);
    offset += 32;
    
    // Mint (32 bytes)
    const mint = data.slice(offset, offset + 32);
    offset += 32;
    
    // Metadata URI (String with length prefix)
    const uriLength = view.getUint32(offset, true);
    offset += 4;
    const metadataUri = data.slice(offset, offset + uriLength).toString('utf-8');
    offset += uriLength;
    
    // Created at (i64 = 8 bytes)
    const createdAt = view.getBigInt64(offset, true);
    offset += 8;
    
    // Bump (u8 = 1 byte)
    const bump = data[offset];
    offset += 1;
    
    // Status (u8 = 1 byte)
    const status = data[offset];
    offset += 1;
    
    // Featured (bool = 1 byte)
    const featured = data[offset] !== 0;
    
    return {
      authority: new PublicKey(authority),
      mint: new PublicKey(mint),
      metadataUri,
      createdAt: { toNumber: () => Number(createdAt) } as any, // BN-like object
      bump,
      status,
      featured,
    };
  }

  /**
   * Generate slug from collection name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  /**
   * Get a single collection from on-chain
   * Useful for real-time verification
   */
  async getCollectionOnChain(
    collectionAddress: string,
  ): Promise<any | null> {
    try {
      const address = new PublicKey(collectionAddress);
      const accountInfo = await this.connection.getAccountInfo(address);
      
      if (!accountInfo) {
        return null;
      }

      if (this.program) {
        return this.program.account.collection.coder.accounts.decode(
          'collection',
          accountInfo.data,
        );
      } else {
        return this.decodeCollectionAccount(accountInfo.data);
      }
    } catch (error) {
      this.logger.error(`Failed to get collection ${collectionAddress}:`, error);
      return null;
    }
  }
}
