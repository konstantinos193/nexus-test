/**
 * Drop Detail Page — /drops/[slug]
 * Server Component wrapper — exports generateMetadata for per-drop SEO and social cards
 * The real interactive page lives in DropPageClient.tsx; this file is its SEO overcoat
 *
 * Why this file exists:
 * DropPageClient.tsx is a Client Component ('use client') — it needs hooks, state, countdowns
 * Client Components cannot export metadata in Next.js 13+
 * So we wrap it in a Server Component that fetches collection data and generates metadata
 * Then we hand off to the client component for everything interactive
 *
 * This is the "dress for the occasion" approach to SEO:
 * Google doesn't mint NFTs, but it judges your page. Every. Single. Time.
 * A drop with a proper OG image and description gets shared. A drop without one gets ignored.
 * We've seen the difference in click-through rates. We choose the OG image.
 *
 * Data fetching strategy:
 * - Server-side fetch at request time (not build time — drops are dynamic)
 * - ISR revalidation every 60 seconds (edits propagate without full redeploys)
 * - Graceful fallback when backend is down or collection doesn't exist
 * - DropPageClient refetches via the frontend API route — two fetches, one page
 *   (Yes, it fetches twice. Server fetch for metadata. Client fetch for interactive state.
 *   The alternative is prop-drilling through a client component boundary. We chose two fetches.)
 *
 * @author Juan - The developer who added SEO to the drop page so Twitter previews look good
 * (Because a blank preview card on Twitter is worse than no preview at all)
 */

// Metadata type — Next.js's type contract for the object returned by generateMetadata
// Using Metadata (not MetadataRoute.Robots etc.) — this is the page-level metadata type
import type { Metadata } from 'next'

// SEO config — the full brand identity kit
// siteName: for OG metadata. siteDescription: fallback when collection lacks one.
// siteUrl: for metadataBase. twitterHandle: for Twitter card attribution.
// absoluteUrl: for canonical and OG URLs. pageTitle: for formatted title strings.
import {
  siteName,
  siteDescription,
  siteUrl,
  twitterHandle,
  absoluteUrl,
  pageTitle,
} from '@/lib/seo/config'

// DropPageClient — the interactive drop detail page (Client Component)
// This server file exists entirely to wrap DropPageClient with proper SEO metadata
// It's like hiring a PR agent for an artist: the artist does the work, the agent handles the image
import DropPageClient from './DropPageClient'

// NFTCollection type — the shape of collection data from the API
// Used to type the fetchCollection return value and the metadata generation
import type { NFTCollection } from '@/types'

// ── Configuration ─────────────────────────────────────────────────────────────
// BACKEND_URL — the API base URL, from environment variables
// Defaults to localhost for local development; set in production env
// This is the URL the server hits directly (not the frontend API proxy route)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

// ── Server-Side Data Fetching ─────────────────────────────────────────────────

/**
 * fetchCollection - Server-side fetch for collection metadata
 * Called by generateMetadata to get collection data for SEO tags
 * NOT the same as the client-side fetch in DropPageClient — this one runs on the server
 *
 * ISR strategy: revalidate every 60 seconds
 * Why not static? Drop pages are dynamic — names, descriptions, and status change
 * Why not no-cache? Because hammering the backend on every request is unkind
 * 60 seconds: edits propagate within a minute. Balanced. Reasonable. Juan-approved.
 *
 * Returns null on any failure — missing collection, backend down, invalid response
 * generateMetadata handles the null case with graceful fallbacks (see below)
 */
async function fetchCollection(slug: string): Promise<NFTCollection | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/collections/${encodeURIComponent(slug)}`, {
      // ISR revalidation — cached for 60s, then refetched on the next request after expiry
      // encodeURIComponent protects against slugs with special characters
      // (Nobody names their collection "Drop&Mint?v=2" but somebody will. We're ready.)
      next: { revalidate: 60 },
    })

    // Non-OK status (404, 500, etc.) — return null for graceful fallback
    // We don't throw here because a missing collection should show the fallback, not a crash
    if (!res.ok) return null

    // Parse the response body — expect { success: boolean, data?: NFTCollection }
    const body: { success: boolean; data?: NFTCollection } = await res.json()

    // Return data only if success flag is true and data is present
    // The API contract: success:false means "found but failed", no data means "empty"
    return body.success && body.data ? body.data : null
  } catch {
    // Network errors, JSON parse errors, anything unexpected
    // Return null — the metadata generation falls back to generic platform defaults
    // A crash here would break the entire drop page render. We don't crash for metadata.
    return null
  }
}

// ── generateMetadata ──────────────────────────────────────────────────────────

/**
 * generateMetadata - Per-drop SEO metadata generation
 * Called by Next.js at request time (or revalidation time for ISR)
 * Returns collection-specific title, description, canonical URL, OG image, and Twitter card
 *
 * Why per-drop metadata matters:
 * "Mint CryptoKitties 2049 on NeXus" is infinitely more clickable in search results
 * than the generic "NeXus - NFT Launchpad | Web3"
 * And a banner image as the OG card is infinitely more shareable than a blank box
 * (We've seen the blank box. It's sad. The banner is not sad. The banner converts.)
 *
 * Fallback chain for OG image:
 * 1. collection.bannerUrl — the hero banner (ideal: full-width, designed for sharing)
 * 2. collection.imageUrl  — the collection pfp (acceptable: still visually relevant)
 * 3. /share-image.png    — generic platform OG image (last resort, but not shameful)
 */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  // Resolve the slug from the async params promise (Next.js 15 App Router pattern)
  // params is a Promise in Next.js 15 — await it before accessing properties
  const { slug } = await params

  // Fetch the collection data from the backend for metadata generation
  // Returns null if the collection doesn't exist or the backend is unavailable
  const collection = await fetchCollection(slug)

  // ── Fallback: Collection Not Found or Backend Down ────────────────────────
  // When the backend can't be reached or the slug doesn't match any collection
  // Return generic platform metadata so the page still has something in <head>
  // Better than empty metadata. Better than a crash. The minimum viable SEO.
  if (!collection) {
    return {
      title:       pageTitle('NFT Drop'),    // "NFT Drop | NeXus" — generic but valid
      description: siteDescription,          // Platform description as fallback
      // No canonical, no OG image — DropPageClient will handle the 404 UX
    }
  }

  // ── OG Image Selection — the banner-first fallback chain ──────────────────
  // Banner is the hero image — designed at 1200x630, perfect for social sharing
  // pfp is acceptable but wasn't designed for OG dimensions — still beats a blank
  // Platform share-image.png is the nuclear fallback — always there, always works
  const ogImage = collection.bannerUrl ?? collection.imageUrl ?? absoluteUrl('/share-image.png')

  // ── Title and Description ─────────────────────────────────────────────────
  // Title: "CollectionName | NeXus" — specific, branded, searchable
  const title       = pageTitle(collection.name)

  // Description: use the collection's own description if it has one
  // Trim whitespace (some creators leave leading spaces, apparently)
  // Fallback: a generated pitch that names the collection and the platform
  const description = collection.description?.trim()
    || `Mint ${collection.name} on ${siteName} — the Web3 NFT launchpad on Solana.`

  // Canonical URL — the official URL for this specific drop page
  const canonicalUrl = absoluteUrl(`/drops/${slug}`)

  // ── Return the Full Metadata Object ──────────────────────────────────────
  return {
    title,
    description,

    // Canonical — prevents SEO split between /drops/my-collection and any redirect variants
    alternates: { canonical: canonicalUrl },

    // Open Graph — what Discord, Telegram, Facebook, Slack unfurl when this URL is pasted
    // type: 'website' (not 'article' — drops aren't articles, they're experiences)
    // images array: one image, sized for the 1.91:1 OG standard
    openGraph: {
      type:        'website',
      url:         canonicalUrl,
      siteName,           // "NeXus" — brand attribution in the preview card
      title,
      description,
      images: [
        {
          url:    ogImage,    // Banner first, pfp fallback, platform image last resort
          width:  1200,       // Standard OG width — 1200px is the recommended minimum
          height: 630,        // Standard OG height — 1.91:1 aspect ratio, classic
          alt:    `${collection.name} — NFT drop banner`,
          // Alt text for the OG image — accessibility in social previews
        },
      ],
    },

    // Twitter Card — what shows up when someone pastes this URL into a tweet
    // summary_large_image = the big banner card, not the tiny thumbnail
    // Because the banner looks incredible at full width and we know it
    twitter: {
      card:        'summary_large_image',
      site:        twitterHandle,     // @nexus handle — platform attribution in the card
      title,
      description,
      images:      [ogImage],         // Same image as OG — consistency across platforms
    },

    // Robots — index drop pages! Drops are the content people search for!
    // "Solana NFT mint [collection name]" is a real search query people use
    // We want to rank for it. Every drop page is a landing page.
    robots: { index: true, follow: true },

    // metadataBase — required for resolving relative image URLs in OG/Twitter
    // Ensures ogImage paths that start with "/" get the correct domain prepended
    metadataBase: new URL(siteUrl),
  }
}

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * DropPage - The exported default server component for /drops/[slug]
 * Renders DropPageClient — the interactive guts of the drop detail page
 *
 * Why not pass collection data as a prop to DropPageClient?
 * Because DropPageClient reads the slug via useParams() and fetches independently
 * This gives it its own loading/error state management without waiting for server props
 * Two fetches, but independent failure domains. A trade-off we accepted.
 *
 * params is provided by Next.js but DropPageClient handles its own slug reading
 * We don't need to forward params. The client component has useParams(). It's fine.
 */
export default function DropPage() {
  // Hand off to the client component — all interactivity lives there
  // This server component's job (metadata generation) is done above
  // The baton has been passed. DropPageClient takes it from here.
  return <DropPageClient />
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — per-drop SEO architect and "the banner is always the OG image" enforcer.
// The banner. Always the banner. It's a rule now. A beautiful rule.
// P.S. — ISR at 60s means your edits are live within a minute. No redeploy required.
