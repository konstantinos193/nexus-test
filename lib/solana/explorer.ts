/**
 * Solana Explorer URLs — transaction and address links.
 * Use after mint for tx link and NFT mint address.
 */

import type { SolanaNetwork } from './config'

const EXPLORER_BASE: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://explorer.solana.com',
  devnet: 'https://explorer.solana.com',
  testnet: 'https://explorer.solana.com',
  localnet: 'https://explorer.solana.com',
}

/**
 * Transaction URL (e.g. after mint).
 */
export function getExplorerTxUrl(signature: string, network: SolanaNetwork = 'mainnet-beta'): string {
  const base = EXPLORER_BASE[network]
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `${base}/tx/${signature}${cluster}`
}

/**
 * Address URL (mint, wallet, etc.).
 */
export function getExplorerAddressUrl(address: string, network: SolanaNetwork = 'mainnet-beta'): string {
  const base = EXPLORER_BASE[network]
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `${base}/address/${address}${cluster}`
}
