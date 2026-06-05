/**
 * CollectionGrid – The stage where all collections perform simultaneously.
 * Three columns on desktop, two on tablet, one on mobile — because physics.
 * Responsive, lazy-loaded, and gracefully handles the existential dread of an empty state.
 *
 * This is the component that actually shows users what's out there.
 * If it renders 6 skeletons, we're loading. If it renders zero cards, we're sad.
 * If it renders actual CollectionCards, we're shipping. (Finally.)
 *
 * Styles: CollectionGrid.module.css — standalone, no global contamination.
 *
 * @author Juan – The developer who counted to three (columns) and called it a spec
 * (Coded with care, CSS grid, and a quiet prayer to the responsive design gods)
 */

// The NFTCollection type — the shape of truth that this grid is built to display
import { NFTCollection } from '@/types'
// The actual card component — the reason this grid exists
import { CollectionCard } from './CollectionCard'
// The shimmer placeholder — for when the API is thinking (or napping)
import CollectionCardSkeleton from './CollectionCardSkeleton'
// The empty state — for when filters are too aggressive or the world has no drops today
import EmptyState from './EmptyState'
// CSS module — the grid layout lives here, scoped and clean
import styles from './CollectionGrid.module.css'

/** Props: the collections array and an optional loading flag. Small API. Big responsibility. */
interface CollectionGridProps {
  collections: NFTCollection[]
  loading?: boolean
}

/**
 * CollectionGrid — Renders loading skeletons, an empty state, or the real cards.
 * Three outcomes. One component. Zero excuses for showing a blank white screen.
 */
export default function CollectionGrid({ collections, loading }: CollectionGridProps) {

  // ── Loading State ───────────────────────────────────────────────────────────
  // The data hasn't arrived yet. We fill the grid with 6 skeleton cards
  // because staring at a blank grid while waiting is a form of psychological warfare.
  // 6 skeletons because 3 cols × 2 rows = the illusion of a full page. Trust the math.
  if (loading) {
    return (
      <div className={styles.grid}>
        {[...Array(6)].map((_, i) => (
          // Key by index here because skeletons have no identity (philosophically and technically)
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // ── Empty State ─────────────────────────────────────────────────────────────
  // No collections to show. Either the filters are working too well,
  // or the backend is hoarding data. Either way, EmptyState handles the awkward silence.
  if (collections.length === 0) {
    return <EmptyState />
  }

  // ── The Real Grid ───────────────────────────────────────────────────────────
  // Data is here. Layout is ready. The grid renders and everything is beautiful.
  // (Assuming the IPFS images load. Which they will. Probably.)
  return (
    <div className={styles.grid}>
      {collections.map((collection) => (
        // Key by collection.id — real data, real keys, real consequences when you skip this
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because someone had to decide the columns. Three felt right.
// (Two felt weak. Four felt greedy. Three is the Goldilocks of grid layouts.)
// ─────────────────────────────────────────────────────────────────────────────
