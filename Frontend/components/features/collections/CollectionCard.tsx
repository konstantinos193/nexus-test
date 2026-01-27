"use client";

/**
 * CollectionCard Component - The card that makes collections look good
 * Modern card design with banner, status badges, and progress indicators
 * Because collections deserve to shine (and we're not going to be boring)
 * 
 * Uses CSS modules - no global dependencies (because we're independent like that)
 * 
 * @author Juan - The developer who built this card
 * (Coded with care, humor, and probably too much coffee)
 */

import Link from "next/link";
import Image from "next/image";
import { NFTCollection } from "@/types";
import { getBannerPalette } from "@/lib/utils/placeholderBanners";
import styles from "./CollectionCard.module.css";

interface CollectionCardProps {
  collection: NFTCollection;
}

/**
 * Maps NFTCollection status to display status
 * Because our internal statuses are boring, but display statuses are exciting
 */
function getDisplayStatus(status: NFTCollection["status"]): "live" | "upcoming" | "ended" {
  if (status === "minting") return "live";
  if (status === "ready" || status === "preparing") return "upcoming";
  return "ended";
}

/**
 * Formats price for display
 * Because showing "0" for free mints is less confusing than showing nothing
 */
function formatPrice(price?: number): string | null {
  if (!price || price === 0) return "Free";
  return price.toFixed(2);
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const displayStatus = getDisplayStatus(collection.status);
  const mintProgress = collection.totalSupply > 0 
    ? (collection.minted / collection.totalSupply) * 100 
    : 0;
  
  // Get banner image URL - use bannerUrl if available, fallback to imageUrl
  const bannerImageUrl = collection.bannerUrl || collection.imageUrl;
  
  // Format creator name (fallback to address if no name)
  const creatorName = collection.creator || "Unknown";
  const creatorInitials = creatorName.slice(0, 2).toUpperCase();

  // Handle image load error - fallback to placeholder
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    console.warn(`Failed to load image: ${target.src} for collection: ${collection.name}`);
    // If image fails to load, try using placeholder API
    if (bannerImageUrl && !target.src.includes('/api/images/banner')) {
      const placeholderUrl = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`;
      target.src = placeholderUrl;
    } else {
      // If placeholder also fails, keep trying with a default
      target.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`;
    }
  };

  return (
    <Link href={`/drops/${collection.slug ?? collection.id}`}>
      <article className={styles.card}>
        {/* Banner Section */}
        <div className={styles.banner}>
          {/* Banner Image */}
          {bannerImageUrl ? (
            <img
              src={bannerImageUrl}
              alt={collection.name}
              className={styles.bannerImage}
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            // Fallback to placeholder if no image URL
            <img
              src={`/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=400&h=400`}
              alt={collection.name}
              className={styles.bannerImage}
              loading="lazy"
            />
          )}

          {/* Status Badge */}
          <div className={styles.statusBadge}>
            {displayStatus === "live" && (
              <div className={styles.badgeLive}>
                <span className={styles.statusDot} />
                <span className={styles.badgeText}>Live</span>
              </div>
            )}
            {displayStatus === "upcoming" && (
              <div className={styles.badgeUpcoming}>
                <span className={styles.badgeText}>Upcoming</span>
              </div>
            )}
            {displayStatus === "ended" && (
              <div className={styles.badgeEnded}>
                <span className={styles.badgeText}>Ended</span>
              </div>
            )}
          </div>

          {/* Gradient overlay at bottom */}
          <div className={styles.bannerOverlay} />
        </div>

        {/* Content Section */}
        <div className={styles.content}>
          {/* Collection name and creator */}
          <div className={styles.header}>
            <h3 className={styles.collectionName}>
              {collection.name}
            </h3>
            <div className={styles.creator}>
              <div className={styles.avatar}>
                {creatorInitials}
              </div>
              <span className={styles.creatorText}>
                by{" "}
                <span className={styles.creatorName}>{creatorName}</span>
              </span>
            </div>
          </div>

          {/* Stats Grid */}
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

          {/* Progress section - Always reserved space for consistent card height */}
          <div className={styles.progressPlaceholder}>
            {displayStatus === "live" ? (
              <>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${mintProgress}%` }}
                  />
                </div>
                <p className={styles.progressText}>
                  {mintProgress.toFixed(1)}% minted
                </p>
              </>
            ) : displayStatus === "upcoming" && collection.endDate ? (
              <div className={styles.mintDate}>
                <span className={styles.mintDateLabel}>Mint starts:</span>
                <span className={styles.mintDateValue}>
                  {new Date(collection.endDate).toLocaleDateString()}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

// Default export for compatibility with lazy loading and various import styles
// Because sometimes you need both named and default exports (like having both cake and eating it)
export default CollectionCard;

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Cards: making collections look good since... today. 🎴
