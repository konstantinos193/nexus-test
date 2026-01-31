/**
 * Solana Network Configuration
 * Configured for devnet by default
 */

import { Cluster, Connection } from '@solana/web3.js';

export type SolanaNetwork = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet';

export interface SolanaConfig {
  network: SolanaNetwork;
  rpcUrl: string;
  /** Fallback RPC URLs for resilience (try primary first, then these) */
  rpcFallbackUrls?: string[];
  cluster: Cluster;
  /** Expected genesis hash for network validation (block wrong network) */
  expectedGenesisHash: string;
}

/** Mainnet genesis hash — use for network guard (block wrong network) */
export const MAINNET_GENESIS_HASH = '5eykt4SsFv8z8GxRKYEj5YYvuTsbKhnpGxv6G5sPtzpE'

/**
 * RPC URL: NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_SOLANA_RPC_URL (prefer RPC_URL)
 */
function getRpcUrl(defaultUrl: string): string {
  return (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RPC_URL) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOLANA_RPC_URL) ||
    defaultUrl
  )
}

/**
 * Get Solana network configuration from environment variables
 * Defaults to devnet if not specified
 */
export function getSolanaConfig(): SolanaConfig {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as SolanaNetwork;

  const configs: Record<SolanaNetwork, SolanaConfig> = {
    devnet: {
      network: 'devnet',
      rpcUrl: getRpcUrl('https://api.devnet.solana.com'),
      rpcFallbackUrls: ['https://api.devnet.solana.com'],
      cluster: 'devnet',
      expectedGenesisHash: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    },
    testnet: {
      network: 'testnet',
      rpcUrl: getRpcUrl('https://api.testnet.solana.com'),
      rpcFallbackUrls: ['https://api.testnet.solana.com'],
      cluster: 'testnet',
      expectedGenesisHash: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
    },
    'mainnet-beta': {
      network: 'mainnet-beta',
      rpcUrl: getRpcUrl('https://api.mainnet-beta.solana.com'),
      rpcFallbackUrls: ['https://api.mainnet-beta.solana.com'],
      cluster: 'mainnet-beta',
      expectedGenesisHash: '5eykt4SsFv8z8GxRKYEj5YYvuTsbKhnpGxv6G5sPtzpE',
    },
    localnet: {
      network: 'localnet',
      rpcUrl: getRpcUrl('http://127.0.0.1:8899'),
      cluster: 'devnet',
      expectedGenesisHash: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    },
  };

  return configs[network] || configs.devnet;
}

/**
 * Create a Solana Connection instance
 */
export function createSolanaConnection(): Connection {
  const config = getSolanaConfig();
  return new Connection(config.rpcUrl, 'confirmed');
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

/**
 * Get network display name
 */
export function getNetworkDisplayName(): string {
  const network = getCurrentNetwork();
  switch (network) {
    case 'devnet':
      return 'Devnet';
    case 'testnet':
      return 'Testnet';
    case 'mainnet-beta':
      return 'Mainnet';
    case 'localnet':
      return 'Localnet';
    default:
      return 'Unknown';
  }
}

