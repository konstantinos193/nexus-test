/**
 * FAQ Header Component
 * The header section for the FAQ page
 */

import styles from '@/app/faq/FAQ.module.css'

export default function FAQHeader() {
  return (
    <div className={styles.faqHeader}>
      <h1 className={styles.faqTitle}>
        Frequently Asked Questions
      </h1>
      <p className={styles.faqSubtitle}>
        Everything you need to know about NeXus NFT Launchpad. Find answers to common questions and get the support you need.
      </p>
    </div>
  )
}
