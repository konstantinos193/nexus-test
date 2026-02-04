'use client'

/**
 * DashboardCollectionCard - Creator's collection card with Edit action
 * For /dashboard: shows collection + Edit/Continue button
 * Draft → /create (resume). Deployed → /create/edit/[id]
 */

import Link from 'next/link'
import Image from 'next/image'
import { Pencil } from 'lucide-react'
import { NFTCollection } from '@/types'
import styles from './CollectionCard.module.css'
import dashboardStyles from './DashboardCollectionCard.module.css'

function getDisplayStatus(status: NFTCollection['status']): 'live' | 'upcoming' | 'ended' | 'draft' {
  if (status === 'draft') return 'draft'
  if (status === 'minting') return 'live'
  if (status === 'ready' || status === 'preparing') return 'upcoming'
  return 'ended'
}

function formatPrice(price?: number): string | null {
  if (!price || price === 0) return 'Free'
  return price.toFixed(2)
}

interface DashboardCollectionCardProps {
  collection: NFTCollection
}

export default function DashboardCollectionCard({ collection }: DashboardCollectionCardProps) {
  const displayStatus = getDisplayStatus(collection.status)
  const mintProgress =
    collection.totalSupply > 0 ? (collection.minted / collection.totalSupply) * 100 : 0
  const bannerImageUrl = collection.bannerUrl || collection.imageUrl
  const creatorName = collection.creator || 'Unknown'
  const creatorInitials = creatorName.slice(0, 2).toUpperCase()

  const isDraft = collection.status === 'draft'
  const editHref = isDraft ? '/create' : `/create/edit/${collection.id}`

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget
    if (bannerImageUrl && !target.src.includes('/api/images/banner')) {
      target.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`
    } else {
      target.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`
    }
  }

  return (
    <article className={`${styles.card} ${dashboardStyles.dashboardCard}`}>
      <Link href={`/drops/${collection.slug ?? collection.id}`} className={dashboardStyles.cardLink}>
        <div className={styles.banner}>
          {bannerImageUrl ? (
            <img
              src={bannerImageUrl}
              alt={collection.name}
              className={styles.bannerImage}
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <img
              src={`/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`}
              alt={collection.name}
              className={styles.bannerImage}
              loading="lazy"
            />
          )}
          <div className={styles.statusBadge}>
            {displayStatus === 'draft' && (
              <div className={dashboardStyles.badgeDraft}>
                <span className={dashboardStyles.badgeText}>Draft</span>
              </div>
            )}
            {displayStatus === 'live' && (
              <div className={styles.badgeLive}>
                <span className={styles.statusDot} />
                <span className={styles.badgeText}>Live</span>
              </div>
            )}
            {displayStatus === 'upcoming' && (
              <div className={styles.badgeUpcoming}>
                <span className={styles.badgeText}>Upcoming</span>
              </div>
            )}
            {displayStatus === 'ended' && (
              <div className={styles.badgeEnded}>
                <span className={styles.badgeText}>Ended</span>
              </div>
            )}
          </div>
          <div className={styles.bannerOverlay} />
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.collectionName}>{collection.name}</h3>
            <div className={styles.creator}>
              <div className={styles.avatar}>{creatorInitials}</div>
              <span className={styles.creatorText}>
                by <span className={styles.creatorName}>{creatorName}</span>
              </span>
            </div>
          </div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Price</p>
              <div className={styles.statValueContainer}>
                <span className={styles.statValue}>{formatPrice(collection.price)}</span>
                <Image
                  src="/svg/solana-sol-logo.svg"
                  alt="SOL"
                  width={12}
                  height={12}
                  className={styles.solIcon}
                  unoptimized
                />
              </div>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Supply</p>
              <p className={styles.statValue}>
                {collection.minted.toLocaleString()} / {collection.totalSupply.toLocaleString()}
              </p>
            </div>
          </div>
          <div className={styles.progressPlaceholder}>
            {displayStatus === 'live' ? (
              <>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${mintProgress}%` }} />
                </div>
                <p className={styles.progressText}>{mintProgress.toFixed(1)}% minted</p>
              </>
            ) : displayStatus === 'upcoming' && collection.endDate ? (
              <div className={styles.mintDate}>
                <span className={styles.mintDateLabel}>Mint starts:</span>
                <span className={styles.mintDateValue}>
                  {new Date(collection.endDate).toLocaleDateString()}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
      <Link
        href={editHref}
        className={dashboardStyles.editButton}
        title={isDraft ? 'Continue editing' : 'Edit collection'}
      >
        <Pencil className={dashboardStyles.editIcon} />
        <span className={dashboardStyles.editLabel}>{isDraft ? 'Continue' : 'Edit'}</span>
      </Link>
    </article>
  )
}
