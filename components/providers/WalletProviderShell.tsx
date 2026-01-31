'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Adapter } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { getRpcUrl } from '@/lib/solana/rpc-url'
import { WALLET_STORAGE_KEY } from '@/lib/wallet/constants'
import { useWalletChange } from '@/hooks/useWalletChange'

function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/** Clears session cache when user switches wallet. Renders nothing. */
function WalletChangeHandler() {
  useWalletChange()
  return null
}

function WalletChangeHandlerSafe() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return <WalletChangeHandler />
}

/**
 * Renders ConnectionProvider + WalletProvider immediately with wallets=[].
 * Loads adapters async (dynamic import) and updates wallets when ready.
 * No full-page loader — app is visible right away; Connect works once adapters load.
 */
export default function WalletProviderShell({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => getRpcUrl(), [])
  const [adapters, setAdapters] = useState<Adapter[]>([])

  useEffect(() => {
    import('@/lib/wallet/loadAdapters')
      .then((m) => m.loadAdapters())
      .then(setAdapters)
      .catch((err) => console.error('[WalletProviderShell] loadAdapters failed', err))
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={adapters}
        autoConnect={!isMobile()}
        localStorageKey={WALLET_STORAGE_KEY}
      >
        <WalletChangeHandlerSafe />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
