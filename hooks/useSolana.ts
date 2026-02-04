/**
 * React Hook for Solana Integration
 * Provides easy access to Solana connection and utilities
 */

import { useMemo } from 'react';
import { Connection } from '@solana/web3.js';
import {
  getSolanaConnection,
  getAccountBalance,
  getNetworkInfo,
  isValidAddress,
} from '@/lib/solana/connection';
import {
  getCurrentNetwork,
  getNetworkDisplayName,
  isDevnet,
  isMainnet,
} from '@/lib/solana/config';

export function useSolana() {
  const connection = useMemo(() => getSolanaConnection(), []);

  return {
    connection,
    network: getCurrentNetwork(),
    networkDisplayName: getNetworkDisplayName(),
    isDevnet: isDevnet(),
    isMainnet: isMainnet(),
    getAccountBalance,
    getNetworkInfo,
    isValidAddress,
  };
}
