/**
 * Transaction Size Validator Utility
 *
 * Solana transactions have a hard limit of ~1232 bytes (legacy) or ~1280 bytes (v0).
 * This utility helps ensure transactions fit within these limits by:
 *   1. Calculating the actual transaction size before sending
 *   2. Dynamically reducing metadata sizes if the transaction would be too large
 *
 * The blockchain has feelings about payload size. Strong feelings.
 * Those feelings manifest as "Transaction too large" errors at the worst possible moment.
 * Usually during a live mint. Usually in front of users.
 *
 * This file is the pre-flight check. The size negotiation. The "can we fit this?"
 * conversation that happens before the blockchain rudely answers "no" at full volume.
 *
 * @module utils/transaction-size-validator
 */

// @coral-xyz/anchor — the framework that wraps Solana's raw wire format in
// a TypeScript API that humans can use without weeping.
// Also where we get the PublicKey type, quietly.
import * as anchor from "@coral-xyz/anchor";

// Transaction from @solana/web3.js — the legacy transaction type.
// We import it for its presence, not its properties.
// (The size estimates are manual — we don't serialize to check size,
//  because that would require a complete transaction, which is what we're trying to build.)
import { Transaction } from "@solana/web3.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * Conservative transaction size limit: 1200 bytes.
 * Solana's official legacy limit is ~1232 bytes, but we leave 32 bytes of breathing room.
 * Because the blockchain is not your friend when you're 1 byte over the limit.
 * 1232 bytes. That's your budget. That's your entire creative canvas.
 * Michelangelo had the Sistine Chapel. You have 1232 bytes.
 */
const MAX_TRANSACTION_SIZE = 1200;

/**
 * Conservative limit for instruction data alone: 1000 bytes.
 * After accounting for account keys, signatures, and overhead,
 * your instruction data has to be lean. Very lean.
 * Think of it as packing for a carry-on flight where the airline is extremely strict.
 * The airline is Solana. It does not check bags.
 */
const MAX_INSTRUCTION_DATA_SIZE = 1000;

// ─── SIZE ESTIMATION ──────────────────────────────────────────────────────────

/**
 * Estimate the serialized size of a Solana transaction before it's fully built.
 * This is a best-effort estimate that accounts for the wire format overhead.
 *
 * Why estimate instead of serialize-and-measure? Because we need the estimate
 * BEFORE building the full transaction — so we can reduce the metadata BEFORE
 * discovering the transaction is too large AFTER the validator laughs at us.
 * Prevention > cure. Especially when the cure is a failed mint.
 *
 * Breakdown of what we're counting (the blockchain's invoice):
 *   - Transaction header:     3 bytes  (compact-u16 sizes + header fields)
 *   - Account key array len:  1-2 bytes
 *   - Account keys:           32 bytes each (Solana addresses are exactly 32 bytes, always)
 *   - Signature array len:    1-2 bytes
 *   - Signatures:             64 bytes each (ed25519 signatures, non-negotiable)
 *   - Instruction array len:  1 byte
 *   - Instruction structure:  program_id_index + account indices + data length + discriminator + data
 *
 * @param accounts - All account public keys involved in the transaction
 * @param instructionDataSize - Size of the instruction data payload in bytes
 * @param numSignatures - Number of required signers (default 1 — the buyer)
 * @returns Estimated total transaction size in bytes
 */
export function estimateTransactionSize(
  accounts: anchor.web3.PublicKey[],
  instructionDataSize: number,
  numSignatures: number = 1
): number {
  // ── Transaction header ────────────────────────────────────────────────────────
  // 3 bytes: version tag + num_required_signatures + num_readonly_signed + num_readonly_unsigned.
  // Fixed overhead. Can't escape it. Pay the toll.
  const headerSize = 3;

  // ── Account keys ──────────────────────────────────────────────────────────────
  // Every account the transaction touches: 32 bytes each. No exceptions.
  // This includes programs, PDAs, wallets, system program — every participant.
  const accountKeysSize = accounts.length * 32;

  // Compact-u16 encoding of the account count: 1 byte if ≤127 accounts, 2 bytes if more.
  // You probably have fewer than 127 accounts. (If you don't, this is a different problem.)
  const accountKeysLengthSize = accounts.length <= 127 ? 1 : 2;

  // ── Signatures ────────────────────────────────────────────────────────────────
  // 64 bytes per ed25519 signature. Fixed by the signature algorithm itself.
  // This is not negotiable with Solana. This is not negotiable with mathematics.
  const signaturesSize = numSignatures * 64;

  // Compact-u16 encoding of the signature count.
  const signaturesLengthSize = numSignatures <= 127 ? 1 : 2;

  // ── Instruction array ─────────────────────────────────────────────────────────
  // 1 byte for the count of instructions in this transaction.
  // We assume 1 instruction. (If you're batching multiple instructions,
  // this utility needs to know about that. Call us.)
  const instructionArrayLengthSize = 1;

  // ── Instruction structure ─────────────────────────────────────────────────────
  // program_id_index: 1 byte (index into account keys — which account IS the program)
  const programIdIndexSize = 1;

  // Account indices: 1 byte per account (compact indices into the account keys array).
  // Each account in the instruction is referenced by its index in the account keys table.
  const accountIndicesSize = accounts.length;

  // Compact-u16 encoding of the account indices count.
  const accountIndicesLengthSize = accounts.length <= 127 ? 1 : 2;

  // Data length: compact-u16 encoding of the instruction data size.
  // 1 byte if data ≤127 bytes, 2 bytes otherwise.
  const dataLengthSize = instructionDataSize <= 127 ? 1 : 2;

  // Anchor discriminator: 8 bytes. Always. This is Anchor's instruction selector.
  // The first 8 bytes of keccak256("global:<instructionName>"). Non-negotiable.
  // You don't choose the discriminator. The discriminator chooses you.
  const discriminatorSize = 8;

  // Total instruction size = all the above parts combined.
  const instructionSize =
    programIdIndexSize +
    accountIndicesLengthSize +
    accountIndicesSize +
    dataLengthSize +
    discriminatorSize +
    instructionDataSize;

  // ── Grand total ───────────────────────────────────────────────────────────────
  // Add it all up. This is how many bytes we'll put on the wire.
  // If this number exceeds MAX_TRANSACTION_SIZE, we need a smaller metadata payload.
  const totalSize =
    headerSize +
    signaturesLengthSize +
    signaturesSize +
    accountKeysLengthSize +
    accountKeysSize +
    instructionArrayLengthSize +
    instructionSize;

  return totalSize;
}

/**
 * Estimate the Borsh-encoded size of a CollectionMetadata struct.
 * Based on the Rust struct layout and Borsh's encoding rules.
 *
 * Borsh encoding is deterministic and compact — no padding, no alignment waste.
 * Every string gets a 4-byte length prefix. Every Option gets a 1-byte discriminant.
 * Every Vec gets a 4-byte length prefix. Every u8 is 1 byte.
 * Borsh does not pad. Borsh does not lie about sizes. Borsh is honest.
 *
 * This estimate lets us calculate "will this metadata fit in a transaction?"
 * before we actually try to encode it and watch the buffer scream.
 *
 * @param metadata - The metadata object to estimate (subset of CollectionMetadata)
 * @returns Estimated Borsh-encoded size in bytes
 */
export function estimateMetadataSize(metadata: {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  externalUrl?: string | null;
  attributes?: Array<any>;
  properties?: {
    files?: Array<any>;
    category?: string;
    creators?: Array<any>;
  };
}): number {
  let size = 0;

  // ── Discriminator ─────────────────────────────────────────────────────────────
  // 8 bytes: Anchor instruction discriminator. Always present. Always 8 bytes.
  // The price of using Anchor. Worth it. (Mostly worth it.)
  size += 8;

  // ── name ─────────────────────────────────────────────────────────────────────
  // Borsh String: 4-byte length prefix + UTF-8 bytes.
  // "Fake Test Collection" = 20 bytes of content + 4 bytes of length = 24 bytes.
  // Brevity is a virtue that also saves blockchain storage.
  size += 4 + Buffer.byteLength(metadata.name || "", "utf8");

  // ── symbol ───────────────────────────────────────────────────────────────────
  // Borsh String: 4-byte length prefix + UTF-8 bytes.
  // "FAKE" = 4 bytes of content. Fitting.
  size += 4 + Buffer.byteLength(metadata.symbol || "", "utf8");

  // ── description ──────────────────────────────────────────────────────────────
  // Borsh String: 4-byte length prefix + UTF-8 bytes.
  // This field is the most aggressively truncated when things get tight.
  // Nobody reads the on-chain description anyway. Cut it first. Cut it hard.
  size += 4 + Buffer.byteLength(metadata.description || "", "utf8");

  // ── sellerFeeBasisPoints ──────────────────────────────────────────────────────
  // u16: 2 bytes. Fixed. Represents "500" = 5% royalty. Concise. Immutable. Eternal.
  size += 2;

  // ── image ────────────────────────────────────────────────────────────────────
  // Borsh String: 4-byte length + UTF-8 bytes. IPFS URLs are typically ~100 chars.
  // "https://gateway.lighthouse.storage/ipfs/bafy.../42.png" — each character, accounted for.
  size += 4 + Buffer.byteLength(metadata.image || "", "utf8");

  // ── externalUrl (Option<String>) ──────────────────────────────────────────────
  // Option discriminant: 1 byte (0x00 = None, 0x01 = Some).
  // If Some: add 4-byte length prefix + UTF-8 bytes.
  size += 1;
  if (metadata.externalUrl) {
    size += 4 + Buffer.byteLength(metadata.externalUrl, "utf8");
  }

  // ── attributes (Vec<Attribute>) ───────────────────────────────────────────────
  // Vec length prefix: 4 bytes. Then per-attribute overhead.
  // Each attribute has: traitType (String), value (String), displayType (Option<String>), maxValue (Option<u64>).
  const attributes = metadata.attributes || [];
  size += 4; // Vec length prefix.
  for (const attr of attributes) {
    // traitType: Borsh String
    size += 4 + Buffer.byteLength(attr.traitType || attr.trait_type || "", "utf8");
    // value: Borsh String
    size += 4 + Buffer.byteLength(attr.value || "", "utf8");
    // displayType: Option<String> — 1 byte discriminant + optional string
    size += 1;
    if (attr.displayType) {
      size += 4 + Buffer.byteLength(attr.displayType, "utf8");
    }
    // maxValue: Option<u64> — 1 byte discriminant + 8 bytes if Some
    size += 1;
    if (attr.maxValue !== null && attr.maxValue !== undefined) {
      size += 8; // u64 = 8 bytes. The standard integer of the blockchain.
    }
  }

  // ── properties ───────────────────────────────────────────────────────────────
  const props = metadata.properties || {};

  // ── properties.files (Vec<FileProperty>) ─────────────────────────────────────
  // Vec length prefix: 4 bytes. Then per-file overhead.
  const files = props.files || [];
  size += 4; // Vec length prefix.
  for (const file of files) {
    // uri: Borsh String (IPFS URL or similar)
    size += 4 + Buffer.byteLength(file.uri || "", "utf8");
    // r#type: Borsh String ("image/png", "video/mp4", etc.)
    // Note: `r#type` is a Rust raw identifier (type is a keyword). We handle both "type" and "r#type".
    size += 4 + Buffer.byteLength(file.type || file["r#type"] || "", "utf8");
  }

  // ── properties.category ──────────────────────────────────────────────────────
  // Borsh String. Usually "image". Short. Efficient.
  size += 4 + Buffer.byteLength(props.category || "", "utf8");

  // ── properties.creators (Vec<Creator>) ───────────────────────────────────────
  // Vec length prefix: 4 bytes. Then per-creator overhead.
  const creators = props.creators || [];
  size += 4; // Vec length prefix.
  for (const creator of creators) {
    // address: Pubkey = 32 bytes in Borsh. NOT a string. A fixed-size 32-byte array.
    // The wallet address that gets the creator's share of royalties.
    // Doesn't matter if you pass a PublicKey object or a string — it's 32 bytes on-chain.
    if (creator.address && typeof creator.address === 'object' && 'toBuffer' in creator.address) {
      size += 32; // It's a PublicKey object. 32 bytes. Correct.
    } else {
      size += 32; // It's a string. Still 32 bytes when encoded as Pubkey. Also correct.
    }
    // share: u8 = 1 byte. The creator's percentage of royalties. 0–100.
    // (100 means this creator gets 100% of the royalty split.)
    size += 1;
  }

  return size;
}

// ─── METADATA REDUCTION ───────────────────────────────────────────────────────

/**
 * Reduce metadata content to fit within Solana transaction size limits.
 * Aggressively truncates strings and reduces array sizes through iterative
 * binary-search-style reduction until the estimated transaction size is acceptable.
 *
 * This is the "make it fit" function. The on-chain diet plan.
 * The string that says "I'm sorry, but your description needs to be shorter."
 * (The description is always the first thing truncated. It's always the description.)
 *
 * Strategy: start with conservative limits, estimate size, if too large,
 * reduce all limits proportionally, repeat up to 20 times.
 * If after 20 attempts we still can't fit, return the nuclear minimum:
 * just name, symbol, a stub description, and one creator. Bare survival metadata.
 *
 * @param metadata - The full metadata to try to fit
 * @param accounts - Account keys for the transaction (affect total size estimate)
 * @param targetSize - Maximum acceptable transaction size (default: MAX_TRANSACTION_SIZE)
 * @returns Metadata reduced to fit within targetSize, or nuclear minimum if all else fails
 */
export function reduceMetadataToFit(
  metadata: {
    name?: string;
    symbol?: string;
    description?: string;
    image?: string;
    externalUrl?: string | null;
    attributes?: Array<any>;
    properties?: {
      files?: Array<any>;
      category?: string;
      creators?: Array<any>;
    };
  },
  accounts: anchor.web3.PublicKey[],
  targetSize: number = MAX_TRANSACTION_SIZE
): typeof metadata {

  /**
   * Truncate a string to at most `maxBytes` UTF-8 bytes.
   * Character-aware — won't cut in the middle of a multi-byte Unicode character.
   * Because corrupted UTF-8 in blockchain metadata is an immortal artifact.
   * (The blockchain never forgets. Don't store broken UTF-8.)
   */
  const truncateString = (str: string, maxBytes: number): string => {
    const byteLength = Buffer.byteLength(str, "utf8");
    if (byteLength <= maxBytes) return str; // Already fits. No surgery needed.

    // Walk the string character by character, accumulating bytes.
    // Stop when the next character would exceed the byte limit.
    let truncated = "";
    for (const char of str) {
      const newByteLength = Buffer.byteLength(truncated + char, "utf8");
      if (newByteLength > maxBytes) break;
      truncated += char;
    }
    return truncated;
  };

  // ── Initial Size Limits ───────────────────────────────────────────────────────
  // Start with "aggressive but not brutal" limits.
  // Each iteration may reduce these further via proportional scaling.
  let nameMax = 50;              // 50 bytes for the name. Usually enough.
  let symbolMax = 10;            // 10 bytes for the symbol. It's a ticker, not a novel.
  let descriptionMax = 200;      // 200 bytes for description. Will be truncated first if needed.
  let imageMax = 100;            // 100 bytes for the image URL. IPFS URLs tend to be ~80-100 chars.
  let externalUrlMax = 100;      // 100 bytes for external URL. Similar to image URL.
  let attributeTraitTypeMax = 30; // Trait type names. "Background", "Eyes", etc. Short.
  let attributeValueMax = 50;     // Trait values. "Cosmic", "Holographic", etc. Short.
  let attributeDisplayTypeMax = 30; // Display type hints. Rarely used.
  let fileUriMax = 100;          // File URI. Should match image URL length.
  let fileTypeMax = 30;          // File MIME type. "image/png" = 9 bytes. Plenty of room.
  let categoryMax = 30;          // Category string. "image" = 5 bytes. Very comfortable.
  let creatorAddressMax = 44;    // Base58 address string. 44 chars for a Solana address.
  let maxAttributes = 5;         // Max number of attributes. Trim extras first.
  let maxFiles = 3;              // Max number of file entries. Usually just 1 anyway.
  let maxCreators = 5;           // Max number of creator entries. Trim extras if needed.

  // ── Iterative Reduction Loop ──────────────────────────────────────────────────
  // Up to 20 attempts. Each attempt scales all limits proportionally
  // based on how far over the target size we are.
  // Binary-ish search in metadata-size space. Approximately correct. Convergent.
  let attempts = 0;
  const maxAttempts = 20; // 20 attempts. If 20 doesn't work, we go nuclear.

  while (attempts < maxAttempts) {
    // Build the reduced metadata with current limits applied.
    const reduced: typeof metadata = {
      name: truncateString(metadata.name || "", nameMax),
      symbol: truncateString(metadata.symbol || "", symbolMax),
      description: truncateString(metadata.description || "", descriptionMax),
      image: truncateString(metadata.image || "", imageMax),

      // External URL: truncate if present, null if not.
      externalUrl: metadata.externalUrl
        ? truncateString(metadata.externalUrl, externalUrlMax)
        : null,

      // Attributes: slice to maxAttributes, truncate each field.
      attributes: (metadata.attributes || []).slice(0, maxAttributes).map((attr: any) => ({
        traitType: truncateString(attr.traitType || attr.trait_type || "", attributeTraitTypeMax),
        value: truncateString(attr.value || "", attributeValueMax),
        displayType: attr.displayType
          ? truncateString(attr.displayType, attributeDisplayTypeMax)
          : null,
        maxValue: attr.maxValue !== null && attr.maxValue !== undefined ? attr.maxValue : null,
      })),

      properties: {
        // Files: slice to maxFiles, truncate URI and type fields.
        files: (metadata.properties?.files || []).slice(0, maxFiles).map((f: any) => {
          const fileProp: any = {
            uri: truncateString(f.uri || "", fileUriMax),
          };
          // Handle the `r#type` raw identifier from Rust. Bracket notation required.
          // "r#type" is not a valid JS identifier. Rust named it this to avoid a keyword conflict.
          // We carry this naming quirk forward into JavaScript. Thanks, Rust.
          fileProp["r#type"] = truncateString(f.type || f["r#type"] || "", fileTypeMax);
          return fileProp;
        }),

        category: truncateString(metadata.properties?.category || "", categoryMax),

        // Creators: slice to maxCreators, preserve PublicKey objects.
        // In Rust, Creator.address is a Pubkey (32 bytes). We must pass a PublicKey object
        // or a valid base58 string — not a truncated string. Never truncate an address.
        creators: (metadata.properties?.creators || []).slice(0, maxCreators).map((c: any) => {
          let address: any;
          if (c.address && typeof c.address === 'object' && 'toBuffer' in c.address) {
            // Already a PublicKey object. Keep it. Do not touch it. It's perfect.
            address = c.address;
          } else {
            // String address: convert to PublicKey for Borsh encoding.
            // If conversion fails, keep as string and let Anchor complain later.
            // (Anchor's complaint will be more specific than ours. Politely defer.)
            const addressStr = String(c.address || "");
            try {
              address = new anchor.web3.PublicKey(addressStr);
            } catch {
              // Invalid base58 address. Keep as string. This will probably fail.
              // But at least it fails downstream with a clear error.
              address = addressStr;
            }
          }
          return {
            address: address,
            // share: clamp to valid u8 range (0–255). Floor the float if needed.
            // The blockchain expects a u8. We enforce this here before Borsh does it painfully.
            share: Math.min(255, Math.max(0, Number(c.share || 0) | 0)),
          };
        }),
      },
    };

    // Check if the reduced metadata fits within the target transaction size.
    const estimatedDataSize = estimateMetadataSize(reduced);
    const estimatedTxSize = estimateTransactionSize(accounts, estimatedDataSize);

    if (estimatedTxSize <= targetSize) {
      // It fits! Return the reduced metadata. The transaction will (probably) succeed.
      return reduced;
    }

    // Too large. Calculate how much we need to reduce by.
    // Proportional scaling: if we're 10% over, reduce all limits by 10%.
    // Not perfect, but convergent. After 20 attempts, we'll be close enough.
    const ratio = targetSize / estimatedTxSize;
    nameMax = Math.max(10, Math.floor(nameMax * ratio));               // Floor: 10 bytes for name.
    symbolMax = Math.max(3, Math.floor(symbolMax * ratio));             // Floor: 3 bytes for symbol. Barely a ticker.
    descriptionMax = Math.max(50, Math.floor(descriptionMax * ratio));  // Floor: 50 bytes. A sentence.
    imageMax = Math.max(50, Math.floor(imageMax * ratio));              // Floor: 50 bytes. Short URLs only.
    externalUrlMax = Math.max(50, Math.floor(externalUrlMax * ratio));  // Floor: 50 bytes.
    attributeTraitTypeMax = Math.max(10, Math.floor(attributeTraitTypeMax * ratio));
    attributeValueMax = Math.max(20, Math.floor(attributeValueMax * ratio));
    attributeDisplayTypeMax = Math.max(10, Math.floor(attributeDisplayTypeMax * ratio));
    fileUriMax = Math.max(50, Math.floor(fileUriMax * ratio));
    fileTypeMax = Math.max(10, Math.floor(fileTypeMax * ratio));
    categoryMax = Math.max(10, Math.floor(categoryMax * ratio));
    creatorAddressMax = Math.max(32, Math.floor(creatorAddressMax * ratio)); // Floor: 32 bytes. Pubkey is 32 bytes. Can't go lower.
    maxAttributes = Math.max(1, Math.floor(maxAttributes * ratio));     // Floor: 1 attribute minimum.
    maxFiles = Math.max(1, Math.floor(maxFiles * ratio));               // Floor: 1 file minimum.
    maxCreators = Math.max(1, Math.floor(maxCreators * ratio));         // Floor: 1 creator minimum.

    attempts++;
  }

  // ── Nuclear Option ────────────────────────────────────────────────────────────
  // After 20 attempts we still couldn't fit. Deploy the absolute minimum metadata.
  // This is the metadata equivalent of going to court in your pajamas:
  // technically valid, profoundly embarrassing, but it works.
  // The transaction will fit. The NFT will exist. The metadata will be sparse.
  return {
    name: truncateString(metadata.name || "Collection", 20),   // 20 bytes. A brief name.
    symbol: truncateString(metadata.symbol || "COL", 5),        // 5 bytes. A very brief symbol.
    description: truncateString(metadata.description || "", 50), // 50 bytes. A very brief description.
    image: truncateString(metadata.image || "", 50),             // 50 bytes. A very short URL.
    externalUrl: null,                                           // null. No external URL. We are stripped down.
    attributes: [],                                              // No attributes. The NFT has no traits. It just exists.
    properties: {
      files: [],                                                 // No file entries. The image URL is in .image. That's enough.
      category: "image",                                         // "image" = 5 bytes. Minimal. Correct.
      // Keep at most 1 creator. The most important one. Everyone else is cut.
      creators: (metadata.properties?.creators || []).slice(0, 1).map((c: any) => {
        let address: any;
        if (c.address && typeof c.address === 'object' && 'toBuffer' in c.address) {
          address = c.address; // PublicKey object. Preserve as-is.
        } else {
          const addressStr = String(c.address || "");
          try {
            address = new anchor.web3.PublicKey(addressStr);
          } catch {
            address = addressStr; // Last resort: keep as string.
          }
        }
        return {
          address: address,
          share: 100, // 100% to the surviving creator. Everyone else was cut.
        };
      }),
    },
  };
}

// ─── VALIDATION ───────────────────────────────────────────────────────────────

/**
 * Validate that a proposed transaction will fit within Solana's size limits.
 * Returns an object with a boolean `isValid` flag, the estimated size, and the max size.
 *
 * Use this before building the full transaction to catch size issues early.
 * "Early" = before the validator returns "Transaction too large" and ruins your day.
 *
 * @param accounts - Array of account public keys in the transaction
 * @param instructionDataSize - Estimated size of the instruction data payload
 * @param numSignatures - Number of required signers (default: 1)
 * @returns { isValid, estimatedSize, maxSize } — the pre-flight clearance report
 */
export function validateTransactionSize(
  accounts: anchor.web3.PublicKey[],
  instructionDataSize: number,
  numSignatures: number = 1
): { isValid: boolean; estimatedSize: number; maxSize: number } {
  // Estimate the total transaction size using our careful byte-counting formula.
  const estimatedSize = estimateTransactionSize(accounts, instructionDataSize, numSignatures);

  // Is it under the limit? Answer: yes (proceed with confidence) or no (time to trim).
  const isValid = estimatedSize <= MAX_TRANSACTION_SIZE;

  return {
    isValid,
    estimatedSize,
    maxSize: MAX_TRANSACTION_SIZE, // So the caller knows what "valid" means numerically.
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// 1232 bytes. That's what Solana gives you for a legacy transaction.
// After the header, signatures, account keys, instruction structure, and
// Anchor's 8-byte discriminator, you have maybe 900-1000 bytes for your data.
//
// Your NFT metadata. Your name, symbol, description, image URL, attributes,
// creators — all of it must fit in that budget. The blockchain has feelings
// about this. Strong, immutable, final feelings.
//
// This file exists to have the conversation before the blockchain does.
// We estimate. We reduce. We fit. We succeed.
// Alternatively: we fail after 20 attempts and return nuclear minimum metadata.
// Either way, the transaction goes through. The blockchain is satisfied.
// The NFT exists. The art is on IPFS. (The art is a colored rectangle. But still.)
//
// Future maintainers: if you add new fields to CollectionMetadata in Rust,
// update estimateMetadataSize() accordingly. Out-of-date estimates lead to
// transactions that pass our check but fail on-chain. That's the worst kind of fail.
// (The kind where we were confident and wrong simultaneously.)
//
// — Juan
//   "1232 bytes or go home. (You might go home.)"
//   nexus-launchpad, somewhere between the size estimate and the validator's verdict
// ─────────────────────────────────────────────────────────────────────────────
