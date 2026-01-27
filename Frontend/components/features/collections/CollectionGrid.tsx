/**
 * CollectionGrid Component - Where collections go to be displayed
 * Wireframe spec: 3 columns desktop, 2 tablet, 1 mobile
 * This is the grid that shows all the collections
 * Because lists are boring and grids are where it's at
 *
 * Features:
 * - Responsive grid (1 mobile, 2 tablet, 3 desktop - per wireframe)
 * - Loading skeletons (because we're not going to leave users staring at a blank screen)
 * - Empty state (because "no collections" is sadder than a birthday party with no guests)
 * Styles: CollectionGrid.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this grid
 * (Coded with care, humor, and probably too much coffee)
 */

import { NFTCollection } from '@/types'
import { CollectionCard } from './CollectionCard'
import CollectionCardSkeleton from './CollectionCardSkeleton'
import EmptyState from './EmptyState'
import styles from './CollectionGrid.module.css'

interface CollectionGridProps {
  collections: NFTCollection[]
  loading?: boolean
}

export default function CollectionGrid({ collections, loading }: CollectionGridProps) {
  // Loading state - skeleton placeholders while data loads
  // Because leaving users staring at nothing is rude (and we're not rude)
  if (loading) {
    return (
      <div className={styles.grid}>
        {[...Array(6)].map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state - when no collections match filters
  // Because empty grids are sadder than a birthday party with no guests
  if (collections.length === 0) {
    return <EmptyState />
  }

  // The actual grid - where the magic happens (or at least the rendering)
  // Wireframe: 3 cols desktop, 2 tablet, 1 mobile
  return (
    <div className={styles.grid}>
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Grids > lists. Fight me. 📐
