/**
 * Mobile Docs Header - Compact header for mobile docs page
 */

import styles from './MobileDocs.module.css'

export default function MobileDocsHeader() {
  return (
    <div className={styles.mobileDocsHeader}>
      <h1 className={styles.mobileDocsTitle}>
        Documentation
      </h1>
      <p className={styles.mobileDocsSubtitle}>
        Learn how to create, launch, and manage NFT collections on NeXus. Guides, API reference, and best practices.
      </p>
    </div>
  )
}
