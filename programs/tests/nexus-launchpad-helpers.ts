import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NexusLaunchpad } from "../target/types/nexus_launchpad";
import { buildAccountsFromIdl, getInstructionAccountNames } from "../utils/idl-sync";

// Patch Anchor's hardcoded 1000-byte instruction encoding buffer
// This fixes "encoding overruns Buffer" errors for large instruction data
import { patchAnchorBuffer } from "../utils/anchor-buffer-patch";

// Apply the patch before any tests run
patchAnchorBuffer();

// Configure the client
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.NexusLaunchpad as Program<NexusLaunchpad>;
export const authority = provider.wallet;
export { provider };

// Check if we're on localnet for performance optimizations
export const isLocalnet = provider.connection.rpcEndpoint.includes("localhost") || 
                   provider.connection.rpcEndpoint.includes("127.0.0.1") ||
                   provider.connection.rpcEndpoint.includes("8900") ||
                   provider.connection.rpcEndpoint.includes("8899");

// Optimized RPC options for localnet (skip preflight, use processed commitment)
export const rpcOptions = isLocalnet 
  ? { skipPreflight: true, commitment: "processed" as anchor.web3.Commitment }
  : {};

// Optimized airdrop function - on localnet, uses fire-and-forget approach to avoid timeouts
// On localnet, airdrops are usually instant, so we request and move on
// On devnet/mainnet, we properly confirm
export async function airdropAndConfirm(
  publicKey: anchor.web3.PublicKey,
  amount: number = 2 * anchor.web3.LAMPORTS_PER_SOL,
  maxRetries: number = 2
): Promise<void> {
  // First, check if account already has sufficient balance
  try {
    const currentBalance = await provider.connection.getBalance(publicKey, "processed");
    if (currentBalance >= amount) {
      return; // Already has enough funds, skip airdrop
    }
  } catch (err) {
    // If we can't check balance, proceed with airdrop anyway
  }
  
  // On localnet, use fire-and-forget approach to avoid validator slowdown issues
  if (isLocalnet) {
    try {
      // Request airdrop and wait just a moment
      await provider.connection.requestAirdrop(publicKey, amount);
      // Give it a very short time, then check balance once
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Quick balance check - if it increased, we're good
      try {
        const balance = await provider.connection.getBalance(publicKey, "processed");
        if (balance >= amount * 0.9) { // Allow 10% tolerance
          return; // Success
        }
      } catch {
        // Balance check failed, but on localnet airdrops usually work
        // Just proceed - if it failed, the next transaction will fail and we'll retry
        return;
      }
    } catch (error: any) {
      // On localnet, airdrop failures are rare - just retry once
      if (maxRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return airdropAndConfirm(publicKey, amount, maxRetries - 1);
      }
      throw error;
    }
    return;
  }
  
  // For devnet/mainnet, use proper confirmation
  let lastError: Error | null = null;
  const initialBalance = await provider.connection.getBalance(publicKey).catch(() => 0);
  const targetBalance = initialBalance + amount;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const signature = await provider.connection.requestAirdrop(publicKey, amount);
      await provider.connection.confirmTransaction(signature, "confirmed");
      
      // Verify balance increased
      const finalBalance = await provider.connection.getBalance(publicKey);
      if (finalBalance >= targetBalance - 0.01 * anchor.web3.LAMPORTS_PER_SOL) {
        return;
      }
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  
  if (lastError) {
    throw lastError;
  }
}

// Helper to wait after airdrop (only on non-localnet)
export async function waitAfterAirdrop(): Promise<void> {
  if (!isLocalnet) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  // On localnet, no wait needed - transactions are instant
}

// Global before hook to ensure provider wallet has sufficient funds
export async function ensureProviderFunds(): Promise<void> {
  const balance = await provider.connection.getBalance(provider.wallet.publicKey);
  const minBalance = 10 * anchor.web3.LAMPORTS_PER_SOL; // 10 SOL minimum
  
  if (balance < minBalance) {
    const airdropAmount = minBalance - balance + anchor.web3.LAMPORTS_PER_SOL; // Add 1 SOL buffer
    const signature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      airdropAmount
    );
    // On localnet, transactions are instant - no need to wait
    if (isLocalnet) {
      await provider.connection.confirmTransaction(signature, "processed");
    } else {
      await provider.connection.confirmTransaction(signature);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/** Build mint accounts object using IDL account names (keeps tests in sync with program). */
export function mintAccounts(params: {
  collection: anchor.web3.PublicKey;
  buyer: anchor.web3.PublicKey;
  creatorWallet: anchor.web3.PublicKey;
  platformWallet: anchor.web3.PublicKey;
  walletTracker: anchor.web3.PublicKey;
}) {
  const systemProgram = anchor.web3.SystemProgram.programId;
  const [splitConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("split"), params.collection.toBuffer()],
    program.programId
  );
  // Anchor resolveOptionals() only copies keys that EXIST in the IDL (it iterates idlIx.accounts
  // and does partialAccounts[acc.name]). Include both camelCase and snake_case so either IDL works.
  return {
    collection: params.collection,
    buyer: params.buyer,
    creatorWallet: params.creatorWallet,
    creator_wallet: params.creatorWallet,
    platformWallet: params.platformWallet,
    platform_wallet: params.platformWallet,
    walletTracker: params.walletTracker,
    wallet_tracker: params.walletTracker,
    splitConfig: splitConfigPda,
    split_config: splitConfigPda,
    systemProgram,
    system_program: systemProgram,
  };
}

/** Metadata standard for collection: supports all 8 standards. Default core. */
export function metadataStandard(s: "core" | "legacy" | "compressed" | "cnft" | "programmable" | "semifungible" | "token2022" | "nativemetadata" | "custom") {
  // Map "cnft" to "compressed" for backward compatibility
  if (s === "cnft") s = "compressed";
  
  // Return the appropriate enum variant
  switch (s) {
    case "legacy":
      return { legacy: {} };
    case "programmable":
      return { programmable: {} };
    case "core":
      return { core: {} };
    case "compressed":
      return { compressed: {} };
    case "semifungible":
      return { semiFungible: {} };
    case "token2022":
      return { token2022: {} };
    case "nativemetadata":
      return { nativeMetadata: {} };
    case "custom":
      return { custom: {} };
    default:
      return { core: {} }; // Default to core
  }
}

// Helper to check if a value is the sentinel for disabled (i64: -1, u8: 0)
export function isDisabledI64(value: anchor.BN): boolean {
  return value.toNumber() === -1;
}

export function isDisabledU8(value: number): boolean {
  return value === 0;
}

// Helper to check if allowlist is disabled ([0u8;32])
export function isAllowlistDisabled(root: number[]): boolean {
  return root.every(b => b === 0);
}

// Helper to check if collection is paused (bit 0 of flags)
export function isPaused(flags: number): boolean {
  return (flags & 1) !== 0;
}

// Helper to check if freeze until sold out is set (bit 1 of flags)
export function freezeUntilSoldOut(flags: number): boolean {
  return (flags & 2) !== 0;
}

// Helper to set collection start time to current time (or past) so minting can start immediately
// Uses updateConfig which doesn't validate start time, so we can set it to past/current
// NOTE: metadataStandard is preserved (immutable) - we don't change it
export async function setStartTimeToNow(collectionPda: anchor.web3.PublicKey, authority: anchor.web3.Keypair): Promise<void> {
  const collection = await program.account.collection.fetch(collectionPda);
  const now = Math.floor(Date.now() / 1000);
  
  // Convert metadataStandard number back to enum format (must match existing value - it's immutable)
  const metadataStandardEnum = (() => {
    const std = collection.metadataStandard;
    if (std === 0) return { legacy: {} };
    if (std === 1) return { programmable: {} };
    if (std === 2) return { core: {} };
    if (std === 3) return { compressed: {} };
    if (std === 4) return { semiFungible: {} };
    if (std === 5) return { token2022: {} };
    if (std === 6) return { nativeMetadata: {} };
    if (std === 7) return { custom: {} };
    return { core: {} }; // default
  })();
  
  const sig = await program.methods
    .updateConfig({
      maxSupply: new anchor.BN(collection.maxSupply.toNumber()),
      pricePerNft: new anchor.BN(collection.price.toNumber()),
      startTime: new anchor.BN(now - 1), // Set to 1 second ago so minting can start immediately
      endTime: collection.endTime.toNumber() === -1 ? null : new anchor.BN(collection.endTime.toNumber()),
      mintLimitPerWallet: collection.mintLimitPerWallet === 0 ? null : collection.mintLimitPerWallet,
      metadataStandard: metadataStandardEnum, // Must match existing - metadata standard is immutable
      freezeTradingUntilDate: collection.freezeUntil === -1 ? null : new anchor.BN(collection.freezeUntil),
      freezeTradingUntilSoldOut: (collection.flags & 2) !== 0,
    } as any)
    .accountsStrict({
      collection: collectionPda,
      authority: authority.publicKey,
    })
    .signers([authority])
    .rpc(rpcOptions);
  await provider.connection.confirmTransaction(sig, "confirmed");
  await program.account.collection.fetch(collectionPda);
}

// Helper to convert metadataStandard enum to u8
// New enum values: 0=Legacy, 1=Programmable, 2=Core, 3=Compressed, 4=SemiFungible, 5=Token2022, 6=NativeMetadata, 7=Custom
export function metadataStandardToU8(standard: any): number {
  if (standard.legacy) return 0;
  if (standard.programmable) return 1;
  if (standard.core) return 2;
  if (standard.compressed) return 3;
  if (standard.semifungible) return 4;
  if (standard.token2022) return 5;
  if (standard.nativemetadata) return 6;
  if (standard.custom) return 7;
  return 0; // default to legacy (most supported)
}

// Helper to get current metadata standard enum from collection (for preserving immutable metadata standard)
// Converts u8 metadata standard to enum format for use in updateConfig
export function getCurrentMetadataStandardEnum(metadataStandardU8: number): any {
  if (metadataStandardU8 === 0) return { legacy: {} };
  if (metadataStandardU8 === 1) return { programmable: {} };
  if (metadataStandardU8 === 2) return { core: {} };
  if (metadataStandardU8 === 3) return { compressed: {} };
  if (metadataStandardU8 === 4) return { semiFungible: {} };
  if (metadataStandardU8 === 5) return { token2022: {} };
  if (metadataStandardU8 === 6) return { nativeMetadata: {} };
  if (metadataStandardU8 === 7) return { custom: {} };
  return { core: {} }; // default
}

// Helper to create a new collection for each test
export async function createCollection(config: {
  maxSupply?: number;
  pricePerNft?: number;
  startTime?: number;
  endTime?: number | null;
  mintLimitPerWallet?: number | null;
  metadataStandard?: "legacy" | "programmable" | "core" | "compressed" | "semifungible" | "token2022" | "nativemetadata" | "custom";
  platformFeeBasisPoints?: number;
  freezeTradingUntilDate?: number | null;
  freezeTradingUntilSoldOut?: boolean;
  authority?: anchor.web3.Keypair; // Optional: if not provided, use provider wallet (or generate unique if conflict)
}) {
  // Validate maxSupply first - ensure it's a positive number
  const maxSupplyValue = config.maxSupply ?? 1000;
  if (maxSupplyValue <= 0 || !Number.isInteger(maxSupplyValue)) {
    throw new Error(`Invalid maxSupply: ${maxSupplyValue}. Must be a positive integer.`);
  }

  // Determine the authority to use
  // If a custom authority is provided, use it; otherwise generate a unique one for each test
  // This ensures we don't have conflicts with existing collections from previous test runs
  let finalAuthority: anchor.web3.Keypair;
  let needsFunding = false;
  
  if (config.authority) {
    // Use provided authority
    finalAuthority = config.authority;
    // Check if it needs funding
    try {
      const balance = await provider.connection.getBalance(config.authority.publicKey);
      needsFunding = balance < 1 * anchor.web3.LAMPORTS_PER_SOL;
    } catch {
      needsFunding = true;
    }
  } else {
    // Generate a unique authority for each test to avoid conflicts
    // This is safer than reusing the provider wallet which might have existing collections
    finalAuthority = anchor.web3.Keypair.generate();
    needsFunding = true;
  }
  
  // Find collection PDA for the authority
  let [finalCollectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection"), finalAuthority.publicKey.toBuffer()],
    program.programId
  );

  // Check if collection already exists - if so, generate a new unique authority
  // This handles the edge case where a generated keypair happens to conflict
  try {
    await program.account.collection.fetch(finalCollectionPda);
    // Collection exists - generate a new unique authority
    finalAuthority = anchor.web3.Keypair.generate();
    needsFunding = true;
    [finalCollectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("collection"), finalAuthority.publicKey.toBuffer()],
      program.programId
    );
  } catch {
    // Collection doesn't exist - proceed with current authority
  }
  
  // Fund the authority if needed
  if (needsFunding) {
    await airdropAndConfirm(finalAuthority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  }

  const creatorWallet = anchor.web3.Keypair.generate();
  const mintAuthority = anchor.web3.Keypair.generate();
  const platformWallet = anchor.web3.Keypair.generate();

  const now = Math.floor(Date.now() / 1000);
  // Set startTime to at least 60 seconds in the future to account for transaction processing delays
  const startTime = config.startTime ?? (now + 60);
  // Pass raw values for Options (BN | number | null). No { some: ... } — OptionLayout expects raw.
  const endTime =
    config.endTime === undefined
      ? new anchor.BN(now + 86400)
      : config.endTime === null
        ? null
        : new anchor.BN(config.endTime);
  const mintLimitPerWallet =
    config.mintLimitPerWallet === undefined ? 5 : config.mintLimitPerWallet === null ? null : config.mintLimitPerWallet;
  const freezeTradingUntilDate =
    config.freezeTradingUntilDate === undefined || config.freezeTradingUntilDate === null
      ? null
      : new anchor.BN(config.freezeTradingUntilDate);

  // Final check: ensure collection doesn't exist before initializing
  // This prevents "account already exists" errors and ensures clean initialization
  try {
    await program.account.collection.fetch(finalCollectionPda);
    // If we get here, collection exists - this should not happen but handle it
    throw new Error(`Collection already exists at ${finalCollectionPda.toString()}. This should not happen.`);
  } catch (err: any) {
    // If error is "Account does not exist" or similar, that's expected - proceed
    // If it's our custom error, re-throw it
    if (err.message && err.message.includes("Collection already exists")) {
      throw err;
    }
    // Otherwise, account doesn't exist - proceed with initialization
  }

  // Ensure maxSupplyValue is valid before creating BN
  if (!maxSupplyValue || maxSupplyValue <= 0) {
    throw new Error(`Invalid maxSupply: ${maxSupplyValue}. Must be a positive integer.`);
  }

  const maxSupplyBN = new anchor.BN(maxSupplyValue);
  
  // Verify BN was created correctly
  if (maxSupplyBN.isZero() || maxSupplyBN.isNeg()) {
    throw new Error(`Failed to create valid BN for maxSupply: ${maxSupplyValue} -> ${maxSupplyBN.toString()}`);
  }

  const sig = await program.methods
    .initializeCollection(
      {
        maxSupply: maxSupplyBN,
        pricePerNft: new anchor.BN(config.pricePerNft ?? anchor.web3.LAMPORTS_PER_SOL * 0.1),
        startTime: new anchor.BN(startTime),
        endTime,
        mintLimitPerWallet,
        metadataStandard: metadataStandard(config.metadataStandard ?? "core"),
        freezeTradingUntilDate,
        freezeTradingUntilSoldOut: config.freezeTradingUntilSoldOut ?? false,
      } as any,
      config.platformFeeBasisPoints ?? 500
    )
    .accountsStrict({
      collection: finalCollectionPda,
      authority: finalAuthority.publicKey,
      mintAuthority: mintAuthority.publicKey,
      creatorWallet: creatorWallet.publicKey,
      platformWallet: platformWallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([finalAuthority])
    .rpc(rpcOptions);

  // FORCE FINALIZATION: With skipPreflight + processed, .rpc() returns before account is readable.
  // Next instruction (e.g. mint with init_if_needed PDA seeds = [collection.key(), ...]) then
  // fails: PDA resolver can't read collection → resolver clears ctx.accounts → "collection not provided".
  await provider.connection.confirmTransaction(sig, "confirmed");
  await program.account.collection.fetch(finalCollectionPda);

  return { collectionPda: finalCollectionPda, creatorWallet, mintAuthority, platformWallet, authority: finalAuthority };
}
