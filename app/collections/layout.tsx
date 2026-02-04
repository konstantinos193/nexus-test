/**
 * Collections Layout - The wrapper for /collections and its children
 * Handles metadata (SEO), LaunchpadScrollbar, and whatever else /collections needs at layout level.
 * Think of it as the collections route's backstage crew. Metadata? Here. Custom scrollbar? Also here.
 *
 * @author Juan - Layout architect and "browse collections" SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'
import LaunchpadScrollbar from '@/components/ui/LaunchpadScrollbar'

const title = 'Browse NFT Collections'
const description =
  'Discover and browse Solana NFT collections from creators worldwide. Filter by status and explore featured collections on our launchpad.'

const keywords = [
  'NFT collections',
  'Solana NFT',
  'browse NFTs',
  'Web3 launchpad',
  'discover NFTs',
  'Solana',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/collections') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/collections'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – Browse NFT Collections',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle(title),
    description,
    images: [absoluteUrl(ogImagePath)],
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
