/**
 * Solana Connection Utilities
 * Provides singleton connection instance and helper functions
 */

import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { createSolanaConnection, getSolanaConfig } from './config';

let connectionInstance: Connection | null = null;

/**
 * Get or create a singleton Solana connection
 */
export function getSolanaConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = createSolanaConnection();
  }
  return connectionInstance;
}

/**
 * Reset the connection instance (useful when network changes)
 */
export function resetSolanaConnection(): void {
  connectionInstance = null;
}

/**
 * Get account balance
 */
export async function getAccountBalance(publicKey: string | PublicKey): Promise<number> {
  const connection = getSolanaConnection();
  const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
  const balance = await connection.getBalance(pubkey);
  return balance / 1e9; // Convert lamports to SOL
}

/**
 * Get recent blockhash
 */
export async function getRecentBlockhash(commitment: Commitment = 'confirmed') {
  const connection = getSolanaConnection();
  return await connection.getLatestBlockhash(commitment);
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get transaction signature status
 */
export async function getTransactionStatus(signature: string) {
  const connection = getSolanaConnection();
  return await connection.getSignatureStatus(signature);
}

/**
 * Get network info
 */
export async function getNetworkInfo() {
  const connection = getSolanaConnection();
  const config = getSolanaConfig();
  
  try {
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    
    return {
      network: config.network,
      rpcUrl: config.rpcUrl,
      version: version['solana-core'],
      slot,
      blockHeight,
    };
  } catch (error) {
    console.error('Error fetching network info:', error);
    return {
      network: config.network,
      rpcUrl: config.rpcUrl,
      error: 'Failed to fetch network info',
    };
  }
}
