'use client'

import styles from './CollectionsPageHeader.module.css'

interface CollectionsPageHeaderProps {
  onSearchChange?: (query: string) => void
  initialSearch?: string
}

/**
 * Collections Page Header Component - Minimal top right header
 * Simple and clean, positioned at the top right
 * Because sometimes less is more (and we're not trying to overwhelm users)
 * Styles: CollectionsPageHeader.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this header
 * (Coded with care, humor, and probably too much coffee)
 */
export default function CollectionsPageHeader({ 
  onSearchChange, 
  initialSearch = '' 
}: CollectionsPageHeaderProps) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Collections</h1>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Context is king. So we put a crown on it. 👑
