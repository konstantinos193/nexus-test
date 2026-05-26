import React from 'react'
import CollectionGrid from '@/components/features/collections/CollectionGrid'
import LoadMore from '@/components/features/collections/LoadMore'
import EmptyState from '@/components/features/collections/EmptyState'
import styles from './CollectionsPageContent.module.css'

interface CollectionsPageContentProps {
  displayedCollections: any[]
  isLoading: boolean
  error: any
  handleLoadMore: () => void
  hasMore: boolean
  handleClearFilters: () => void
}

export function CollectionsPageContent({
  displayedCollections,
  isLoading,
  error,
  handleLoadMore,
  hasMore,
  handleClearFilters
}: CollectionsPageContentProps) {
  // Error state
  if (error) {
    return (
      <EmptyState
        title="Something went wrong."
        description="We couldn't load the collections. Please try again later."
      />
    )
  }

  // Loading state with no collections
  if (isLoading && displayedCollections.length === 0) {
    return <CollectionGrid collections={[]} loading={true} />
  }

  // Empty state
  if (!isLoading && displayedCollections.length === 0) {
    return (
      <EmptyState
        title="No collections found."
        description="Try adjusting your filters to see more results."
        action={{ label: 'Clear filters', onClick: handleClearFilters }}
      />
    )
  }

  return (
    <>
      <CollectionGrid
        collections={displayedCollections}
        loading={isLoading}
      />
      
      {/* Load More Button - Only show when not loading and has collections */}
      {!isLoading && displayedCollections.length > 0 && hasMore && (
        <div className={styles.loadMoreSection}>
          <LoadMore
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </div>
      )}
    </>
  )
}
