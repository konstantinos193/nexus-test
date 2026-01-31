/**
 * Dashboard Header - The title bar above the stats
 * Tells the user where they are and gives them a CTA
 * Because a dashboard without a header is like a ship without a captain
 * (And we're not letting anyone sail blind)
 *
 * Props: subtitle (connect vs ready message). We keep the "Create Collection" button
 * here so it's always visible. M1: button links to #. Later: /create.
 *
 * @author Juan - The developer who labeled the dashboard
 * (Coded with care, humor, and probably too much coffee)
 */

// Next link - for the CTA button (we don't use router.push for a simple href)
import Link from 'next/link'
// Plus icon - the universal "add" symbol
// Because "Create Collection" without a plus icon is like coffee without caffeine
import { Plus } from 'lucide-react'
// Button - our design system button (primary variant, etc.)
import Button from '@/components/ui/Button'

interface DashboardHeaderProps {
  /** Subtitle under "Dashboard" - different when connected vs not */
  subtitle: string
}

export default function DashboardHeader({ subtitle }: DashboardHeaderProps) {
  return (
    <header className="nft-dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p className="nft-dashboard-header-subtitle">
          {subtitle}
        </p>
      </div>
      {/* CTA - Create Collection. M1: href="#". Later: /create */}
      <Link href="#">
        <Button variant="primary" className="nft-dashboard-cta">
          <Plus className="w-5 h-5" />
          <span>Create Collection</span>
        </Button>
      </Link>
    </header>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Headers: telling you where you are since... always.
