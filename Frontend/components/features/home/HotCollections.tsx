'use client'

import Link from 'next/link'
import { NFTCollection } from '@/types'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import styles from './HotCollections.module.css'

interface HotCollectionsProps {
  collections?: NFTCollection[]
}

export default function HotCollections({ collections = [] }: HotCollectionsProps) {
  const displayCollections = collections.slice(0, 5)

  if (displayCollections.length === 0) {
    return null
  }

  return (
    <section className={styles.hotCollectionsSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Hot Collections</h3>
          <Link href="/collections" className={styles.exploreCollectionsLink}>
            <span className={styles.exploreText}>
              <span className={styles.exploreTextMobile}>Explore</span>
              <span className={styles.exploreTextDesktop}>Explore Collections</span>
            </span>
            <svg
              className={styles.arrowIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <div className={styles.scrollContainer}>
          <div className={styles.collectionsGrid}>
            {displayCollections.map((collection, index) => {
              const rank = index + 1
              const bannerSrc = placeholderBannerUrl(collection.id, collection.name, 64, 64)

              return (
                <Link
                  key={collection.id}
                  href={`/drops/${collection.slug ?? collection.id}`}
                  className={styles.collectionItem}
                >
                  <strong className={styles.rankNumber}>{rank}</strong>

                  <div className={styles.imageContainer}>
                    <img
                      src={bannerSrc}
                      alt={collection.name}
                      className={styles.collectionImage}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div className={styles.collectionInfo}>
                    <span className={styles.collectionName}>{collection.name}</span>
                    <div className={styles.mintInfo}>
                      <span className={styles.mintedCount}>
                        {collection.minted.toLocaleString()}/{collection.totalSupply.toLocaleString()} Minted
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
