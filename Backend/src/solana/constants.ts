/**
 * Solana Constants for Backend
 * Matches frontend constants for consistency
 */

// Devnet Program IDs (updated with deployed IDs from devnet - February 15, 2026)
export const PROGRAM_IDS = {
  // Updated with deployed program IDs from devnet - February 15, 2026
  MINTING_PROGRAM: process.env.MINTING_PROGRAM_ID || '3W4M5Mgd1rwaEHxLa8csRtUt4SGyZQzGennyV3HBEz5T',
  PAYMENT_PROGRAM: process.env.PAYMENT_PROGRAM_ID || 'HvpsXKFSSznqurbDCCp9AhQosGMsE4L6HfQDfUwXsnfb',
  COLLECTION_PROGRAM: process.env.COLLECTION_PROGRAM_ID || 'GJTV2dk9cVY1ad7z6zuiYvKz3rW9iHiPfEG1KsE96mq1',
  LAUNCHPAD_PROGRAM: process.env.LAUNCHPAD_PROGRAM_ID || '9XNzvPXh1s3LAUFx8vRrJTDByxPCN8h4bctF6LXtXeNu',
} as const;

// Platform fee configuration (5% default)
export const PLATFORM_FEE_PERCENTAGE = 5;

// Creator fee configuration (95% default)
export const CREATOR_FEE_PERCENTAGE = 95;

// Transaction confirmation options
export const TRANSACTION_CONFIRMATION_OPTIONS = {
  commitment: 'confirmed' as const,
  skipPreflight: false,
} as const;

// Maximum retries for transactions
export const MAX_TRANSACTION_RETRIES = 3;

// RPC timeout (milliseconds)
export const RPC_TIMEOUT = 30000; // 30 seconds

// Account seed prefixes for PDAs
export const PDA_SEEDS = {
  COLLECTION: 'collection',
  SPLITTER: 'splitter',
  MINT: 'mint',
  METADATA: 'metadata',
  EDITION: 'edition',
} as const;

// Token metadata program ID (devnet)
export const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// System program ID
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// Rent exemption thresholds (in lamports)
export const RENT_EXEMPTION = {
  MINIMUM: 890880, // Minimum balance for rent exemption
} as const;
