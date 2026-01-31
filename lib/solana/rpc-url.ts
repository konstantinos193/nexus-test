/**
 * RPC URL only — no @solana/web3.js.
 * Use this in wallet shell / adapter loader to avoid pulling web3 into initial bundle.
 */

const DEFAULT_RPC: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  localnet: 'http://127.0.0.1:8899',
}

export function getRpcUrl(): string {
  const env = typeof process !== 'undefined' ? process.env : undefined
  if (env?.NEXT_PUBLIC_RPC_URL) return env.NEXT_PUBLIC_RPC_URL
  if (env?.NEXT_PUBLIC_SOLANA_RPC_URL) return env.NEXT_PUBLIC_SOLANA_RPC_URL
  const network = (env?.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as string
  return DEFAULT_RPC[network] ?? DEFAULT_RPC.devnet
}
