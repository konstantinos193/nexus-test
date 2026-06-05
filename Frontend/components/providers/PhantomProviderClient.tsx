'use client'

/**
 * SolanaWalletProvider - Custom in-house Solana wallet provider.
 * Wires up ConnectionProvider + WalletProvider from @solana/wallet-adapter-react.
 * RPC endpoint comes from the backend config API — no hardcoded URLs, no env vars.
 * Solflare is listed first because it deserves to be (and we recommend it).
 *
 * Boot sequence:
 *   1. Mount on client (avoids SSR window access)
 *   2. Fetch RPC endpoint from GET /api/solana/config via getChainConfig()
 *   3. Initialize adapters with the real endpoint
 *   4. Flip WalletReadyContext to true so consumers can call useWallet() safely
 *
 * (No NEXT_PUBLIC_ env var needed. The backend knows the network. Trust it.)
 *
 * @author Juan - The developer who ditched Phantom SDK for something better
 * (Coded with care, humor, and probably too much coffee)
 */

import { useState, useEffect, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { SolflareWalletAdapter, PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'

// Chain config fetched from backend — rpcUrl, network, commitment, etc.
// No hardcoded RPC URLs here. The backend decides, the frontend obeys.
import { getChainConfig } from '@/lib/solana/chain-config'

// Single-module context — prevents webpack from creating duplicate instances
// across bundle chunks, which would break the provider/consumer handshake
import { WalletReadyContext } from './WalletReadyContext'

export { WalletReadyContext }

interface Props {
  children: React.ReactNode
}

export default function SolanaWalletProvider({ children }: Props) {
  // null = not yet fetched, string = ready to go
  const [endpoint, setEndpoint] = useState<string | null>(null)
  // walletReady only flips true after endpoint is fetched and adapters are mounted
  const [walletReady, setWalletReady] = useState(false)

  useEffect(() => {
    // Fetch RPC endpoint from the backend config API.
    // getChainConfig() caches the result module-level, so concurrent callers share one request.
    getChainConfig()
      .then(cfg => setEndpoint(cfg.rpcUrl))
      .catch(err => {
        console.error('[SolanaWalletProvider] Failed to fetch chain config:', err)
        // Nothing to do — walletReady stays false, Placeholder stays visible.
        // The button won't crash the app, it just won't connect until config loads.
      })
  }, [])

  // Adapters created only after endpoint is confirmed — avoids SSR issues with window access.
  // Solflare is listed first: it's the recommended wallet and gets promoted in the UI.
  const wallets = useMemo(() => {
    if (!endpoint) return []
    return [
      new SolflareWalletAdapter(), // The star of the show
      new PhantomWalletAdapter(),  // For the holdouts
    ]
  }, [endpoint])

  // Gate: walletReady flips true once we have the endpoint and adapters are initialized.
  // React runs child effects before parent effects, so by the time this runs,
  // WalletProvider has already committed and initialized its internal context.
  useEffect(() => {
    if (endpoint) setWalletReady(true)
  }, [endpoint])

  // Always render the full provider tree so components using useWallet() / useConnection()
  // at render time (e.g. DropPageClient) never throw from missing context.
  // Before the real RPC endpoint loads: wallets=[] (no adapters) + placeholder URL.
  // autoConnect is a no-op with an empty wallets array, so nothing connects prematurely.
  const activeEndpoint = endpoint ?? 'https://api.mainnet-beta.solana.com'

  return (
    <ConnectionProvider endpoint={activeEndpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={err => console.error('[Wallet]', err)}>
        <WalletReadyContext.Provider value={walletReady}>
          {children}
        </WalletReadyContext.Provider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

// Coded by Juan - because even wallet providers need a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Solflare or bust. The backend agrees. 🔥
