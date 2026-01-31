/**
 * Collections Page - Browse placeholder collections (Milestone 1)
 * Static grid of CollectionCards from mockCollections.
 * Styles: collections.module.css (standalone, no global dependency).
 *
 * @author Juan - The developer who built this collections page
 * (Coded with care, humor, and probably too much coffee)
 */

import Layout from '@/components/layout/Layout'
import { CollectionCard } from '@/components/features/collections/CollectionCard'
import { mockCollections } from '@/lib/data/collections'
import styles from './collections.module.css'

export default function CollectionsPage() {
  return (
    <Layout>
      <div className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>Browse Collections</h1>
              <p className={styles.heroDescription}>
                Placeholder collections. Real data in a later milestone.
              </p>
            </div>
          </div>
        </header>
        <section className={styles.content}>
          <div className={styles.contentContainer}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mockCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

// P.S. - Browse. Filter. Discover. Repeat.
