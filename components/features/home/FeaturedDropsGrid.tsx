'use client'

import Image from 'next/image'
import Link from 'next/link'
import { NFTCollection } from '@/types'
import { featuredCollections } from '@/lib/data/collections'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import { avatarUrl } from '@/lib/utils/avatarUrl'
import styles from './FeaturedDropsGrid.module.css'

/**
 * Featured Drops Grid Component - The Numbers Don't Lie
 * Displays featured collections with minting statistics
 * Appears directly below the hero section carousel
 * Because users need to see the numbers (and numbers don't lie)
 * 
 * This is where the real action happens - the featured drops that are actually minting
 * Because showing completed collections is like advertising a sold-out concert
 * (And nobody wants to see that, except maybe the scalpers)
 * 
 * Features:
 * - Two-column grid layout (because one column is boring)
 * - Minting statistics (percentage, price, supply)
 * - Live status badges (because "coming soon" is not the same as "live")
 * - Collection banners with fancy color palettes (because gray is depressing)
 * - Responsive design (because mobile users matter too)
 * 
 * Shows:
 * - Collection name and creator (because credit where credit is due)
 * - Live status badge (if actually minting, not just "soon")
 * - Minting statistics (price in SOL, percentage as number, total items)
 * - Collection banner image (because visuals sell)
 * 
 * @author Juan - The developer who built this grid
 * (Coded with care, humor, and probably too much coffee)
 */

interface FeaturedDropsGridProps {
  collections?: NFTCollection[]
}

export default function FeaturedDropsGrid({ collections = [] }: FeaturedDropsGridProps) {
  // Use provided collections, filter for minting status
  // Because we only want to show collections that are actually minting
  const displayCollections = collections.filter(c => c.status === 'minting').slice(0, 2)

  // If no collections to show, don't render anything
  // Because empty grids are sadder than a birthday party with no guests
  if (displayCollections.length === 0) {
    return null
  }

  return (
    <section className={styles.featuredDropsSection}>
      <div className={styles.container}>
        {/* Grid container - displays featured drops in a responsive grid
            Because grids are clean, organized, and easy to scan
            (Unlike my desk, which is none of those things) */}
        <div className={styles.grid}>
          {displayCollections.map((collection) => {
            // Calculate minting percentage
            // Because math is hard, but percentages are easy to understand
            const mintingPercentage = collection.totalSupply > 0
              ? ((collection.minted / collection.totalSupply) * 100).toFixed(1)
              : '0'
            const bannerSrc = collection.bannerUrl || collection.imageUrl || placeholderBannerUrl(collection.id, collection.name, 600, 400)

            return (
              <Link
                key={collection.id}
                href={`/drops/${collection.slug ?? collection.id}`}
                className={styles.dropCard}
              >
                {/* Card container - the wrapper for each featured drop
                    Makes the entire card clickable (because clicking should be easy) */}
                <div className={styles.card}>
                  {/* Image section - left half of the card
                      Shows the collection banner/artwork
                      Because visuals are what draw people in */}
                  <div className={styles.imageSection}>
                    <div className={styles.imageWrapper}>
                      {/* Use regular img tag for SVG API routes - Next.js Image doesn't support API routes */}
                      <img
                        src={bannerSrc}
                        alt={`${collection.name} banner`}
                        className={styles.bannerImage}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  </div>

                  {/* Content section - right half of the card
                      Shows collection info and minting statistics
                      Because context is king (and numbers are important) */}
                  <div className={styles.contentSection}>
                    {/* Collection header - name and live status
                        Because users need to know what they're looking at
                        (And whether it's actually available) */}
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

                    {/* Creator info - who made this collection
                        Shows creator avatar and name
                        Because credit where credit is due */}
                    <div className={styles.creatorInfo}>
                      <div className={styles.creatorAvatar}>
                        {/* Use regular img tag for SVG API routes */}
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

                    {/* Minting statistics - clean inline design
                        Modern, minimal stats display
                        Because less is more (and badges are overrated) */}
                    <div className={styles.mintingStats}>
                      {/* Price – Free or X.XX, always with SOL icon */}
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

                      {/* Progress */}
                      <div className={styles.statRow}>
                        <span className={styles.statLabel}>Minted</span>
                        <span className={styles.statValue}>
                          {mintingPercentage}%
                        </span>
                      </div>
                      <div className={styles.statDivider}></div>

                      {/* Supply */}
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

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Featured drops, featured stats, featured everything.
