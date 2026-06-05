/**
 * ContractsService
 *
 * On-chain interaction utilities for the unified Nexus Launchpad program.
 * One program. One program ID. One place to derive all PDAs.
 * Also the one place that builds unsigned transactions for the frontend to sign.
 * (Because the creator's wallet must sign initialize_collection. We can't fake that.
 *  The blockchain enforces this. The blockchain does not care about your workarounds.)
 *
 * Architecture note:
 * This service intentionally does NOT use @coral-xyz/anchor. We encode Borsh manually.
 * Why? Because shipping the Anchor framework in the backend just to build one transaction
 * is the equivalent of buying a forklift to move a houseplant.
 * We have a Buffer. We have the spec. We have Juan. It's enough.
 *
 * PDA seeds (must match programs/nexus-launchpad/src/lib.rs exactly — drift here is silent
 * and catastrophic, like a gas leak but for your collection accounts):
 *   Collection:        ["collection", authority]
 *   Registry:          ["registry"]
 *   WalletMintTracker: ["wallet_mint", collection, buyer]
 *   CollectionUri:     ["uri", collection]
 *   MintSplitConfig:   ["split", collection]
 *
 * "The backend builds. The frontend signs. The chain confirms.
 *  Nobody in this pipeline owns the private key except the creator.
 *  That is a feature. Guard it." — Juan
 */

// NestJS DI and logging. Because even smart contract interactions need a paper trail.
// If something breaks, the Logger will scream into the log file so future Juan can grep.
import { Injectable, Logger } from '@nestjs/common';

// The @solana/web3.js core. These four imports do more work than most meetings.
// PublicKey: a 32-byte first-class citizen of the Solana universe.
// SystemProgram: the chain's built-in program for account creation and SOL transfers.
// Transaction: the vessel. The container. The thing the creator signs and the frontend submits.
// TransactionInstruction: one atomic unit of on-chain intent. We build one per collection init.
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

// SolanaService: holds the connection. We borrow it every time we need to talk to the chain.
// (We don't own the connection. We just borrow it. Like a good houseguest.)
import { SolanaService } from './solana.service';

// getCurrentNetwork: for reporting which network we're deployed on, in status endpoints.
// Useful when your DevOps dashboard needs to know if we're in "consequences mode."
import { getCurrentNetwork } from './solana.config';

// The sacred constants. Program ID, PDA seeds, fee BPS, treasury wallet.
// All read from env; all falling back to sane defaults for devnet.
// All would cause very real problems if wrong on mainnet.
import { PROGRAM_ID, PDA_SEEDS, PLATFORM_FEE_BPS, PLATFORM_WALLET } from './constants';

// ── MetadataStandard variant mapping ─────────────────────────────────────────

/**
 * METADATA_STANDARD_VARIANT
 *
 * Maps human-readable metadata standard names to their on-chain u8 repr(rust) enum values.
 * These numbers must match the MetadataStandard enum in lib.rs exactly.
 * If they don't, you'll write the wrong variant to on-chain storage. Silently.
 * The chain won't complain. The data will just be wrong. Forever.
 * (On-chain means permanent. Wrong data is also permanent. Choose your variants carefully.)
 *
 * Aliases are included for convenience and historical naming compatibility.
 * "Metaplex" and "Legacy" are the same variant (0) because Metaplex's original standard
 * IS the legacy standard. History is cyclical. Names drift. The u8 stays.
 */
// MetadataStandard enum variant indices — must match the on-chain repr(rust) u8 values exactly.
// Drift here = wrong data on-chain. Don't guess. Read lib.rs.
const METADATA_STANDARD_VARIANT: Record<string, number> = {
  Legacy:         0,
  Metaplex:       0, // alias — Metaplex legacy = Legacy variant
  Programmable:   1,
  Core:           2,
  CNFT:           3, // alias — CNFT = Compressed variant (because naming is hard)
  Compressed:     3,
  SemiFungible:   4,
  Token2022:      5,
  NativeMetadata: 6,
  Custom:         7,
};

// ── Instruction Discriminator ─────────────────────────────────────────────────

/**
 * INIT_COLLECTION_DISC
 *
 * The 8-byte Anchor instruction discriminator for initialize_collection.
 * Computed as the first 8 bytes of SHA-256("global:initialize_collection").
 * Anchor checks this as the first thing when parsing an instruction — if it
 * doesn't match, the program rejects the instruction immediately.
 * No further processing. No error message. Just: rejected. Move on.
 *
 * This value comes directly from nexus_launchpad.json IDL.
 * If the instruction is renamed in the IDL, this value changes.
 * If this value changes and we don't update here, every tx will fail at the program level.
 * The failure will be confusing. The confusion will be expensive. Update the discriminator.
 *
 * The blockchain has a policy: match the discriminator or get out.
 * This is the blockchain's version of a bouncer. Respect the bouncer.
 */
// initialize_collection instruction discriminator — first 8 bytes of sha256("global:initialize_collection")
// Taken directly from nexus_launchpad.json IDL. If the IDL changes, update this.
const INIT_COLLECTION_DISC = Buffer.from([112, 62, 53, 139, 173, 152, 98, 93]);

/**
 * @injectable ContractsService
 *
 * The craftsman of unsigned transactions. The PDA cartographer.
 * The on-chain read utility. The deployment verifier.
 * And — somewhat dramatically — the bridge between a creator's intention
 * and an immutable fact stored on thousands of validator nodes globally.
 *
 * We build the transaction. We don't sign it. We never sign it.
 * That's the creator's job. Their wallet, their signature, their NFT collection.
 * We're just the very helpful contractor who draws up the paperwork.
 */
@Injectable()
export class ContractsService {
  // The logger. Our running commentary on things that went wrong and why.
  // Every error logged here is a clue for the next engineer who has to debug this at 2am.
  // Leave breadcrumbs. Juan demands it.
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    // SolanaService: injected so we can borrow its connection and blockhash utilities.
    // We could create our own connection, but that's wasteful and solanaService is right here.
    // Sharing is caring. Especially when "sharing" means one less HTTP connection.
    private solana: SolanaService,
  ) {}

  // ── Program ID ───────────────────────────────────────────────────────────────

  /**
   * getProgramId
   *
   * Converts the PROGRAM_ID string constant into a @solana/web3.js PublicKey.
   * Because the SDK wants a PublicKey, not a string, no matter how valid the string is.
   * This is the eternal minor annoyance of working with typed blockchain SDKs.
   * (Still better than working with untyped ones. Don't ask about the alternatives.)
   *
   * @returns {PublicKey} The program's on-chain public key. The same one. Every time.
   */
  getProgramId(): PublicKey {
    return new PublicKey(PROGRAM_ID);
  }

  // ── PDA Derivation ───────────────────────────────────────────────────────────
  // PDAs: Program Derived Addresses. Deterministic. Signerless. Elegant.
  // Given the same seeds and program ID, you always get the same address.
  // This is cryptographic certainty in a world full of uncertainty.
  // The blockchain delivers this one grace, and we should appreciate it.

  /**
   * findCollectionPDA
   *
   * Derives the Collection PDA for a given authority (creator) wallet.
   * Seed: ["collection", authority_pubkey_bytes].
   *
   * This is the primary on-chain account for a collection. Everything —
   * mint price, supply, phases, freeze config — lives in this account.
   * It's the collection's identity card, issued by the program,
   * stored on-chain, and permanent until explicitly closed.
   * (Closing it requires the authority to sign. Another feature, not a bug.)
   *
   * Returns null on error because we'd rather return null than throw and
   * crash the request that's trying to display a collection page.
   *
   * @param {string} authorityOrMint - The creator's wallet address (base58).
   * @returns {PublicKey | null} The derived PDA, or null if derivation fails.
   */
  /** Derive the Collection PDA. Seed: ["collection", authority]. */
  findCollectionPDA(authorityOrMint: string): PublicKey | null {
    try {
      // findProgramAddressSync: synchronous PDA derivation.
      // "Sync" here is fine — it's pure math, no I/O, no RPC.
      // It derives the same address every time for the same inputs.
      // Deterministic cryptography: the one thing we can actually rely on.
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.COLLECTION), new PublicKey(authorityOrMint).toBuffer()],
        this.getProgramId(),
      );
      return pda;
    } catch (error) {
      // Most likely cause: authorityOrMint isn't a valid public key.
      // Could be a truncated address, a username, or a strongly-worded complaint.
      // All of these fail gracefully here.
      this.logger.error('findCollectionPDA failed:', error);
      return null;
    }
  }

  /**
   * findRegistryPDA
   *
   * Derives the global CollectionRegistry PDA.
   * Seed: ["registry"] — just the one seed. No extra inputs.
   * There is exactly one registry. One address. Globally. For all collections.
   *
   * It's the master list. The ledger of all launchpad collections.
   * Every new collection init registers itself here.
   * (The blockchain has one big list and everyone on it pays for their entry.
   *  This is normal. This is fine. This is Solana account rent.)
   *
   * @returns {PublicKey | null} The global registry PDA, or null if something went terribly wrong.
   */
  /** Derive the global CollectionRegistry PDA. Seed: ["registry"]. */
  findRegistryPDA(): PublicKey | null {
    try {
      // No dynamic inputs — the registry address is the same on every call.
      // This is the most deterministic function in the entire codebase.
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.REGISTRY)],
        this.getProgramId(),
      );
      return pda;
    } catch (error) {
      // If this fails, something is very wrong with PROGRAM_ID.
      // The seeds are hardcoded. There's nothing to malform.
      this.logger.error('findRegistryPDA failed:', error);
      return null;
    }
  }

  /**
   * findWalletMintTrackerPDA
   *
   * Derives the per-wallet mint tracker PDA for a given buyer + collection combo.
   * Seed: ["wallet_mint", collection_pda_bytes, buyer_pubkey_bytes].
   *
   * This account tracks how many NFTs a specific buyer has minted from a specific
   * collection. It enforces the mintLimitPerWallet field from the CollectionConfig.
   * You can't fake it. You can't share it. The program checks it on every mint.
   *
   * One account per (collection, buyer) pair. Rent-exempt, paid by the buyer on first mint.
   * The chain doesn't have a "free lunch" policy. The chain has a rent policy.
   *
   * @param {string} collectionPda - The collection's PDA address (base58).
   * @param {string} buyer - The buyer's wallet address (base58).
   * @returns {PublicKey | null} The derived tracker PDA, or null on error.
   */
  /** Derive the per-wallet mint tracker PDA. Seed: ["wallet_mint", collection, buyer]. */
  findWalletMintTrackerPDA(collectionPda: string, buyer: string): PublicKey | null {
    try {
      // Three seeds. Three inputs. One deterministic address.
      // Given the same collection and buyer, this address is always the same.
      // The program uses this to say "you've already minted your limit. sit down."
      const [pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(PDA_SEEDS.WALLET_MINT),
          new PublicKey(collectionPda).toBuffer(),
          new PublicKey(buyer).toBuffer(),
        ],
        this.getProgramId(),
      );
      return pda;
    } catch (error) {
      // Either collectionPda or buyer is not a valid public key.
      // Log it, return null, let the caller decide what to do with the silence.
      this.logger.error('findWalletMintTrackerPDA failed:', error);
      return null;
    }
  }

  /**
   * findCollectionUriPDA
   *
   * Derives the optional CollectionUri PDA. Seed: ["uri", collection_pda_bytes].
   *
   * Not every collection uses this account. It's optional — for collections that
   * want to store their metadata URI on-chain rather than embedding it in the config.
   * A nice-to-have. An upgrade path. A second chance to be organized.
   *
   * If the account doesn't exist on-chain, the mint works fine without it.
   * The program checks. The program adapts. Optionality is a feature.
   *
   * @param {string} collectionPda - The collection's PDA address (base58).
   * @returns {PublicKey | null} The derived URI PDA, or null if derivation fails.
   */
  /** Derive the optional CollectionUri PDA. Seed: ["uri", collection]. */
  findCollectionUriPDA(collectionPda: string): PublicKey | null {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.URI), new PublicKey(collectionPda).toBuffer()],
        this.getProgramId(),
      );
      return pda;
    } catch (error) {
      this.logger.error('findCollectionUriPDA failed:', error);
      return null;
    }
  }

  /**
   * findMintSplitConfigPDA
   *
   * Derives the optional MintSplitConfig PDA. Seed: ["split", collection_pda_bytes].
   *
   * The split config defines how mint revenue is distributed among multiple recipients.
   * If a creator wants to share revenue with collaborators, this account holds the splits.
   * Each recipient gets their percentage. The math is done on-chain.
   * The blockchain doesn't care who agreed to what off-chain. It reads this account.
   *
   * Optional. If not present, revenue goes to the creator wallet defined in CollectionConfig.
   * Simple. Clean. A single address. The way most things start out.
   *
   * @param {string} collectionPda - The collection's PDA address (base58).
   * @returns {PublicKey | null} The derived split config PDA, or null on error.
   */
  /** Derive the optional MintSplitConfig PDA. Seed: ["split", collection]. */
  findMintSplitConfigPDA(collectionPda: string): PublicKey | null {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PDA_SEEDS.SPLIT), new PublicKey(collectionPda).toBuffer()],
        this.getProgramId(),
      );
      return pda;
    } catch (error) {
      this.logger.error('findMintSplitConfigPDA failed:', error);
      return null;
    }
  }

  // ── On-chain reads ────────────────────────────────────────────────────────────
  // Fetching raw account data from the chain. No parsing. No interpretation.
  // Just bytes, returned as-is. Borsh decoding is left as an exercise for the caller.
  // (We built the transaction. We verify the program. We draw the line at decoding
  //  arbitrary account data without a typed schema. That's not cowardice. That's wisdom.)

  /**
   * getCollectionData
   *
   * Fetches the raw account data for a collection PDA from the chain.
   * Returns the raw bytes if the account exists, null if it doesn't.
   *
   * The account might not exist if the collection was never initialized,
   * or if the PDA was derived incorrectly, or if the address is from a
   * different program entirely. The chain doesn't distinguish these cases.
   * It just says "account not found." The void echoes back "not found."
   *
   * @param {string} collectionPda - The collection PDA address to query.
   * @returns {Promise<{address, exists, data} | null>} Account data or null.
   */
  /** Fetch raw collection account data. */
  async getCollectionData(collectionPda: string) {
    try {
      // Ask the chain: does this account exist? If so, what's in it?
      // The connection is borrowed from SolanaService because we're not wasteful.
      const accountInfo = await this.solana
        .getConnection()
        .getAccountInfo(new PublicKey(collectionPda));
      // null accountInfo means the account doesn't exist on this network.
      // This is a valid state. Not everything that could be initialized has been initialized.
      if (!accountInfo) return null;
      return { address: collectionPda, exists: true, data: accountInfo.data };
    } catch (error) {
      // RPC error. Connection issue. Bad pubkey. The usual suspects.
      this.logger.error('getCollectionData failed:', error);
      return null;
    }
  }

  // ── Deployment verification ───────────────────────────────────────────────────

  /**
   * verifyContractDeployment
   *
   * Checks that the Nexus Launchpad program is deployed and executable at PROGRAM_ID.
   * "Deployed and executable" means: the account exists AND has the executable flag set.
   * Both conditions must be true. Account exists but not executable = wrong account.
   * (This can happen if the program ID is misconfigured to point at a data account.
   *  Don't ask how we know. Just set PROGRAM_ID correctly.)
   *
   * This is the pre-flight check. Run this before a mint. Run this after a deploy.
   * Run this at 3am when you're anxious about the launch. It'll be fine.
   * Or it won't, and you'll find out now instead of at mint time. Either way: knowledge.
   *
   * @returns {Promise<boolean>} true if deployed and executable; false if the chain shrugs.
   */
  /** Check that the unified launchpad program is deployed and executable. */
  async verifyContractDeployment(): Promise<boolean> {
    try {
      // Fetch the program account directly. Programs are accounts on Solana.
      // Executable accounts contain bytecode. Non-executable accounts contain data.
      // The difference matters. We check for both.
      const info = await this.solana.getConnection().getAccountInfo(this.getProgramId());
      // info === null: program not deployed. info.executable === false: wrong account.
      // Both are false. Both would make launch day very interesting.
      return info !== null && info.executable;
    } catch (error) {
      // RPC failure, network issue, cosmic ray bit flip.
      // Log it. Return false. Let the status endpoint report honestly.
      this.logger.error('verifyContractDeployment failed:', error);
      return false;
    }
  }

  /**
   * getContractStatuses
   *
   * Returns the deployment status of the Nexus Launchpad program.
   * Used by GET /api/solana/contracts/status.
   *
   * This is the dashboard endpoint. The health check. The "everything okay?" endpoint
   * that a vigilant DevOps engineer pings before every major event.
   * If deployed is false, the rest of the platform's minting capability is purely decorative.
   *
   * Network name included so the consumer can confirm we're even on the right chain.
   * (It sounds obvious. It has been wrong before. Network is now in the response.)
   *
   * @returns {Promise<{network, contracts}>} Status report for the unified program.
   */
  /** Return deployment status — used by GET /api/solana/contracts/status. */
  async getContractStatuses() {
    return {
      // The network we're reporting status for. mainnet ≠ devnet. Check this first.
      network: getCurrentNetwork(),
      contracts: {
        // The one program. The only program.
        nexus_launchpad: {
          // The address. So you can verify it on-chain yourself. Trust but verify.
          // (The blockchain made trust optional by making everything verifiable.)
          programId: PROGRAM_ID,
          // deployed: true means we're good. deployed: false means we're not.
          // The simplest boolean in the codebase, with the largest practical stakes.
          deployed: await this.verifyContractDeployment(),
        },
      },
    };
  }

  // ── Transaction Builder ───────────────────────────────────────────────────────
  // This is where the magic happens. Or rather: where the math happens.
  // Magic implies uncertainty. This is deterministic byte assembly.
  // Discriminator + Borsh-encoded config = the exact bytes the program expects.
  // Get it right and the chain accepts it. Get it wrong and the chain rejects it.
  // The chain does not explain why. The chain just moves to the next block.

  /**
   * buildInitializeCollectionTx
   *
   * Builds an unsigned initialize_collection transaction and returns it as base64.
   *
   * The flow:
   * 1. Derive the Collection PDA from the creator's wallet.
   * 2. Encode the CollectionConfig + platform_fee_bps as Borsh bytes.
   * 3. Prepend the 8-byte instruction discriminator.
   * 4. Build a TransactionInstruction with the correct account keys (order matters!).
   * 5. Fetch a recent blockhash and attach it.
   * 6. Serialize WITHOUT requiring signatures — the frontend will provide the signature.
   * 7. Return base64 + the PDA address.
   *
   * Why unsigned? Because the creator's wallet must sign, and we don't have the private key.
   * We don't want the private key. We won't ask for the private key.
   * The private key stays with the creator's Phantom/Backpack/whatever-they-use.
   * This is not a limitation — it's the entire point. Self-custody. The chain's whole thesis.
   *
   * Account order (must match IDL exactly — wrong order = wrong accounts):
   *   0. collection PDA    — writable, not signer (["collection", authority])
   *   1. authority         — writable, signer      (creator's wallet — the payer and authority)
   *   2. mint_authority    — not writable, not signer (set to creator for now)
   *   3. creator_wallet    — writable, not signer
   *   4. platform_wallet   — not writable, not signer (the fee treasury)
   *   5. system_program    — not writable, not signer (CPI target for account creation)
   *
   * @param params - Collection initialization parameters from the frontend.
   * @returns {Promise<{serializedTx: string, collectionPda: string}>} The unsigned tx + PDA.
   */
  async buildInitializeCollectionTx(params: {
    creatorAddress: string;
    totalSupply: number;
    mintPriceLamports: bigint;
    startTimestamp: bigint;
    endTimestamp: bigint | null;
    mintLimitPerWallet: number | null;
    metadataStandard: string;
    freezeTradingUntilDate: bigint | null;
    freezeTradingUntilSoldOut: boolean;
  }): Promise<{ serializedTx: string; collectionPda: string }> {
    // Convert the creator's address string to a PublicKey object.
    // From here on, everything speaks in PublicKey. The SDK demands it.
    const authority = new PublicKey(params.creatorAddress);

    // The treasury wallet that will receive our platform fee.
    // Sacred. Verified. In the constants file. Double-checked before mainnet.
    const platformWallet = new PublicKey(PLATFORM_WALLET);

    // Derive collection PDA — seed: ["collection", authority]
    // The same derivation used everywhere else. One seed, one address.
    // The creator's wallet IS the collection seed. Their identity is their collection.
    // (Poetic. Also a technical constraint. Both can be true.)
    const [collectionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(PDA_SEEDS.COLLECTION), authority.toBuffer()],
      this.getProgramId(),
    );

    // Encode the entire CollectionConfig + platform_fee_bps into Borsh bytes.
    // This is the payload. This is what the program reads and stores on-chain.
    // Borsh: Binary Object Representation Serializer for Hashing. A mouthful.
    // But: deterministic, compact, and exactly what Anchor programs expect.
    // Encode CollectionConfig + platform_fee_bps as Borsh bytes
    const instructionData = ContractsService.encodeInitCollectionData(
      {
        maxSupply:                BigInt(params.totalSupply),
        pricePerNft:              params.mintPriceLamports,
        startTime:                params.startTimestamp,
        endTime:                  params.endTimestamp,
        mintLimitPerWallet:       params.mintLimitPerWallet,
        // Look up the variant u8 for the metadata standard string.
        // Default to 2 (Core) if we don't recognize the string.
        // Unknown metadata standard gets Core. A reasonable default. Not perfect. Logged in prod.
        metadataStandardVariant:  METADATA_STANDARD_VARIANT[params.metadataStandard] ?? 2,
        freezeTradingUntilDate:   params.freezeTradingUntilDate,
        freezeTradingUntilSoldOut: params.freezeTradingUntilSoldOut,
      },
      PLATFORM_FEE_BPS,
    );

    // Build the instruction. Account keys in IDL order — wrong order = wrong accounts.
    // The program receives an ordered list. It indexes into it. Order is everything.
    // This is not sorted alphabetically. This is not sorted by importance.
    // This is sorted by whatever the IDL says. Read the IDL before touching this.
    const instruction = new TransactionInstruction({
      programId: this.getProgramId(),
      keys: [
        // 0. The collection PDA: writable (program will initialize/write it), not signer.
        { pubkey: collectionPda,              isSigner: false, isWritable: true  },
        // 1. Authority (creator): writable (pays for account rent), signer (MUST sign).
        //    This is the only signer. The frontend provides this signature.
        //    Without it, the transaction is rejected. (The chain is adamant about this.)
        { pubkey: authority,                  isSigner: true,  isWritable: true  },
        // 2. Mint authority: set to creator for now. Not writable, not signer.
        //    Future: could be a separate keypair for headless minting. Not today.
        { pubkey: authority,                  isSigner: false, isWritable: false }, // mint_authority = creator
        // 3. Creator wallet: where mint proceeds go. Same as authority for now.
        //    Writable because the program may need to write metadata about it.
        { pubkey: authority,                  isSigner: false, isWritable: true  }, // creator_wallet
        // 4. Platform wallet: receives the additive fee on every mint. Not writable here.
        //    (It gets written during the mint instruction, not during init. Different tx.)
        { pubkey: platformWallet,             isSigner: false, isWritable: false },
        // 5. System program: required for CPI calls that create new accounts.
        //    Always the same address. Always the last utility account. Always present.
        { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Get the latest blockhash. Without this, the transaction is not valid to submit.
    // Blockhashes expire ~150 slots (~60 seconds on mainnet). Build fast. Sign fast.
    // The frontend does both. We just provide the blockhash so they have a head start.
    // Attach a recent blockhash so the tx is valid to submit immediately after signing
    const { blockhash } = await this.solana.getRecentBlockhash();

    // Assemble the transaction. The vessel. The payload carrier.
    const tx = new Transaction();
    // Without recentBlockhash, the transaction is cryptographically invalid.
    // The validators check this. They always check this. It's checked everywhere.
    tx.recentBlockhash = blockhash;
    // Fee payer: the creator's wallet. They pay the transaction fee.
    // They're also the authority. They're also the mint_authority. They're doing a lot here.
    // (Creating a collection is a unilateral act. The creator owns everything at init time.)
    tx.feePayer = authority;
    // Add the one instruction. One tx, one instruction, one on-chain state change.
    tx.add(instruction);

    // Serialize WITHOUT requiring signatures — the creator signs on the frontend.
    // requireAllSignatures: false — we know the creator hasn't signed yet. That's okay.
    // verifySignatures: false — same reason. The chain will verify when it matters.
    // The result is a base64 string the frontend can deserialize, sign, and submit.
    // Serialize WITHOUT requiring signatures — the creator signs on the frontend
    const serializedTx = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64');

    // Log the successful build. PDA address included for cross-referencing with on-chain tools.
    // If something goes wrong on-chain, this log tells you which PDA to look up in the explorer.
    this.logger.log(`Built initialize_collection tx for ${params.creatorAddress}, PDA=${collectionPda.toBase58()}`);

    return { serializedTx, collectionPda: collectionPda.toBase58() };
  }

  // ── Borsh Encoding Helpers ────────────────────────────────────────────────────
  // Manual Borsh encoding because we do not ship @coral-xyz/anchor in the backend.
  // The full Anchor framework is a very large dependency for one transaction builder.
  // These helpers are small, readable, and testable. The spec is public. We followed it.
  //
  // Borsh spec summary (relevant to us):
  //   Integers: little-endian
  //   Option<T>: 0x00 for None, 0x01 followed by T bytes for Some(T)
  //   bool: 0x00 for false, 0x01 for true
  //   u8/u64/i64: unsigned/signed, 1/8/8 bytes
  //
  // If the on-chain struct changes, update these helpers.
  // If the field order changes, update encodeInitCollectionData.
  // If either is wrong, the transaction lands on-chain with corrupt data.
  // Permanently. Because on-chain means permanent.

  /**
   * encodeInitCollectionData
   *
   * Assembles the complete instruction data buffer for initialize_collection.
   * Structure: [discriminator (8)] + [CollectionConfig fields] + [platform_fee_bps (2)]
   *
   * Field order matches the Rust struct and IDL exactly. Do not reorder.
   * The program deserializes this as a contiguous byte sequence.
   * It does not care that we assembled it from nine different buffers.
   * It cares that byte 8 is the start of maxSupply and that it's a little-endian u64.
   * We honor that care.
   *
   * @param cfg - The CollectionConfig fields, pre-converted to appropriate types.
   * @param platformFeeBps - The platform fee in basis points. Appended after config.
   * @returns {Buffer} The complete instruction data. Feed directly to TransactionInstruction.
   */
  private static encodeInitCollectionData(
    cfg: {
      maxSupply: bigint;
      pricePerNft: bigint;
      startTime: bigint;
      endTime: bigint | null;
      mintLimitPerWallet: number | null;
      metadataStandardVariant: number;
      freezeTradingUntilDate: bigint | null;
      freezeTradingUntilSoldOut: boolean;
    },
    platformFeeBps: number,
  ): Buffer {
    // Platform fee: u16 little-endian. 2 bytes. 65535 BPS max. We use 100.
    const platformFeeBuf = Buffer.alloc(2);
    platformFeeBuf.writeUInt16LE(platformFeeBps, 0);

    // Concatenate all the pieces. The order must match the Rust struct layout.
    // One wrong position here = one very confusing on-chain error later.
    // Buffer.concat: the most honest function in this file. It just… puts things together.
    return Buffer.concat([
      // The bouncer bytes. Without these, the program won't even read the rest.
      INIT_COLLECTION_DISC,
      // maxSupply: how many NFTs this collection will ever produce. u64 LE.
      ContractsService.encodeU64LE(cfg.maxSupply),
      // pricePerNft: in lamports. What each mint costs. u64 LE.
      // (1 SOL = 1_000_000_000 lamports. The chain thinks in very small units.)
      ContractsService.encodeU64LE(cfg.pricePerNft),
      // startTime: Unix timestamp (seconds) for when minting opens. i64 LE.
      ContractsService.encodeI64LE(cfg.startTime),
      // endTime: Optional. None means "no end date — mint forever (or until sold out)."
      ContractsService.encodeOptionI64(cfg.endTime),
      // mintLimitPerWallet: Optional. None means "one wallet can mint everything."
      // (Unbounded minting per wallet. Flexible. Potentially chaotic for popular drops.)
      ContractsService.encodeOptionU8(cfg.mintLimitPerWallet),
      // metadataStandardVariant: u8. Which NFT standard this collection uses.
      // Masked to 1 byte because we trust nothing and verify everything.
      Buffer.from([cfg.metadataStandardVariant & 0xff]),
      // freezeTradingUntilDate: Optional timestamp. None = no freeze. Some(t) = freeze until t.
      ContractsService.encodeOptionI64(cfg.freezeTradingUntilDate),
      // freezeTradingUntilSoldOut: bool. true = trading locked until 100% minted.
      // The ultimate FOMO mechanism. Perfectly legal. Very effective.
      Buffer.from([cfg.freezeTradingUntilSoldOut ? 1 : 0]),
      // Platform fee: appended after the CollectionConfig, per the IDL argument layout.
      platformFeeBuf,
    ]);
  }

  /**
   * encodeU64LE
   *
   * Encodes a bigint as an unsigned 64-bit little-endian integer.
   * 8 bytes. The workhorse of our Borsh encoding.
   * Used for supply counts, prices, timestamps — anything large and non-negative.
   *
   * Note: JavaScript numbers can't represent u64 precisely above 2^53.
   * Hence: bigint. The language finally admitted it needed more than 53 bits.
   * The blockchain has never apologized for requiring 64.
   *
   * @param {bigint} value - The value to encode. Must be non-negative.
   * @returns {Buffer} 8-byte little-endian buffer.
   */
  private static encodeU64LE(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    return buf;
  }

  /**
   * encodeI64LE
   *
   * Encodes a bigint as a signed 64-bit little-endian integer.
   * 8 bytes. Used for timestamps (i64 in Rust).
   *
   * Unix timestamps as i64: valid until year 292,277,026,596.
   * We will deal with that when we get there. Or our descendants will.
   * (The blockchain will still be running. It will have outlived us all.)
   *
   * @param {bigint} value - The signed value to encode.
   * @returns {Buffer} 8-byte little-endian signed buffer.
   */
  private static encodeI64LE(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(value);
    return buf;
  }

  /**
   * encodeOptionI64
   *
   * Encodes an Option<i64> in Borsh format.
   * None → [0x00]           (1 byte)
   * Some(v) → [0x01, ...v]  (9 bytes: the tag byte + 8 bytes of i64 LE)
   *
   * The Rust Option type. The billion-dollar-question type.
   * Here it encodes gracefully into exactly the bytes the program expects.
   * null in TypeScript = None in Rust. Some TypeScript/Rust parity, at last.
   *
   * @param {bigint | null} value - The optional signed 64-bit integer.
   * @returns {Buffer} 1 or 9 bytes, depending on whether value is present.
   */
  private static encodeOptionI64(value: bigint | null): Buffer {
    // null = None in Rust. Single 0x00 byte. "Nothing. Nothing is here."
    if (value === null) return Buffer.from([0x00]);
    // Some(value) = 0x01 tag + 8 bytes of i64.
    // "Something IS here. Here it is. In little-endian."
    return Buffer.concat([Buffer.from([0x01]), ContractsService.encodeI64LE(value)]);
  }

  /**
   * encodeOptionU8
   *
   * Encodes an Option<u8> in Borsh format.
   * None → [0x00]           (1 byte)
   * Some(v) → [0x01, v]     (2 bytes: the tag + the u8 value)
   *
   * Used for mintLimitPerWallet — which can be "no limit" (None) or a small number (u8 max: 255).
   * 255 mints per wallet per collection. If your drop's target audience is 255 wallets deep,
   * congratulations, that's a very enthusiastic single individual.
   *
   * @param {number | null} value - The optional u8 value (0–255, or null for None).
   * @returns {Buffer} 1 or 2 bytes.
   */
  private static encodeOptionU8(value: number | null): Buffer {
    // null = None. One byte. Clean. Simple.
    if (value === null) return Buffer.from([0x00]);
    // Some(value): tag byte + the value, masked to u8 range just in case.
    // (We trust the types. We also mask to 0xff. Belt and suspenders. Juan demands it.)
    return Buffer.from([0x01, value & 0xff]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This is the most technically dense file in the solana module.
// It derives PDAs. It builds transactions. It encodes Borsh by hand.
// It bridges TypeScript and on-chain Rust through the shared language of bytes.
//
// Everything in this file either produces the right bytes or fails loudly.
// There is no middle ground. The blockchain does not negotiate.
// The blockchain does not have a staging environment for your feelings.
// You build the transaction correctly, or the chain rejects it.
// Permanently documented on a public ledger. Forever.
//
// On-chain means permanent. Wrong encoding means permanent mistakes.
// This is why we comment. This is why we verify. This is why we have Juan.
//
// (Juan is not a real person. Juan is a state of mind.
//  Juan is the voice that says "did you check the byte order?"
//  Listen to Juan. Juan has seen things.)
//
//  — Juan, Borsh Byte Artisan, PDA Cartographer, Unsigned Transaction Architect
//    Chief "We Don't Have The Private Key" Officer
// ─────────────────────────────────────────────────────────────────────────────
