/**
 * Dashboard Layout - The minimal wrapper for /dashboard and its entire route subtree
 * Metadata, SEO, robots directives. That's it. Nothing more. Nothing less.
 * The dashboard is the creator's command center. We make sure Google can find it.
 * Then we get out of the way and let the dashboard do its thing.
 *
 * Why does this exist as a layout rather than putting metadata in the page?
 * Because the dashboard page is a Client Component ('use client'),
 * and metadata cannot be exported from Client Components in Next.js 13+.
 * So the layout holds the metadata. The page holds the wallet-connected UI.
 * Separation of concerns. The framework enforces it. We comply. Usually cheerfully.
 *
 * Route subtree this covers:
 * /dashboard          → DashboardPage (the creator overview)
 * /dashboard/collections/[id]/edit → EditCollectionPage (the edit flow)
 * Future sub-routes will also inherit this metadata as their default.
 *
 * @author Juan - Layout architect and dashboard SEO enthusiast
 * (Coded with care, humor, and the quiet satisfaction of a clean layout file)
 */

// Metadata type — the Next.js Server Component type for <head> configuration
// If this type isn't imported, TypeScript will cry. We import it. The tears stop.
import type { Metadata } from 'next'

// SEO config — pageTitle for formatted title strings, absoluteUrl for full canonical URLs
// "Dashboard | NeXus" is what shows up in the tab and search results
// absoluteUrl('/dashboard') is what tells Google "this is the real dashboard URL"
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

// ── Page Identity ─────────────────────────────────────────────────────────────
// "Dashboard" — short, clear, creator-facing
// The description explains what the dashboard does for search engines and link preview cards
// Because someone searching "manage NFT collections Solana" should find this

const title = 'Dashboard'

// Description — the elevator pitch for search results and social cards
// Covers: what you manage (collections), what you see (stats), who it's for (creators)
const description =
  'Manage your NFT collections, track minting stats, and oversee your creator dashboard on the NFT Launchpad.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Full metadata object — title, description, canonical, OG, Twitter, robots
// robots: index + follow because the dashboard is public-facing for discovery
// (Even though the data inside is wallet-gated, the page itself is visible to crawlers)
export const metadata: Metadata = {
  // Title — "Dashboard" in the browser tab and search result headline
  title,

  // Description — what the dashboard is and who it's for
  // Appears in search snippets and social preview cards
  description,

  // Canonical URL — one official URL for the dashboard
  // Prevents Google from indexing /dashboard?ref=xyz as a separate page
  alternates: { canonical: absoluteUrl('/dashboard') },

  // Open Graph — for when someone shares the dashboard URL on Discord or social
  // "Dashboard | NeXus" with the description — professional, informative
  openGraph: {
    title: pageTitle(title),  // "Dashboard | NeXus"
    description,
    url: absoluteUrl('/dashboard'),
  },

  // Twitter — same card content, Twitter-specific format
  // Consistent across platforms. We're thorough like that.
  twitter: {
    title: pageTitle(title),
    description,
  },

  // Robots — index the dashboard page and follow its links
  // The page is visible but the content inside requires wallet connection
  // Google can index the shell. Users need a wallet to see the data.
  robots: {
    index: true,  // Yes, index this page. Creators should be able to find it via search.
    follow: true, // Yes, follow links on this page. The nav links back to the platform.
  },
}

// ── Layout Component ──────────────────────────────────────────────────────────

/**
 * DashboardLayout - The pass-through layout for /dashboard routes
 * Renders children directly with no additional DOM elements
 * The metadata above does all the work. The layout itself is invisible.
 *
 * Could we have put this metadata in the page? No — page.tsx is 'use client'.
 * Client Components cannot export metadata in Next.js. Framework rule. We respect it.
 * Layout files are always Server Components. Metadata lives here. The page handles state.
 */
export default function DashboardLayout({
  children,
}: {
  // children — the dashboard page content, or the edit page, or any future sub-route
  // Whatever Next.js decides to render under /dashboard comes through here
  // We pass it through untouched. No extra DOM. No wrapper drama.
  children: React.ReactNode
}) {
  // Direct children render — no fragment even, just straight pass-through
  // The cleanest possible layout implementation. Aristotle would approve.
  return <>{children}</>
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Layout by Juan — dashboard wrapper. SEO? Check. Robots? Check. Extra DOM? Absolutely not.
// The creator command center is indexed, described, and discoverable.
// P.S. — Manage those collections. The layout handled the boring part. You handle the stats.
