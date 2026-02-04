/**
 * Mobile FAQ Header Component
 * Optimized header for mobile devices
 */

import styles from './MobileFAQ.module.css'

export default function MobileFAQHeader() {
  return (
    <div className={styles.mobileFaqHeader}>
      <h1 className={styles.mobileFaqTitle}>
        Frequently Asked Questions
      </h1>
      <p className={styles.mobileFaqSubtitle}>
        Everything you need to know about NeXus NFT Launchpad. Find answers to common questions and get the support you need.
      </p>
    </div>
  )
}
