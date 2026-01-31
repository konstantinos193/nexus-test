/**
 * Dashboard Empty Collections - The "no collections yet" section
 * Shows when the user is connected but has no collections (or we're in M1 shell)
 * Because an empty list is still a list
 * (And we'd rather say "nothing yet" than show a void and hope they get it)
 *
 * One section: title "Your Collections", one card with icon + "No Collections Yet"
 * + copy that collections will appear in a later milestone. No primary CTA here
 * (header has Create Collection; we're not repeating it)
 *
 * @author Juan - The developer who made empty feel intentional
 * (Coded with care, humor, and probably too much coffee)
 */

// Card - for the empty state box
import { Card, CardContent } from '@/components/ui/Card'
// Image icon - generic "collection" visual when there are zero
import { Image as ImageIcon } from 'lucide-react'

export default function DashboardEmptyCollections() {
  return (
    <section className="nft-dashboard-collections-section">
      <div className="nft-dashboard-collections-header">
        <h2 className="nft-dashboard-collections-title">Your Collections</h2>
      </div>
      {/* Single empty state card - icon, title, one line of copy */}
      <Card variant="elevated">
        <CardContent className="nft-dashboard-empty-state">
          <ImageIcon />
          <h3>No Collections Yet</h3>
          <p>Your collections will appear here in a later milestone.</p>
        </CardContent>
      </Card>
    </section>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Empty is a state. We own it.
