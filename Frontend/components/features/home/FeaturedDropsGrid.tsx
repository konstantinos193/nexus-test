'use client'

import Image from 'next/image'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import { avatarUrl } from '@/lib/utils/avatarUrl'
import styles from './FeaturedDropsGrid.module.css'

interface FeaturedDropsGridProps {
  collections?: NFTCollection[]
}

export default function FeaturedDropsGrid({ collections = [] }: FeaturedDropsGridProps) {
  const displayCollections = collections.filter(c => c.status === 'minting').slice(0, 2)

  if (displayCollections.length === 0) {
    return null
  }

  return (
    <section className={styles.featuredDropsSection}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {displayCollections.map((collection) => {
            const mintingPercentage = collection.totalSupply > 0
              ? ((collection.minted / collection.totalSupply) * 100).toFixed(1)
              : '0'
            const bannerSrc = placeholderBannerUrl(collection.id, collection.name, 600, 400)

            return (
              <Link
                key={collection.id}
                href={`/drops/${collection.slug ?? collection.id}`}
                className={styles.dropCard}
              >
                <div className={styles.card}>
                  <div className={styles.imageSection}>
                    <div className={styles.imageWrapper}>
                      <img
                        src={bannerSrc}
                        alt={`${collection.name} banner`}
                        className={styles.bannerImage}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>

                  <div className={styles.contentSection}>
                    <div className={styles.header}>
                      <h2 className={styles.collectionName}>{collection.name}</h2>
                      {collection.status === 'minting' && (
                        <div className={styles.liveBadge}>
                          <div className={styles.liveDotContainer}>
                            <div className={styles.liveDot}></div>
                            <div className={styles.liveDotPing}></div>
                          </div>
                          <span>Live</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.creatorInfo}>
                      <div className={styles.creatorAvatar}>
                        <img
                          src={avatarUrl(collection.creator, 16)}
                          alt="creator avatar"
                          width={16}
                          height={16}
                          className={styles.avatarImage}
                          loading="lazy"
                        />
                      </div>
                      <span className={styles.creatorName}>{collection.creator}</span>
                    </div>

                    <div className={styles.mintingStats}>
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>Price</span>
                        <div className={styles.statValueWithIcon}>
                          <span className={styles.statValue}>
                            {collection.price === 0 || collection.price == null
                              ? 'Free'
                              : collection.price.toFixed(2)}
                          </span>
                          <Image
                            src="/svg/solana-sol-logo.svg"
                            alt="SOL"
                            width={14}
                            height={14}
                            className={styles.statSolanaIcon}
                          />
                        </div>
                      </div>
                      <div className={styles.statDivider}></div>

                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>Minted</span>
                        <span className={styles.statValue}>
                          {mintingPercentage}%
                        </span>
                      </div>
                      <div className={styles.statDivider}></div>

                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>Supply</span>
                        <span className={styles.statValue}>
                          {collection.totalSupply.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
