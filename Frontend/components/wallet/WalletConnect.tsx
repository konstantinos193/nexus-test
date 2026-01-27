'use client'

/**
 * WalletConnect Component - The gateway to Web3 chaos
 * This is where users connect their wallets and enter the rabbit hole
 * Using Phantom Connect SDK for seamless wallet integration
 *
 * NOTE: Temporarily showing fallback UI (disabled) when PhantomProvider is off
 * Because you can't buy NFTs without a wallet (and we're not about to let you try)
 *
 * @author Juan - The developer who built this wallet button
 * (Coded with care, humor, and probably too much coffee)
 */

import { Wallet } from 'lucide-react'
import Button from '@/components/ui/Button'

// For testing: Always show fallback when provider is disabled
// TODO: Re-enable wallet functionality when PhantomProvider is restored
// Because a disabled "Connect Wallet" is sadder than a birthday party with no guests
export default function WalletConnect() {
  return (
    <Button
      variant="primary"
      size="sm"
      disabled={true}
      className="flex items-center gap-2"
      title="Wallet provider disabled for testing"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect Wallet</span>
    </Button>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Wallets: keys to the blockchain. Literally. 🔑
