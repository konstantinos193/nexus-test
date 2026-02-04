'use client'

import { useState, useEffect, type ReactNode } from 'react'
import WalletProviderShell from './WalletProviderShell'

/**
 * Gate: only mount wallet providers on the client (SSR doesn't run useEffect).
 * Shows a brief loading shell until mounted, then WalletProviderShell + children.
 * Shell renders immediately with wallets=[]; adapters load async (no chunk wait).
 * The loading state shows only on initial mount until useEffect runs.
 *
 * IMPORTANT: Initial state must always be false to match server render and avoid
 * hydration mismatch. Using sessionStorage or module state for initial value
 * would cause client to render differently than server (e.g. on return visits).
 */
export default function ClientOnlyWalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center" aria-busy="true" aria-label="Loading">
        <div className="w-8 h-8 border-2 border-dark-border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <WalletProviderShell>{children}</WalletProviderShell>
}
