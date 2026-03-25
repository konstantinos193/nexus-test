/**
 * Transaction Size Validator Utility
 * 
 * Solana transactions have a hard limit of ~1232 bytes (legacy) or ~1280 bytes (v0).
 * This utility helps ensure transactions fit within these limits by:
 * 1. Calculating the actual transaction size before sending
 * 2. Dynamically reducing metadata sizes if the transaction would be too large
 * 
 * Because apparently some people think they can send infinite data on-chain.
 * News flash: Solana has limits, and we're hitting them hard.
 * 
 * @module utils/transaction-size-validator
 */

import * as anchor from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";

/**
 * Solana transaction size limits
 * - Legacy transactions: ~1232 bytes
 * - Versioned transactions (v0): ~1280 bytes
 * We use a conservative limit to account for overhead
 */
const MAX_TRANSACTION_SIZE = 1200; // Conservative limit (leaves room for overhead)
const MAX_INSTRUCTION_DATA_SIZE = 1000; // Conservative limit for instruction data alone

/**
 * Calculate the size of a transaction before it's fully built.
 * This is a best-effort estimate that accounts for:
 * - Account keys (32 bytes each)
 * - Signatures (64 bytes each)
 * - Transaction header overhead (~3 bytes)
 * - Instruction discriminator (8 bytes)
 * - Instruction data (variable)
 * 
 * @param accounts - Array of account public keys
 * @param instructionDataSize - Size of instruction data in bytes
 * @param numSignatures - Number of signatures (default: 1)
 * @returns Estimated transaction size in bytes
 */
export function estimateTransactionSize(
  accounts: anchor.web3.PublicKey[],
  instructionDataSize: number,
  numSignatures: number = 1
): number {
  // Transaction header: 3 bytes (version + num required signatures + num readonly signed + num readonly unsigned)
  const headerSize = 3;
  
  // Account keys: 32 bytes each
  const accountKeysSize = accounts.length * 32;
  
  // Account key array length: 1 byte (compact u16)
  const accountKeysLengthSize = accounts.length <= 127 ? 1 : 2;
  
  // Signatures: 64 bytes each
  const signaturesSize = numSignatures * 64;
  
  // Signature array length: 1 byte (compact u16)
  const signaturesLengthSize = numSignatures <= 127 ? 1 : 2;
  
  // Instruction array length: 1 byte (compact u16, assuming 1 instruction)
  const instructionArrayLengthSize = 1;
  
  // Instruction structure:
  // - program_id_index: 1 byte
  // - account_indices: accounts.length bytes
  // - account_indices_length: 1 byte (compact u16)
  // - data_length: 1-2 bytes (compact u16)
  // - discriminator: 8 bytes
  // - instruction data: instructionDataSize bytes
  const programIdIndexSize = 1;
  const accountIndicesSize = accounts.length;
  const accountIndicesLengthSize = accounts.length <= 127 ? 1 : 2;
  const dataLengthSize = instructionDataSize <= 127 ? 1 : 2;
  const discriminatorSize = 8;
  
  const instructionSize =
    programIdIndexSize +
    accountIndicesLengthSize +
    accountIndicesSize +
    dataLengthSize +
    discriminatorSize +
    instructionDataSize;
  
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
 * Estimate the size of Borsh-encoded instruction data.
 * This is a rough estimate based on the structure of CollectionMetadata.
 * 
 * Borsh encoding adds:
 * - 4 bytes for each String length prefix
 * - 1 byte for Option discriminant (Some/None)
 * - 4 bytes for Vec length prefix
 * - 2 bytes for u16
 * - 1 byte for u8
 * 
 * @param metadata - The metadata object to estimate
 * @returns Estimated size in bytes
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
  
  // Discriminator: 8 bytes (always present)
  size += 8;
  
  // name: 4 (length) + string bytes
  size += 4 + Buffer.byteLength(metadata.name || "", "utf8");
  
  // symbol: 4 (length) + string bytes
  size += 4 + Buffer.byteLength(metadata.symbol || "", "utf8");
  
  // description: 4 (length) + string bytes
  size += 4 + Buffer.byteLength(metadata.description || "", "utf8");
  
  // sellerFeeBasisPoints: 2 bytes (u16)
  size += 2;
  
  // image: 4 (length) + string bytes
  size += 4 + Buffer.byteLength(metadata.image || "", "utf8");
  
  // externalUrl: 1 (Option discriminant) + (if Some: 4 + string bytes)
  size += 1;
  if (metadata.externalUrl) {
    size += 4 + Buffer.byteLength(metadata.externalUrl, "utf8");
  }
  
  // attributes: 4 (Vec length) + per-attribute overhead
  const attributes = metadata.attributes || [];
  size += 4;
  for (const attr of attributes) {
    // traitType: 4 + string bytes
    size += 4 + Buffer.byteLength(attr.traitType || attr.trait_type || "", "utf8");
    // value: 4 + string bytes
    size += 4 + Buffer.byteLength(attr.value || "", "utf8");
    // displayType: 1 (Option) + (if Some: 4 + string bytes)
    size += 1;
    if (attr.displayType) {
      size += 4 + Buffer.byteLength(attr.displayType, "utf8");
    }
    // maxValue: 1 (Option) + (if Some: 8 bytes for u64)
    size += 1;
    if (attr.maxValue !== null && attr.maxValue !== undefined) {
      size += 8;
    }
  }
  
  // properties
  const props = metadata.properties || {};
  
  // files: 4 (Vec length) + per-file overhead
  const files = props.files || [];
  size += 4;
  for (const file of files) {
    // uri: 4 + string bytes
    size += 4 + Buffer.byteLength(file.uri || "", "utf8");
    // type (r#type in Rust): 4 + string bytes
    size += 4 + Buffer.byteLength(file.type || file["r#type"] || "", "utf8");
  }
  
  // category: 4 + string bytes
  size += 4 + Buffer.byteLength(props.category || "", "utf8");
  
  // creators: 4 (Vec length) + per-creator overhead
  const creators = props.creators || [];
  size += 4;
  for (const creator of creators) {
    // address: Pubkey is 32 bytes in Borsh encoding (not a string!)
    // Handle both PublicKey objects and strings for flexibility
    if (creator.address && typeof creator.address === 'object' && 'toBuffer' in creator.address) {
      // It's a PublicKey object - Pubkey is 32 bytes in Borsh
      size += 32;
    } else {
      // It's a string - but in Rust it's stored as Pubkey (32 bytes), so use 32
      // We still need to validate the string can be converted to Pubkey
      size += 32;
    }
    // share: 1 byte (u8)
    size += 1;
  }
  
  return size;
}

/**
 * Reduce metadata sizes to fit within transaction limits.
 * This function aggressively truncates strings and reduces array sizes
 * until the estimated transaction size fits within limits.
 * 
 * @param metadata - The metadata to reduce
 * @param accounts - Array of account public keys
 * @param targetSize - Target maximum transaction size (default: MAX_TRANSACTION_SIZE)
 * @returns Reduced metadata that should fit within transaction limits
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
  // Helper to truncate string by bytes (not characters)
  const truncateString = (str: string, maxBytes: number): string => {
    const byteLength = Buffer.byteLength(str, "utf8");
    if (byteLength <= maxBytes) return str;
    
    let truncated = "";
    for (const char of str) {
      const newByteLength = Buffer.byteLength(truncated + char, "utf8");
      if (newByteLength > maxBytes) break;
      truncated += char;
    }
    return truncated;
  };
  
  // Start with aggressive limits and work our way down
  let nameMax = 50;
  let symbolMax = 10;
  let descriptionMax = 200;
  let imageMax = 100;
  let externalUrlMax = 100;
  let attributeTraitTypeMax = 30;
  let attributeValueMax = 50;
  let attributeDisplayTypeMax = 30;
  let fileUriMax = 100;
  let fileTypeMax = 30;
  let categoryMax = 30;
  let creatorAddressMax = 44;
  let maxAttributes = 5;
  let maxFiles = 3;
  let maxCreators = 5;
  
  // Binary search for the right size
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    const reduced: typeof metadata = {
      name: truncateString(metadata.name || "", nameMax),
      symbol: truncateString(metadata.symbol || "", symbolMax),
      description: truncateString(metadata.description || "", descriptionMax),
      image: truncateString(metadata.image || "", imageMax),
      externalUrl: metadata.externalUrl
        ? truncateString(metadata.externalUrl, externalUrlMax)
        : null,
      attributes: (metadata.attributes || []).slice(0, maxAttributes).map((attr: any) => ({
        traitType: truncateString(attr.traitType || attr.trait_type || "", attributeTraitTypeMax),
        value: truncateString(attr.value || "", attributeValueMax),
        displayType: attr.displayType
          ? truncateString(attr.displayType, attributeDisplayTypeMax)
          : null,
        maxValue: attr.maxValue !== null && attr.maxValue !== undefined ? attr.maxValue : null,
      })),
      properties: {
        files: (metadata.properties?.files || []).slice(0, maxFiles).map((f: any) => {
          const fileProp: any = {
            uri: truncateString(f.uri || "", fileUriMax),
          };
          // Handle r#type field - use bracket notation since it's not a valid JS identifier
          fileProp["r#type"] = truncateString(f.type || f["r#type"] || "", fileTypeMax);
          return fileProp;
        }),
        category: truncateString(metadata.properties?.category || "", categoryMax),
        creators: (metadata.properties?.creators || []).slice(0, maxCreators).map((c: any) => {
          // Preserve PublicKey objects - don't convert to string
          // In Rust, Creator.address is Pubkey (32 bytes), not String
          let address: any;
          if (c.address && typeof c.address === 'object' && 'toBuffer' in c.address) {
            // It's already a PublicKey object - keep it as is
            address = c.address;
          } else {
            // It's a string - convert to PublicKey if possible, otherwise keep as string
            // (Anchor will handle the conversion)
            const addressStr = String(c.address || "");
            try {
              address = new anchor.web3.PublicKey(addressStr);
            } catch {
              // If conversion fails, keep as string (will fail later, but at least we tried)
              address = addressStr;
            }
          }
          return {
            address: address,
            share: Math.min(255, Math.max(0, Number(c.share || 0) | 0)),
          };
        }),
      },
    };
    
    const estimatedDataSize = estimateMetadataSize(reduced);
    const estimatedTxSize = estimateTransactionSize(accounts, estimatedDataSize);
    
    if (estimatedTxSize <= targetSize) {
      return reduced;
    }
    
    // Reduce sizes proportionally
    const ratio = targetSize / estimatedTxSize;
    nameMax = Math.max(10, Math.floor(nameMax * ratio));
    symbolMax = Math.max(3, Math.floor(symbolMax * ratio));
    descriptionMax = Math.max(50, Math.floor(descriptionMax * ratio));
    imageMax = Math.max(50, Math.floor(imageMax * ratio));
    externalUrlMax = Math.max(50, Math.floor(externalUrlMax * ratio));
    attributeTraitTypeMax = Math.max(10, Math.floor(attributeTraitTypeMax * ratio));
    attributeValueMax = Math.max(20, Math.floor(attributeValueMax * ratio));
    attributeDisplayTypeMax = Math.max(10, Math.floor(attributeDisplayTypeMax * ratio));
    fileUriMax = Math.max(50, Math.floor(fileUriMax * ratio));
    fileTypeMax = Math.max(10, Math.floor(fileTypeMax * ratio));
    categoryMax = Math.max(10, Math.floor(categoryMax * ratio));
    creatorAddressMax = Math.max(32, Math.floor(creatorAddressMax * ratio));
    maxAttributes = Math.max(1, Math.floor(maxAttributes * ratio));
    maxFiles = Math.max(1, Math.floor(maxFiles * ratio));
    maxCreators = Math.max(1, Math.floor(maxCreators * ratio));
    
    attempts++;
  }
  
  // If we still can't fit it, return the most reduced version
  // This is the nuclear option - minimal metadata that should always fit
  return {
    name: truncateString(metadata.name || "Collection", 20),
    symbol: truncateString(metadata.symbol || "COL", 5),
    description: truncateString(metadata.description || "", 50),
    image: truncateString(metadata.image || "", 50),
    externalUrl: null,
    attributes: [],
    properties: {
      files: [],
      category: "image",
      creators: (metadata.properties?.creators || []).slice(0, 1).map((c: any) => {
        // Preserve PublicKey objects - don't convert to string
        let address: any;
        if (c.address && typeof c.address === 'object' && 'toBuffer' in c.address) {
          address = c.address;
        } else {
          const addressStr = String(c.address || "");
          try {
            address = new anchor.web3.PublicKey(addressStr);
          } catch {
            address = addressStr;
          }
        }
        return {
          address: address,
          share: 100,
        };
      }),
    },
  };
}

/**
 * Validate that a transaction will fit within Solana's size limits.
 * 
 * @param accounts - Array of account public keys
 * @param instructionDataSize - Size of instruction data in bytes
 * @param numSignatures - Number of signatures (default: 1)
 * @returns Object with isValid flag and estimated size
 */
export function validateTransactionSize(
  accounts: anchor.web3.PublicKey[],
  instructionDataSize: number,
  numSignatures: number = 1
): { isValid: boolean; estimatedSize: number; maxSize: number } {
  const estimatedSize = estimateTransactionSize(accounts, instructionDataSize, numSignatures);
  const isValid = estimatedSize <= MAX_TRANSACTION_SIZE;
  
  return {
    isValid,
    estimatedSize,
    maxSize: MAX_TRANSACTION_SIZE,
  };
}
