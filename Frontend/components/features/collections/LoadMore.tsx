'use client'

/**
 * LoadMore – The humble button at the bottom of the collections grid that says "show me more."
 * Not infinite scroll. A deliberate choice. Infinite scroll is unpredictable, addictive,
 * and hard to test. A button is honest. You know exactly when you asked for more.
 *
 * If hasMore is false, this component renders null.
 * You cannot load more when there is no more. That's not pessimism, that's pagination.
 *
 * @author Juan – The developer who chose a button over infinite scroll and sleeps fine at night
 * (Coded with care, simplicity, and a quiet disdain for scroll event listeners)
 */

// CSS module — centers the button, adds padding so it breathes below the grid
import styles from './LoadMore.module.css'

/** Props: three levers of control for this small but mighty button. */
interface LoadMoreProps {
  onLoadMore: () => void   // Fires when the button is clicked — caller fetches the next page
  isLoading?: boolean      // When true, button is disabled and shows loading text
  hasMore?: boolean        // When false, the component returns null — no button, no mystery
}

/**
 * LoadMore — Click it. Get more. Simple.
 * Disabled during loading so users can't queue up multiple requests like an impatient child.
 * Hidden entirely when there's nothing more to fetch — we don't taunt users with a dead button.
 */
export default function LoadMore({ onLoadMore, isLoading = false, hasMore = true }: LoadMoreProps) {

  // If there's no more data to load, render nothing at all.
  // A disabled "Load More" button with no data behind it is a lie. We don't do lies.
  if (!hasMore) {
    return null
  }

  return (
    // Center wrapper — gives the button room to exist without touching the grid
    <div className={styles.wrap}>
      <button
        onClick={onLoadMore}
        // Disabled during loading — one request at a time, please
        // The user doesn't need to click 12 times while the API thinks
        disabled={isLoading}
        className={styles.button}
      >
        {/* Button label — either "Loading..." (in progress) or the invitation to explore more */}
        {isLoading ? 'Loading...' : 'Load More Collections'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because sometimes more IS better, and a button is the right metaphor.
// (Infinite scroll exists. We chose not to use it. That was a conversation. We won.)
// ─────────────────────────────────────────────────────────────────────────────
