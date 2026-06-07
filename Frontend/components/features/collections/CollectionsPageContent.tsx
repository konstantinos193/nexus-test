/**
 * CollectionsPageContent – The main content area of the collections page.
 * Orchestrates three distinct states: error, loading, empty, and the happy path.
 * (Four states. The JSDoc said three. Juan can't count. The code is right though.)
 *
 * This is the component that decides what the user sees in the big center column.
 * It is the bouncer, the stage manager, and the understudy — all in one.
 * If data loads successfully, it gets out of the way and lets CollectionGrid shine.
 *
 * @author Juan – The developer who wrote four conditional renders and called it "orchestration"
 * (Coded with care, exhaustive state handling, and mild resentment for API timeouts)
 */

// React — the foundation on which all our hopes and components are built
import React from 'react'
// NFTCollection — the shape of a collection from the API. Used for the displayedCollections prop.
import type { NFTCollection } from '@/types'
// CollectionGrid — the actual grid of cards. This is what we're protecting with all these guards.
import CollectionGrid from '@/components/features/collections/CollectionGrid'
// LoadMore — the humble button at the bottom that says "there's more, if you want it"
import LoadMore from '@/components/features/collections/LoadMore'
// EmptyState — the graceful fallback for when the grid has nothing to show
import EmptyState from '@/components/features/collections/EmptyState'
// CSS module — positions the load-more button below the grid, with appropriate breathing room
import styles from './CollectionsPageContent.module.css'

/**
 * Props for CollectionsPageContent — the full lifecycle of a collections fetch
 * squeezed into six props and a prayer.
 */
interface CollectionsPageContentProps {
  displayedCollections: NFTCollection[]  // The collections to show — typed from the API response
  isLoading: boolean                     // True while the API call is in-flight
  error: unknown                         // If something went wrong, this is non-null and we show a sad face
  handleLoadMore: () => void     // Callback to load the next page — fires when the button is clicked
  hasMore: boolean               // Whether there are more collections beyond the current page
  handleClearFilters: () => void // Callback to reset all filters — offered as an escape hatch in empty state
}

/**
 * CollectionsPageContent — Four states, one component, zero blank screens.
 * The most defensive component in this codebase. And proud of it.
 */
export function CollectionsPageContent({
  displayedCollections,
  isLoading,
  error,
  handleLoadMore,
  hasMore,
  handleClearFilters
}: CollectionsPageContentProps) {

  // ── Error State ─────────────────────────────────────────────────────────────
  // Something went wrong. The API returned an error, the network rage-quit,
  // or the backend is having an existential crisis. Whatever happened, we handle it with grace.
  if (error) {
    return (
      <EmptyState
        title="Something went wrong."
        description="We couldn't load the collections. Please try again later."
        // No action here — there's nothing the user can do except wait and wonder
      />
    )
  }

  // ── Loading State (No Data Yet) ─────────────────────────────────────────────
  // Data is loading AND we have zero collections to show.
  // Pass loading=true to CollectionGrid so it renders skeleton cards.
  // (Much better than showing an empty grid that then fills up. Layout shifts are bad vibes.)
  if (isLoading && displayedCollections.length === 0) {
    return <CollectionGrid collections={[]} loading />
  }

  // ── Empty State (Not Loading, Genuinely Empty) ──────────────────────────────
  // The fetch completed successfully but returned nothing.
  // Most likely cause: filters are too narrow. Solution: clear them.
  // We offer the escape hatch here — a "Clear filters" action button.
  if (!isLoading && displayedCollections.length === 0) {
    return (
      <EmptyState
        title="No collections found."
        description="Try adjusting your filters to see more results."
        action={{ label: 'Clear filters', onClick: handleClearFilters }}
      />
    )
  }

  // ── Happy Path ──────────────────────────────────────────────────────────────
  // Data loaded, collections exist, filters are reasonable.
  // This is what success looks like. Cherish it.
  return (
    <>
      {/* The grid — the whole reason we're here. Renders real cards or skeletons mid-load. */}
      <CollectionGrid
        collections={displayedCollections}
        loading={isLoading}
      />

      {/* Load More Button — only visible when:
          1. Not currently loading (don't show two loading states simultaneously)
          2. There are actually collections to show (we have content to anchor it to)
          3. There are more pages to load (hasMore === true)
          All three conditions required. No exceptions. Juan is particular about this. */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because blank screens are not a UI state. They're a failure mode.
// (Four conditions. All handled. You're welcome.)
// ─────────────────────────────────────────────────────────────────────────────
