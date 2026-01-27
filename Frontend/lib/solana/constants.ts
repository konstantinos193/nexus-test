/**
 * Solana Constants
 * Common constants used across the Solana integration
 */

// Devnet Program IDs (update when contracts are deployed)
export const PROGRAM_IDS = {
  // Update these with your deployed program IDs
  MINTING_PROGRAM: process.env.NEXT_PUBLIC_MINTING_PROGRAM_ID || '',
  PAYMENT_PROGRAM: process.env.NEXT_PUBLIC_PAYMENT_PROGRAM_ID || '',
  WHITELIST_PROGRAM: process.env.NEXT_PUBLIC_WHITELIST_PROGRAM_ID || '',
} as const;

// Platform fee (5% default, can be configured)
export const PLATFORM_FEE_PERCENTAGE = 5;

// Creator fee (95% default)
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
