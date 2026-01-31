'use client'

import { useMemo, useState, useEffect } from 'react'
import type { Adapter } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger'
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { initializeWhenDetected } from '@solflare-wallet/metamask-wallet-standard'
import { GlowWalletAdapter } from '@/lib/wallet/adapters/GlowWalletAdapter'
import { MagicEdenWalletAdapter } from '@/lib/wallet/adapters/MagicEdenWalletAdapter'
import { getSolanaConfig } from '@/lib/solana/config'
import { useWalletChange } from '@/hooks/useWalletChange'

/** localStorage key for last connected wallet (wallet memory / preselected in modal) */
export const WALLET_STORAGE_KEY = 'nexus-wallet'

/** Clears session cache when user switches wallet (publicKey change). Renders nothing. */
function WalletChangeHandler() {
  useWalletChange()
  return null
}

/** Renders WalletChangeHandler only after the provider has committed to avoid reading context before it is set. */
function WalletChangeHandlerSafe() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <WalletChangeHandler />
}

/**
 * Solana wallet adapters with multi-extension isolation.
 *
 * Phantom, Solflare, Trust, Exodus, etc. are provided by the Wallet Standard via
 * useStandardWalletAdapters() inside WalletProvider. Each wallet registers
 * on navigator.wallets and gets its own StandardWalletAdapter, so multiple
 * extensions do not share window.solana and do not interact with each other.
 * When a user has Phantom, Solflare, Backpack, Exodus, etc. all installed, picking
 * one wallet in the modal talks only to that extension (not the others).
 * See: https://docs.phantom.com/llms.txt (Phantom: window.phantom?.solana);
 * https://docs.solflare.com/ (Solflare: window.solflare; use getSolflareProvider() for direct integration);
 * https://docs.backpack.app/ (Backpack: window.backpack; use getBackpackProvider() for direct integration);
 * https://doc-exodus.pages.dev/ (Exodus: window.exodus; use getExodusProvider() for direct integration);
 * Brave Wallet: window.braveSolana only (use getBraveSolanaProvider(); do not use window.solana for Brave so we do not interact with other extensions).
 *
 * We only pass adapters that do NOT register on the Wallet Standard (e.g. Ledger).
 * Phantom and Solflare are passed explicitly so they appear on mobile too (as NotDetected
 * when the extension is absent); on desktop the Standard may also provide them.
 * Glow is passed as GlowWalletAdapter so we use only window.glow (Glow SDK), not
 * window.solana or other wallets; see https://docs.glow.app/
 * Magic Eden is passed as MagicEdenWalletAdapter so we use only window.magicEden.solana,
 * not window.solana or other wallets; see https://docs-wallet.magiceden.io/
 * MetaMask (Solana Snap) is registered via @solflare-wallet/metamask-wallet-standard
 * so it gets its own StandardWalletAdapter and does not share with other extensions.
 */
interface WalletProviderWrapperProps {
  children: React.ReactNode
}

export default function WalletProviderWrapper({ children }: WalletProviderWrapperProps) {
  const config = getSolanaConfig()
  const endpoint = useMemo(() => config.rpcUrl, [config.rpcUrl])

  const wallets = useMemo((): Adapter[] => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new GlowWalletAdapter(),
    new MagicEdenWalletAdapter(),
    new TrustWalletAdapter(),
    new LedgerWalletAdapter(),
  ], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        localStorageKey={WALLET_STORAGE_KEY}
      >
        <WalletChangeHandlerSafe />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
