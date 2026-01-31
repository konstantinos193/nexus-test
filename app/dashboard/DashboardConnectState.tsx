/**
 * Dashboard Connect State - The "connect your wallet" empty state
 * Shows when the user hasn't connected a wallet yet
 * Because we can't show their collections if we don't know who they are
 * (And asking politely is better than showing a blank screen and shrugging)
 *
 * One card: wallet icon, title, short copy, "use the connect button" hint
 * No CTA button here - the header already has "Create Collection"; connect is in the global header
 *
 * @author Juan - The developer who asked nicely for a wallet
 * (Coded with care, humor, and probably too much coffee)
 */

// Card components - elevated variant so it stands out from the background
import { Card, CardContent } from '@/components/ui/Card'
// Wallet icon - the universal "connect wallet" visual
// Because an icon says "wallet" faster than a paragraph
import { Wallet } from 'lucide-react'

export default function DashboardConnectState() {
  return (
    <Card variant="elevated">
      <CardContent className="nft-dashboard-empty-state">
        {/* Big wallet icon - sets the tone before they read a word */}
        <Wallet
          style={{
            width: '4rem',
            height: '4rem',
            color: 'rgba(255,255,255,0.5)',
            margin: '0 auto 1rem',
            display: 'block',
          }}
        />
        <h3>Connect Wallet</h3>
        <p>
          Connect your Solana wallet to view and edit your collections
        </p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Use the connect button in the header to get started.
        </p>
      </CardContent>
    </Card>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - We're not judging. We just need a wallet to show stuff.
