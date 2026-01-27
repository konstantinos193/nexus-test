'use client'

import styles from './LoadMore.module.css'

interface LoadMoreProps {
  onLoadMore: () => void
  isLoading?: boolean
  hasMore?: boolean
}

/**
 * LoadMore Component - The button that loads more collections
 * Wireframe spec: Option A - Load More button
 * Because infinite scroll is cool, but sometimes you want a button
 * (And buttons are more predictable than scroll events)
 * Styles: LoadMore.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this load more button
 * (Coded with care, humor, and probably too much coffee)
 */
export default function LoadMore({ onLoadMore, isLoading = false, hasMore = true }: LoadMoreProps) {
  // Don't show if there's no more to load
  if (!hasMore) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className={styles.button}
      >
        {isLoading ? 'Loading...' : 'Load More Collections'}
      </button>
    </div>
  )
}

// Coded by Juan - because every good load more button needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Load more: because sometimes more is better. 📦
