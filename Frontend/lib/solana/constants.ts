/**
 * Solana Constants - The non-network stuff that doesn't change between environments.
 * Program ID, RPC URL, and network name are NOT here anymore — they come from the backend
 * via chain-config.ts. Swap environments by changing backend env vars, not frontend builds.
 *
 * What's still here: transaction behavior settings that are the same everywhere.
 * (The blockchain mechanics don't change between localnet and mainnet. The addresses do.)
 *
 * @author Juan - The developer who moved the network config where it belongs (the backend)
 * (import { getChainConfig } from '@/lib/solana/chain-config' for the runtime stuff)
 */

// Transaction confirmation options — same behavior on every network.
export const TRANSACTION_CONFIRMATION_OPTIONS = {
  commitment: 'confirmed' as const,
  skipPreflight: false,
} as const;

export const MAX_TRANSACTION_RETRIES = 3;
export const RPC_TIMEOUT = 30_000;
