/**
 * FAQ Contact Component
 * Contact section for users who still have questions
 */

import styles from '@/app/faq/FAQ.module.css'

export default function FAQContact() {
  return (
    <div className={styles.faqContact}>
      <div className={styles.faqContactContent}>
        <h2 className={styles.faqContactTitle}>
          Still have questions?
        </h2>
        <p className={styles.faqContactText}>
          Can't find what you're looking for? Our support team is here to help. Reach out to us and we'll get back to you as soon as possible.
        </p>
        <div className={styles.faqContactLinks}>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.faqContactLink}
          >
            Join Discord
          </a>
          <span className={styles.faqContactDivider}>•</span>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.faqContactLink}
          >
            Follow on X
          </a>
        </div>
      </div>
    </div>
  )
}
