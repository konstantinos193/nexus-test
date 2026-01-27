'use client'

import styles from './EmptyState.module.css'

interface EmptyStateProps {
  onClearFilters?: () => void
}

/**
 * EmptyState Component - What users see when there are no collections
 * Wireframe spec: "No collections found. Try adjusting your filters. [ Clear Filters ]"
 * Because empty states are sadder than a birthday party with no guests
 * (But at least we can help them fix it)
 * Styles: EmptyState.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this empty state
 * (Coded with care, humor, and probably too much coffee)
 */
export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.container}>
        <h3 className={styles.title}>
          No collections found
        </h3>
        <p className={styles.message}>
          Try adjusting your filters to see more results
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className={styles.button}
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  )
}

// Coded by Juan - because every good empty state needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Empty states: making nothing feel like something. 🎭
