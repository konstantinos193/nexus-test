/**
 * Collections Layout - Wrapper for /collections
 * Metadata, SEO, LaunchpadScrollbar. So "Browse Collections" lands in search and shares.
 *
 * @author Juan - Layout architect and "browse collections" SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import { absoluteUrl, pageTitle } from '@/lib/seo/config'
import LaunchpadScrollbar from '@/components/ui/LaunchpadScrollbar'

const title = 'Browse NFT Collections'
const description =
  'Discover and browse Solana NFT collections from creators worldwide. Filter by status and explore featured collections on our launchpad.'

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

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <LaunchpadScrollbar />
      {children}
    </>
  )
}

// P.S. - Browse. Discover. We've got the scrollbar and the SEO.
