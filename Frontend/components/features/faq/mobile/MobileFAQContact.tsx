/**
 * Mobile FAQ Contact Component
 * Contact section optimized for mobile
 */

import styles from './MobileFAQ.module.css'

export default function MobileFAQContact() {
  return (
    <div className={styles.mobileFaqContact}>
      <div className={styles.mobileFaqContactContent}>
        <h2 className={styles.mobileFaqContactTitle}>
          Still have questions?
        </h2>
        <p className={styles.mobileFaqContactText}>
          Can't find what you're looking for? Our support team is here to help. Reach out to us and we'll get back to you as soon as possible.
        </p>
        <div className={styles.mobileFaqContactLinks}>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileFaqContactLink}
          >
            Join Discord
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileFaqContactLink}
          >
            Follow on X
          </a>
        </div>
      </div>
    </div>
  )
}
