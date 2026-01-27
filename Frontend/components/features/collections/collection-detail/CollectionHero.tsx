'use client'

/**
 * CollectionHero – Hero section for NFT Collection detail page.
 * Banner, logo, name, verified, creator, mint status, price/supply, primary actions.
 * Mint button states: Connect Wallet → Mint → Sold Out. Optional countdown.
 */

import Image from 'next/image'
import type { CollectionDetail } from '@/types'

export interface CollectionHeroProps {
  collection: CollectionDetail
  /** Whether wallet is connected (drives mint button state) */
  isWalletConnected?: boolean
  onMint?: () => void
  onSecondaryMarket?: () => void
}

export default function CollectionHero({
  collection,
  isWalletConnected = false,
  onMint,
  onSecondaryMarket,
}: CollectionHeroProps) {
  const statusLabel =
    collection.status === 'minting'
      ? 'Mint Live'
      : collection.status === 'completed'
        ? 'Sold Out'
        : 'Upcoming'
  const statusClass =
    collection.status === 'completed'
      ? 'cp-hero-badge sold-out'
      : collection.status === 'minting'
        ? 'cp-hero-badge'
        : 'cp-hero-badge upcoming'

  const mintDisabled = collection.status === 'completed'
  const mintLabel = !isWalletConnected
    ? 'Connect Wallet'
    : collection.status === 'completed'
      ? 'Sold Out'
      : 'Mint'

  return (
    <section className="cp-hero">
      <div className="cp-container">
        <div className="cp-hero-banner-wrap">
          {/* 16:9 banner – video or image */}
          {collection.bannerUrl ? (
            <img
              src={collection.bannerUrl}
              alt={`${collection.name} banner`}
              className="cp-hero-banner"
            />
          ) : (
            <div className="cp-hero-banner" style={{ background: '#111118' }} />
          )}
        </div>

        <div className="cp-hero-body">
          <img
            src={collection.imageUrl}
            alt=""
            className="cp-hero-logo"
            width={80}
            height={80}
          />
          <div className="cp-hero-meta">
            <div className="cp-hero-title-row">
              <h1 className="cp-hero-title">{collection.name}</h1>
              {collection.verified && (
                <span className="cp-hero-verified" aria-label="Verified">
                  Verified ✔
                </span>
              )}
            </div>
            <p className="cp-hero-creator">
              By <span>{collection.creator}</span>
            </p>

            <div className="cp-hero-badges">
              <span className={statusClass}>{statusLabel}</span>
              {collection.status === 'ready' && collection.mintStart && (
                <span className="cp-countdown">Countdown (optional)</span>
              )}
            </div>

            <div className="cp-hero-stats">
              <span>
                Mint Price: <strong>◎ {collection.price ?? 0}</strong>
              </span>
              <span>
                Total Supply: <strong>{collection.totalSupply.toLocaleString()}</strong>
              </span>
              <span>
                Minted: <strong>{collection.minted.toLocaleString()} / {collection.totalSupply.toLocaleString()}</strong>
              </span>
            </div>

            <div className="cp-hero-actions">
              <button
                type="button"
                className="cp-hero-btn cp-hero-btn-primary"
                disabled={mintDisabled}
                onClick={onMint}
              >
                {mintLabel}
              </button>
              {collection.secondaryMarketUrl && (
                <a
                  href={collection.secondaryMarketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cp-hero-btn cp-hero-btn-secondary"
                >
                  Secondary Market
                </a>
              )}
              {collection.discordUrl && (
                <a
                  href={collection.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cp-hero-btn cp-hero-btn-secondary cp-hero-btn-icon"
                  aria-label="Discord"
                >
                  <Image
                    src="/svg/Discord-Symbol-White.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                </a>
              )}
              {collection.twitterUrl && (
                <a
                  href={collection.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cp-hero-btn cp-hero-btn-secondary cp-hero-btn-icon"
                  aria-label="X (Twitter)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
