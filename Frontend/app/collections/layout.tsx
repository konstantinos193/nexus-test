/**
 * Collections Layout - The wrapper for /collections and its children
 * Handles metadata (SEO), LaunchpadScrollbar, and whatever else /collections needs at layout level.
 * Think of it as the collections route's backstage crew. Metadata? Here. Custom scrollbar? Also here.
 *
 * @author Juan - Layout architect and "browse collections" SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
// SEO config - pageTitle, absoluteUrl. Google's gotta find our collections. We help.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'
// LaunchpadScrollbar - custom scrollbar for the collections vibe. Aesthetic. Functional.
import LaunchpadScrollbar from '@/components/ui/LaunchpadScrollbar'

const title = 'Browse NFT Collections'
const description =
  'Discover and browse Solana NFT collections from creators worldwide. Filter by status and explore featured collections on our launchpad.'

// Metadata - so search engines and social shares know what /collections is about
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/collections') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/collections'),
  },
  twitter: {
    title: pageTitle(title),
    description,
  },
}

/**
 * Collections Layout - Wraps collections pages with scrollbar + metadata
 * children = the actual collections page (filters, grid, etc.). We're just the frame.
 */
export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* LaunchpadScrollbar - custom scrollbar. Collections deserve style. */}
      <LaunchpadScrollbar />
      {/* children - the collections page content. The real MVP. */}
      {children}
    </>
  )
}

// Layout by Juan - because layout files deserve signatures too
// P.S. - Browse. Discover. We've got the scrollbar and the SEO. You're welcome. 🔍
