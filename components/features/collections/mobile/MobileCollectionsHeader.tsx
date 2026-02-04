/**
 * Mobile Collections Header Component
 * Mobile-optimized header with title, description, and stats
 * Because mobile users need context too (just in a smaller package)
 * 
 * @author Juan - The developer who made headers mobile-friendly
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import styles from './MobileCollections.module.css'

interface Stats {
  total: number
  live: number
  upcoming: number
  completed: number
}

interface MobileCollectionsHeaderProps {
  stats: Stats
}

export default function MobileCollectionsHeader({ stats }: MobileCollectionsHeaderProps) {
  return (
    <section className={styles.mobileHeader}>
      <div className={styles.mobileHeaderContent}>
        <h1 className={styles.mobileTitle}>
          Explore Collections
        </h1>
        <p className={styles.mobileDescription}>
          Discover and mint from the hottest NFT collections launching on our platform
        </p>
      </div>

      {/* Stats Grid - Because numbers are sexy (even on mobile) */}
      <div className={styles.mobileStatsGrid}>
        <div className={styles.mobileStatCard}>
          <div className={styles.mobileStatValue}>{stats.total}</div>
          <div className={styles.mobileStatLabel}>Total</div>
        </div>
        <div className={styles.mobileStatCard}>
          <div className={`${styles.mobileStatValue} ${styles.mobileStatValueLive}`}>
            {stats.live}
          </div>
          <div className={styles.mobileStatLabel}>Live</div>
        </div>
        <div className={styles.mobileStatCard}>
          <div className={`${styles.mobileStatValue} ${styles.mobileStatValueUpcoming}`}>
            {stats.upcoming}
          </div>
          <div className={styles.mobileStatLabel}>Upcoming</div>
        </div>
        <div className={styles.mobileStatCard}>
          <div className={`${styles.mobileStatValue} ${styles.mobileStatValueCompleted}`}>
            {stats.completed}
          </div>
          <div className={styles.mobileStatLabel}>Completed</div>
        </div>
      </div>
    </section>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Headers: making first impressions count, one screen size at a time. 📊
