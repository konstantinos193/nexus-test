'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { clearWalletSession } from '@/lib/wallet/session'

/**
 * Clears session cache when the user switches wallet (publicKey change).
 * Resets whitelist cache, mint counters, etc. so they reload for the new wallet.
 */
export function useWalletChange() {
  const { publicKey } = useWallet()
  const previousKey = useRef<string | null>(null)

  useEffect(() => {
    const current = publicKey?.toBase58() ?? null
    if (previousKey.current !== null && previousKey.current !== current) {
      clearWalletSession()
    }
    previousKey.current = current
  }, [publicKey])
}
