'use client'

import Link from 'next/link'
// Note: Using regular img tags for SVG API routes (Next.js Image doesn't support API routes)
import { NFTCollection } from '@/types'
import { placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import styles from './HotCollections.module.css'

/**
 * Hot Collections Component - The Trending Fire
 * Displays trending collections in a horizontal scrolling row
 * Because hot collections deserve hot presentation (and we're not talking about temperature)
 * 
 * This is where the trending action happens - the collections that are actually popular
 * Because showing unpopular collections is like advertising a party nobody came to
 * (And we're not trying to be that party)
 * 
 * Features:
 * - Horizontal scrolling row (because horizontal scrolling is satisfying on mobile)
 * - Rank numbers (because everyone wants to know who's #1)
 * - Collection thumbnails (because visuals sell, and we're selling)
 * - Minted count with Solana indicator (because blockchain matters, apparently)
 * - Responsive design (because mobile users matter too, and they scroll a lot)
 * 
 * Shows:
 * - Rank number (1, 2, 3, etc.) - because position matters
 * - Collection thumbnail image - because visuals are what draw people in
 * - Collection name - because users need to know what they're looking at
 * - Solana blockchain indicator - because blockchain matters, apparently
 * - Minted count (minted/total) - because numbers matter (and supply and demand are real)
 * 
 * Desktop: Horizontal row with spacious items
 * Because desktop users have big screens (and we're not wasting that space)
 * 
 * Mobile: Compact horizontal scrolling row
 * Because mobile screens are small (and horizontal scrolling is satisfying)
 * 
 * @author Juan - The developer who built this hot collections display
 * (Coded with care, humor, and probably too much coffee)
 * P.S. - Hot collections, hot presentation, hot everything! 🔥
 */

interface HotCollectionsProps {
  collections?: NFTCollection[]
}

export default function HotCollections({ collections = [] }: HotCollectionsProps) {
  // Use provided collections
  // Limit to 5 items max - enough to show variety without congestion
  // Because 5 is a nice number (and 10 would be too many, 3 would be too few)
  const displayCollections = collections.slice(0, 5)

  // If no collections to show, don't render anything
  // Because empty sections are sadder than a birthday party with no guests
  // (And we're not trying to be sad)
  if (displayCollections.length === 0) {
    return null
  }

  return (
    <section className={styles.hotCollectionsSection}>
      <div className={styles.container}>
        {/* Header with title and view all button
            Because every section needs a header (or it's just floating content)
            And floating content is confusing (and we're not trying to confuse anyone) */}
        <div className={styles.header}>
          {/* Section title - "Hot Collections"
              Big, bold, and impossible to miss
              Because subtlety is overrated (and titles should be obvious) */}
          <h3 className={styles.title}>Hot Collections</h3>
          {/* Explore collections link - Navigate to full collections page
              Because sometimes 5 isn't enough (and we understand that) */}
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

        {/* Scroll container - Horizontal scrolling row
            Because horizontal scrolling is satisfying (and mobile users love to swipe)
            And fitting everything in one row is impossible (so we scroll) */}
        <div className={styles.scrollContainer}>
          {/* Collections grid - Displays collections in a horizontal row
              Because grids are clean, organized, and easy to scan
              (Unlike my desk, which is none of those things) */}
          <div className={styles.collectionsGrid}>
            {displayCollections.map((collection, index) => {
              // Calculate rank (because position matters, and we're ranking them)
              const rank = index + 1
              const bannerSrc = placeholderBannerUrl(collection.id, collection.name, 64, 64)

              return (
                <Link
                  key={collection.id}
                  href={`/drops/${collection.slug ?? collection.id}`}
                  className={styles.collectionItem}
                >
                  {/* Rank number - Shows the collection's position
                      Because everyone wants to know who's #1
                      (And #5 is still better than not being on the list) */}
                  <strong className={styles.rankNumber}>{rank}</strong>

                  {/* Collection image - The visual that draws people in
                      Shows the collection thumbnail
                      Because visuals are what draw people in (and we're drawing) */}
                  <div className={styles.imageContainer}>
                    {/* Use regular img tag for SVG API routes - Next.js Image doesn't support API routes */}
                    <img
                      src={bannerSrc}
                      alt={collection.name}
                      className={styles.collectionImage}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Collection info - The information section
                      Shows collection name and minted count
                      Because context is king (and numbers are important) */}
                  <div className={styles.collectionInfo}>
                    {/* Collection name - What you're looking at
                        Because users need to know what they're looking at
                        (And names are important, apparently) */}
                    <span className={styles.collectionName}>{collection.name}</span>
                    {/* Mint info - Shows minted count
                        Because numbers matter (and supply and demand are real) */}
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

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Hot collections, hot presentation, hot everything! 🔥
