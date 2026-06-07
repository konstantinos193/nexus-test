'use client'

/**
 * CollectionHero – The full-bleed banner, floating PFP, name, status badge, and social links.
 * This is the identity section. It answers: who made this, what is it, and is it live?
 * The mint button is NOT here. That lives in MintInteractionModule, sticky on the right.
 * (If you are looking for the mint button, you are in the wrong component. Go next door.)
 *
 * Image loading strategy: if the IPFS image fails (and it will — IPFS timeouts are
 * a fact of life, like taxes and JavaScript fatigue), we hide it and show a gradient fallback.
 * This is not a bug. This is a feature. The feature is "not looking broken."
 *
 * @author Juan – The developer who finally gave banners the full width they deserve
 * (Coded with care, existential dread, and a deep appreciation for object-fit: cover)
 */

// useState — for the "Copied!" feedback state when the user copies the creator address
// useCallback — memoized clipboard handler so it doesn't get recreated on every render
import { useState, useCallback } from 'react'
// CollectionDetail type — the full shape of a collection on its detail page
import type { CollectionDetail } from '@/types'

// IPFS gateway — the HTTP proxy to a distributed filesystem.
// Without this, ipfs:// URIs are unusable in browsers. The browsers are not sorry about that.
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://ipfs-gateway.nexus-web3.com/ipfs/'

/**
 * Converts IPFS URIs to HTTP gateway URLs.
 * Same function pattern as in CollectionCard — yes, it's duplicated.
 * (It's a two-liner. Extracting it to a shared util is a yak that hasn't been shaved yet.)
 */
function resolveUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
  return url
}

/** Props: just the collection. The hero is a display component — it doesn't do commerce. */
export interface CollectionHeroProps {
  collection: CollectionDetail
}

/**
 * Shortens a Solana address to 5+5 format for display.
 * Full addresses are 44 characters. Nobody wants 44 characters in a hero section.
 * "Abc12...xyz89" is enough to identify and verify at a glance. (If you squint.)
 */
function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 5)}...${addr.slice(-5)}`
}

// The gradient fallback for when banner images fail or aren't provided.
// Deep dark blue-on-blue — matches the platform aesthetic and hides the absence gracefully.
const BANNER_FALLBACK = 'linear-gradient(135deg, #0d0d1a 0%, #141428 50%, #0d0d1a 100%)'

/**
 * Hides a broken img element and reveals the sibling placeholder div.
 * Called via onError — when IPFS times out, we swap to the gradient fallback.
 * The placeholder must be the img's immediate nextElementSibling for this to work.
 * (Fragile? Yes. But the DOM structure is controlled here so we can make that promise.)
 */
function hideBrokenImg(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  img.style.display = 'none'  // Hide the broken image
  const placeholder = img.nextElementSibling as HTMLElement | null
  if (placeholder) placeholder.style.display = 'block'  // Show the gradient fallback
}

/**
 * CollectionHero — The identity layer of a collection's detail page.
 * Banner. PFP. Name. Status. Creator. Socials. In that order. No mint button.
 * (The mint button is in MintInteractionModule. This was established above. Please read the file header.)
 */
// eslint-disable-next-line complexity
export default function CollectionHero({ collection }: CollectionHeroProps) {
  // copied: shows "✓" in the creator address chip for 1.8 seconds after copying
  const [copied, setCopied] = useState(false)
  // pfpFailed: true when the PFP image fails to load — triggers the initials fallback
  const [pfpFailed, setPfpFailed] = useState(false)

  // ── Status Derivation ───────────────────────────────────────────────────────
  // Map the internal collection.status to a display label and a CSS class modifier
  // "minting" → "Live" (green), "completed" → "Ended" (gray), others → "Upcoming" (amber)
  let statusLabel: string | null
  if (collection.status === 'minting') statusLabel = 'Live'
  else if (collection.status === 'completed') statusLabel = 'Ended'
  else if (collection.status === 'ready' || collection.status === 'preparing') statusLabel = 'Upcoming'
  else statusLabel = null  // Unknown status — hide the badge entirely rather than show something wrong

  // CSS class modifier for the status badge — determines the color treatment
  let statusClass: string
  if (collection.status === 'minting') statusClass = 'live'
  else if (collection.status === 'completed') statusClass = 'ended'
  else statusClass = 'upcoming'

  /**
   * Copies the creator's Solana address to clipboard.
   * Shows a visual confirmation ("✓") for 1.8 seconds.
   * If the clipboard API is unavailable (HTTP, restricted context, etc.), fails silently.
   * (Silent failure is correct here — no error toast for a clipboard operation.)
   */
  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(collection.creatorAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)  // Reset after 1.8s — long enough to notice, short enough to not linger
    } catch {
      // clipboard unavailable — HTTP context, iframe, or old browser. Graceful no-op.
    }
  }, [collection.creatorAddress])

  return (
    <section className="cp-hero">

      {/* ── Full-Bleed Banner ─────────────────────────────────────────────────
          No container wrapping — this bleeds to the full viewport width.
          The overlay gradient at the bottom is handled in CSS via cp-hero-banner::after. */}
      <div className="cp-hero-banner">
        {/* Banner image — loaded from IPFS or direct URL.
            onError hides this and shows the gradient fallback below.
            Empty src is intentional when no banner URL is available — triggers immediate onError. */}
        <img
          src={resolveUrl(collection.bannerUrl) ?? ''}
          alt=""  // Decorative image — empty alt is correct, no screen reader content needed
          onError={hideBrokenImg}
          // If no banner URL at all, hide immediately — don't render a broken img placeholder
          style={collection.bannerUrl ? {} : { display: 'none' }}
        />

        {/* Gradient fallback div — the sibling that hideBrokenImg reveals.
            Block by default when no bannerUrl, hidden when bannerUrl exists (image handles it). */}
        <div
          style={{
            display: collection.bannerUrl ? 'none' : 'block',
            width: '100%',
            height: '100%',
            background: BANNER_FALLBACK,
          }}
        />

        {/* Status badge — floats top-right over the banner via absolute positioning in CSS.
            Only rendered if we have a meaningful status to display. */}
        {statusLabel && (
          <div className={`cp-hero-status ${statusClass}`}>
            {/* The pulse dot — CSS animation defined in the collection-page stylesheet */}
            <span className="cp-hero-status-dot" />
            {statusLabel}
          </div>
        )}
      </div>

      {/* ── Info Row ────────────────────────────────────────────────────────────
          PFP + name + creator + socials, constrained to the page container width.
          The cp-container class gives this content the same horizontal margins as the page body. */}
      <div className="cp-container">
        <div className="cp-hero-info">
          <div className="cp-hero-info-inner">

            {/* PFP — the collection's profile picture, overlapping the banner bottom via negative margin-top.
                Falls back to an initials circle when imageUrl is missing or fails to load. */}
            <div className="cp-hero-pfp">
              {!pfpFailed && collection.imageUrl ? (
                <img
                  src={resolveUrl(collection.imageUrl) ?? ''}
                  alt={collection.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={() => setPfpFailed(true)}
                />
              ) : (
                <span className="cp-hero-pfp-initial">
                  {collection.name[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>

            <div className="cp-hero-text">

              {/* ── Name + Verified Badge ──────────────────────────────────── */}
              <div className="cp-hero-name-row">
                {/* The collection name — the most important text on this page */}
                <h1 className="cp-hero-name">{collection.name}</h1>
                {/* Verified checkmark — only shown if the collection has been verified by the platform.
                    Most collections are not verified. The checkmark means something here. */}
                {collection.verified && (
                  <span className="cp-hero-verified" aria-label="Verified collection">
                    ✓
                  </span>
                )}
              </div>

              {/* ── Creator Row ────────────────────────────────────────────── */}
              {/* "By [human name] [address chip]" — shows the creator's identity */}
              <div className="cp-hero-creator">
                <span>By</span>
                {/* Show the human-readable creator name if it differs from the raw address.
                    If creator == creatorAddress, the name IS the address — skip the duplicate. */}
                {collection.creator && collection.creator !== collection.creatorAddress && (
                  <span style={{ color: 'var(--cp-text)', fontWeight: 600 }}>
                    {collection.creator}
                  </span>
                )}
                {/* The address chip — always shortened, always copyable, always in the DOM */}
                <button
                  type="button"
                  className="cp-creator-chip"
                  onClick={copyAddress}
                  title={collection.creatorAddress}  // Full address on hover for the paranoid
                  aria-label="Copy creator address"
                >
                  {shortAddr(collection.creatorAddress)}
                  {/* Copy icon — ⎘ for "copy", ✓ for "copied". Small victory, big UX. */}
                  <span className="cp-copy-btn">{copied ? '✓' : '⎘'}</span>
                </button>
              </div>

              {/* ── Social Links ────────────────────────────────────────────── */}
              {/* Only rendered if at least one social URL exists — no ghost icons */}
              {(collection.twitterUrl || collection.discordUrl || collection.websiteUrl || collection.secondaryMarketUrl) && (
                <div className="cp-hero-socials">
                  {/* Twitter/X — the one social link every NFT project has */}
                  {collection.twitterUrl && (
                    <a
                      href={collection.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-social-btn"
                      aria-label="X (Twitter)"
                    >
                      {/* X logo — the new Twitter mark, because rebranding is forever */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}

                  {/* Discord — where the community lives, argues, and occasionally posts art */}
                  {collection.discordUrl && (
                    <a
                      href={collection.discordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-social-btn"
                      aria-label="Discord"
                    >
                      {/* Discord "D" mark — inline SVG because image dependencies are a trap.
                          This SVG path is canonical. If it breaks, it's a Discord brand problem, not ours. */}
                      <svg width="14" height="14" viewBox="0 0 126.644 96" fill="currentColor">
                        <path d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"/>
                      </svg>
                    </a>
                  )}

                  {collection.websiteUrl && (
                    <a
                      href={collection.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-social-btn"
                      aria-label="Website"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </a>
                  )}

                  {/* Secondary market link — Magic Eden, Tensor, wherever this collection trades */}
                  {collection.secondaryMarketUrl && (
                    <a
                      href={collection.secondaryMarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-social-btn"
                      aria-label="Secondary market"
                    >
                      {/* External link icon — a box with an arrow pointing out of it.
                          Universal symbol for "this goes somewhere else." */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan – The developer who finally gave banners the full width they deserve.
// (object-fit: cover was always the answer. It just took the right component to ask the question.)
// ─────────────────────────────────────────────────────────────────────────────
