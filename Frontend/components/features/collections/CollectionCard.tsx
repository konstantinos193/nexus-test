"use client";

/**
 * CollectionCard – The first thing a user sees before deciding whether to care.
 * It's a card. It has an image, a status badge, a price, a supply count, and
 * a progress bar that slowly fills with the hopes and dreams of a creator.
 * (And the disappointment of 6,000 unsold NFTs. But we don't label that.)
 *
 * If this component breaks, users see nothing. Just vibes and a blank grid.
 * That would be bad. Please don't break this component.
 *
 * @author Juan – The developer who built this digital first impression
 * (Coded with care, dread, and the knowledge that someone will judge the font size)
 */

// Next.js navigation — the sacred Link that carries users to their financial decisions
import Link from "next/link";
// Next.js image optimizer — because raw <img> tags are for people who enjoy CLS scores of 0.4
import Image from "next/image";
// The holy NFTCollection type — if this shape is wrong, everything below is lies
import { NFTCollection } from "@/types";
// The CSS module — visual identity for this card, all scoped so nothing bleeds out
import styles from "./CollectionCard.module.css";

/** Props: just the collection. That's it. That's the whole API. Simple is underrated. */
interface CollectionCardProps {
  collection: NFTCollection;
}

// IPFS gateway — the middleman between us and a distributed filesystem that was
// absolutely not designed for NFT thumbnail loading at 3am. Fallback included.
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs-gateway.nexus-web3.com/ipfs/";

/**
 * Converts IPFS URIs to HTTP gateway URLs so browsers can actually load them.
 * IPFS is decentralized and beautiful. HTTP gateways are the ugly translator.
 * (Without this function, every image is a broken icon. We've been there. We don't go back.)
 */
function resolveUrl(url?: string | null): string | null {
  if (!url) return null;
  // If it's an ipfs:// URI, prepend gateway and strip the protocol prefix
  if (url.startsWith("ipfs://")) return `${IPFS_GATEWAY}${url.slice(7)}`;
  // Otherwise it's already a normal URL — bless its heart, nothing to do
  return url;
}

/**
 * Maps internal collection status to a display-friendly tristate.
 * "minting" → "live" because users understand "live", not "minting"
 * "ready" / "preparing" → "upcoming" because we're optimistic like that
 * Everything else → "ended" because entropy wins eventually
 */
function getDisplayStatus(status: NFTCollection["status"]): "live" | "upcoming" | "ended" {
  if (status === "minting") return "live";
  if (status === "ready" || status === "preparing") return "upcoming";
  // "completed", "paused", "draft" — they all go here. The graveyard of statuses.
  return "ended";
}

/**
 * Formats a SOL amount for the price chip.
 * Whole numbers stay clean ("3"), fractional values get up to 2 decimals with no
 * trailing zeros ("2.99", "0.5"). Because "3.00 SOL" is technically correct but
 * spiritually noisy. 0 / undefined is handled by the caller as "Free".
 */
function formatSol(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Truncates a long Solana address to 4+4 characters for display.
 * "Abc1...xyz9" — enough to verify you're looking at the right address if you squint.
 * (Nobody reads the full address anyway. This is just vibes security.)
 */
function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

/**
 * CollectionCard – The actual component. Click it, explore it, maybe mint something.
 * Or don't. Juan doesn't judge. (He does. But he won't say anything.)
 */
export function CollectionCard({ collection }: CollectionCardProps) {
  // Derive the display status from the raw backend status value
  const displayStatus = getDisplayStatus(collection.status);

  // Mint progress as a percentage — capped implicitly by totalSupply > 0 guard
  // (If totalSupply is 0, the project isn't real yet. Or it's a trap. Both are possible.)
  const mintProgress = collection.totalSupply > 0
    ? (collection.minted / collection.totalSupply) * 100
    : 0;

  // Prefer the main image, fall back to banner — something has to show on this card
  const imageUrl = resolveUrl(collection.imageUrl) || resolveUrl(collection.bannerUrl);

  // The all-in price the buyer pays (base mint price + additive platform fee) is computed
  // server-side and handed to us ready to render — no fee math in the frontend. `buyerPrice`
  // is the source of truth; `price` is the fallback for older payloads.
  const displayPrice = collection.buyerPrice ?? collection.price ?? 0;
  // Base price drives the disclosure tooltip only (label, not price derivation).
  const basePrice = collection.mintPrice ?? collection.price ?? 0;

  // The creator's wallet — the address we display and link out to. creatorAddress is the
  // authoritative one; `creator` is the legacy fallback (currently the same value).
  const creatorWallet = collection.creatorAddress || collection.creator || "";
  const creatorDisplay = creatorWallet ? truncateAddress(creatorWallet) : "Unknown";

  /**
   * If the image fails to load (IPFS timeout, 404, pure chaos), fall back to
   * the server-generated banner via API route. At least it has the right name on it.
   * "Click and pray" is not a launch strategy, but it's all we have for IPFS images.
   */
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=600&h=400`;
  };

  /**
   * Open the creator's wallet on Solscan. Stops propagation so the click hits the
   * creator pill (z-index above the stretched link) and NOT the card's drop link.
   */
  const openSolscan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (creatorWallet) window.open(`https://solscan.io/account/${creatorWallet}`, "_blank");
  };

  // Status label — if/else beats nested ternary every time (the linter agrees)
  let statusLabel = "Ended";
  if (displayStatus === "live") statusLabel = "Live";
  else if (displayStatus === "upcoming") statusLabel = "Upcoming";

  return (
    <article className={styles.card}>
      {/* Stretched link = the whole-card click target. Sits BEHIND the creator pill so
          the creator pill can intercept its own clicks. No grid-overlay hacks. */}
      <Link
        href={`/drops/${collection.slug ?? collection.id}`}
        className={styles.stretchedLink}
        aria-label={`View ${collection.name}`}
      />

      <div className={styles.media}>
        <img
          src={imageUrl ?? `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=600&h=400`}
          alt={collection.name}
          className={styles.image}
          loading="lazy"
          onError={handleImageError}
        />

        <span className={`${styles.badge} ${styles[`badge_${displayStatus}`]}`}>
          {displayStatus === "live" && <span className={styles.dot} />}
          {statusLabel}
        </span>

        <span
          className={styles.priceChip}
          title={displayPrice > 0 ? `Base ${formatSol(basePrice)} SOL + platform fee = ${formatSol(displayPrice)} SOL` : undefined}
        >
          {displayPrice > 0 ? (
            <>
              {formatSol(displayPrice)}
              <Image src="/svg/solana-sol-logo.svg" alt="SOL" width={11} height={11} unoptimized className={styles.solIcon} />
            </>
          ) : (
            "Free"
          )}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{collection.name}</h3>

        {/* Creator pill — kept wallet + icon. z-index above the stretched link. */}
        <button type="button" className={styles.creator} onClick={openSolscan} title={creatorWallet}>
          <Image src="/svg/solana-sol-logo.svg" alt="" width={12} height={12} unoptimized className={styles.creatorIcon} />
          {creatorDisplay}
        </button>

        <div className={styles.supplyRow}>
          <span className={styles.supplyLabel}>Minted</span>
          <span className={styles.supplyValue}>
            {collection.minted.toLocaleString("en-US")} / {collection.totalSupply.toLocaleString("en-US")}
          </span>
        </div>

        {displayStatus === "live" && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${mintProgress}%` }} />
            </div>
            <span className={styles.progressLabel}>{mintProgress.toFixed(1)}% minted</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default CollectionCard;

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — first impressions matter. (Unlike second ones, but we don't talk about those.)
// ─────────────────────────────────────────────────────────────────────────────
