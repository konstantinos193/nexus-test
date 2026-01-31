'use client'

/**
 * ClientOnlyWalletProvider - Gate so wallet code only runs on the client
 * SSR doesn't run useEffect; we show a loading shell until mounted
 * Then WalletProviderShell + children. No hydration mismatch
 * Because a hydration mismatch is like promising breakfast and serving silence
 *
 * We keep initial state false so server and first client render match
 * (Using sessionStorage or module state for initial value would cause mismatch on return visits)
 *
 * @author Juan - The developer who waited for the client
 * (Coded with care, humor, and probably too much coffee)
 */

import { useState, useEffect, type ReactNode } from 'react'
// Shell - the actual wallet adapters + React Query wallet context
import WalletProviderShell from './WalletProviderShell'

export default function ClientOnlyWalletProvider({ children }: { children: ReactNode }) {
  // Mounted = have we run on the client yet? false on server and first client paint
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Not mounted - show a simple loading spinner (no wallet UI yet)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center" aria-busy="true" aria-label="Loading">
        <div className="w-8 h-8 border-2 border-dark-border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Mounted - render the wallet shell + children
  return <WalletProviderShell>{children}</WalletProviderShell>
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Server: no wallet. Client: wallet. We don't mix.
