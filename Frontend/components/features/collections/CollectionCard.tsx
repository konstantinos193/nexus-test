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
 * Formats the mint price for display.
 * 0 or undefined → "Free" — because "0.00 SOL" is technically accurate but spiritually wrong.
 * Anything else → 2 decimal places and a silent SOL icon next to it.
 */
function formatPrice(price?: number): string {
  if (!price || price === 0) return "Free";
  return price.toFixed(2);
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

  // Creator address, shortened so it fits in the UI without causing a layout breakdown
  const creatorDisplay = truncateAddress(collection.creator || "Unknown");

  /**
   * If the image fails to load (IPFS timeout, 404, pure chaos), fall back to
   * the server-generated banner via API route. At least it has the right name on it.
   * "Click and pray" is not a launch strategy, but it's all we have for IPFS images.
   */
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=600&h=400`;
  };

  return (
    // The Link — every click here is a user choosing to dive deeper into this collection.
    // Hopefully they find what they're looking for. (Hopefully the collection is good.)
    <Link href={`/drops/${collection.slug ?? collection.id}`} className={styles.link}>
      <article className={styles.card}>

        {/* ── Image Section ───────────────────────────────────────────────────
            This is the visual hook. If the image is bad, the user bounces.
            If the IPFS gateway is slow, the image is blank and the user still bounces.
            We try our best. The blockchain doesn't always cooperate. */}
        <div className={styles.imageWrap}>
          <img
            // Primary src — IPFS-resolved or direct URL. Falls back on error.
            src={imageUrl ?? `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=600&h=400`}
            alt={collection.name}
            className={styles.image}
            // Lazy load because we might have 50 of these in a grid. The CPU is not a miracle worker.
            loading="lazy"
            // The safety net — generate a fallback banner if everything else fails
            onError={handleImageError}
          />

          {/* Status badge — floats over the image, judges the collection's progress in life */}
          <span className={`${styles.badge} ${styles[`badge_${displayStatus}`]}`}>
            {/* The pulsing dot — only "live" collections deserve the dot. It's earned. */}
            {displayStatus === "live" && <span className={styles.dot} />}
            {/* Human-readable status — "Live", "Upcoming", or "Ended" (RIP) */}
            {displayStatus === "live" ? "Live" : displayStatus === "upcoming" ? "Upcoming" : "Ended"}
          </span>
        </div>

        {/* ── Info Section ────────────────────────────────────────────────────
            The bottom half of the card. Numbers, names, and one small dream. */}
        <div className={styles.info}>
          {/* Collection name — the creator's pitch in a single line */}
          <h3 className={styles.name}>{collection.name}</h3>

          {/* Creator chip — opens Solscan in a new tab so the user can do their own research
              (They probably won't. But we give them the tools. We're responsible like that.) */}
          <a
            href={`https://solscan.io/account/${collection.creator}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.creator}
            // Stop propagation so the Link above doesn't fire too — one navigation at a time, please
            onClick={e => e.stopPropagation()}
          >
            {/* The Solana logo — tiny, but it carries the weight of an entire ecosystem */}
            <Image src="/svg/solana-sol-logo.svg" alt="SOL" width={10} height={10} unoptimized />
            {creatorDisplay}
          </a>

          {/* Divider — a thin line separating identity from economics */}
          <div className={styles.divider} />

          {/* ── Stats Row: Price + Supply ──────────────────────────────────── */}
          <div className={styles.stats}>
            {/* Price stat — the number that determines if users mint or walk away */}
            <div className={styles.stat}>
              <span className={styles.statLabel}>Price</span>
              <span className={styles.statValue}>
                {formatPrice(collection.price)}
                {/* Only show the SOL logo if there's actually a price — "Free SOL" would be misleading */}
                {(collection.price ?? 0) > 0 && (
                  <Image src="/svg/solana-sol-logo.svg" alt="SOL" width={10} height={10} unoptimized className={styles.solIcon} />
                )}
              </span>
            </div>

            {/* Supply stat — minted / total, separated by a non-breaking space for aesthetic reasons */}
            <div className={styles.stat}>
              <span className={styles.statLabel}>Supply</span>
              <span className={styles.statValue}>
                {collection.minted.toLocaleString()}&nbsp;/&nbsp;{collection.totalSupply.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Mint Progress Bar ───────────────────────────────────────────
              Only shown for live mints. Upcoming and ended collections
              don't need a progress bar — one has nothing to show, the other is done screaming. */}
          {displayStatus === "live" && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                {/* The fill — a visual representation of how sold-out this thing is getting */}
                <div className={styles.progressFill} style={{ width: `${mintProgress}%` }} />
              </div>
              {/* Percentage label — one decimal place because whole numbers feel like lying */}
              <span className={styles.progressLabel}>{mintProgress.toFixed(1)}% minted</span>
            </div>
          )}
        </div>

      </article>
    </Link>
  );
}

export default CollectionCard;

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — first impressions matter. (Unlike second ones, but we don't talk about those.)
// ─────────────────────────────────────────────────────────────────────────────
