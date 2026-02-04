/**
 * Mobile Collection Grid Component
 * Mobile-optimized grid that displays 2 columns on mobile
 * Because mobile users deserve a proper grid layout
 * (And single column grids are just sad)
 * 
 * @author Juan - The developer who made grids mobile-friendly
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { NFTCollection } from '@/types'
import { CollectionCard } from '../CollectionCard'
import CollectionCardSkeleton from '../CollectionCardSkeleton'
import EmptyState from '../EmptyState'
import styles from './MobileCollections.module.css'

interface MobileCollectionGridProps {
  collections: NFTCollection[]
  loading?: boolean
}

export default function MobileCollectionGrid({ collections, loading }: MobileCollectionGridProps) {
  // Loading state - skeleton placeholders while data loads
  if (loading) {
    return (
      <div className={styles.mobileGrid}>
        {[...Array(6)].map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state - when no collections match filters
  if (collections.length === 0) {
    return <EmptyState />
  }

  // The actual grid - 2 columns on mobile, matching homepage
  return (
    <div className={styles.mobileGrid}>
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Mobile grids: making 2 columns happen, one screen at a time. 📱
