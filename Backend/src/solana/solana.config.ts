/**
 * Solana Configuration for Backend
 * Configured for devnet by default
 */

import { Cluster, Connection } from '@solana/web3.js';

export type SolanaNetwork = 'devnet' | 'testnet' | 'mainnet-beta';

export interface SolanaConfig {
  network: SolanaNetwork;
  rpcUrl: string;
  cluster: Cluster;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Get Solana network configuration from environment variables
 * Defaults to devnet if not specified
 */
export function getSolanaConfig(): SolanaConfig {
  const network = (process.env.SOLANA_NETWORK || 'devnet') as SolanaNetwork;
  const commitment = (process.env.SOLANA_COMMITMENT || 'confirmed') as 'processed' | 'confirmed' | 'finalized';
  
  const configs: Record<SolanaNetwork, Omit<SolanaConfig, 'commitment'>> = {
    devnet: {
      network: 'devnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      cluster: 'devnet',
    },
    testnet: {
      network: 'testnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com',
      cluster: 'testnet',
    },
    'mainnet-beta': {
      network: 'mainnet-beta',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      cluster: 'mainnet-beta',
    },
  };

  return {
    ...configs[network] || configs.devnet,
    commitment,
  };
}

/**
 * Create a Solana Connection instance
 */
export function createSolanaConnection(): Connection {
  const config = getSolanaConfig();
  return new Connection(config.rpcUrl, config.commitment);
}

/**
 * Get the current network name
 */
export function getCurrentNetwork(): SolanaNetwork {
  return getSolanaConfig().network;
}

/**
 * Check if we're on devnet
 */
export function isDevnet(): boolean {
  return getCurrentNetwork() === 'devnet';
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(): boolean {
  return getCurrentNetwork() === 'mainnet-beta';
}
