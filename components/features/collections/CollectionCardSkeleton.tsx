/**
 * CollectionCardSkeleton Component - The loading placeholder for collection cards
 * Matches the CollectionCard design exactly
 * Because loading states should match the actual content (it's only polite)
 * 
 * Shows a skeleton version of the collection card while data loads
 * Because staring at a blank screen is worse than staring at a skeleton
 * (At least skeletons have structure)
 *
 * @author Juan - The developer who built this skeleton
 * (Coded with care, humor, and probably too much coffee)
 */

import styles from './CollectionCardSkeleton.module.css'

export default function CollectionCardSkeleton() {
  return (
    <article className={styles.card}>
      {/* Banner skeleton */}
      <div className={styles.banner} />
      
      {/* Content skeleton */}
      <div className={styles.content}>
        {/* Header skeleton */}
        <div className={styles.header}>
          <div className={styles.collectionName} />
          <div className={styles.creator}>
            <div className={styles.avatar} />
            <div className={styles.creatorText} />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel} />
            <div className={styles.statValue} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel} />
            <div className={styles.statValue} />
          </div>
        </div>
        
        {/* Progress skeleton */}
        <div className={styles.progress}>
          <div className={styles.progressBar} />
        </div>
      </div>
    </article>
  )
}

// Coded by Juan - because every good skeleton needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Skeletons: making loading less boring since... today. 💀
