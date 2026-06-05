'use client'

import { useState } from 'react'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { CollectionCard } from '../collections/CollectionCard'
import { useDiscoverCollections } from '@/hooks/useCollections'
import { getDiscoverCollectionsByTab } from '@/lib/data/collections'
import styles from './DiscoverSection.module.css'

type DiscoverTab = 'trending' | 'new' | 'ending_soon' | 'free_mint'

const TABS: { id: DiscoverTab; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'ending_soon', label: 'Ending Soon' },
  { id: 'free_mint', label: 'Free Mint' },
]

const MAX_DISPLAY = 6

export default function DiscoverSection() {
  const [activeTab, setActiveTab] = useState<DiscoverTab>('trending')

  const { data: apiCollections = [] } = useDiscoverCollections(activeTab)
  const collections =
    apiCollections && apiCollections.length > 0
      ? apiCollections
      : getDiscoverCollectionsByTab(activeTab)

  const display = collections.slice(0, MAX_DISPLAY)

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Discover</h3>

          <div className={styles.tabs} role="tablist">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.grid} role="tabpanel">
          {display.length === 0 ? (
            <p className={styles.empty}>
              No collections in this category yet. Check back soon!
            </p>
          ) : (
            display.map((collection: NFTCollection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))
          )}
        </div>

        <div className={styles.footer}>
          <Link href="/collections" className={styles.browseAll}>
            Browse all collections
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
