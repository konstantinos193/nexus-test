/**
 * Dashboard Layout - The wrapper for /dashboard and its children
 * Metadata, SEO, robots. Dashboard is the creator's HQ—we make sure Google knows.
 * Minimal DOM, maximum discoverability. Same energy as Create layout.
 *
 * @author Juan - Layout architect and dashboard SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import './dashboard-page.css'
import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'

const title = 'Dashboard'
const description =
  'Manage your NFT collections, track minting stats, and oversee your creator dashboard on the Web3 Launchpad.'

const keywords = [
  'NFT dashboard',
  'creator dashboard',
  'manage NFT collections',
  'minting stats',
  'Solana NFT',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/dashboard') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/dashboard'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – Creator Dashboard',
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
 * Dashboard Layout - Wraps dashboard pages. Pass-through + metadata. Clean.
 * children = the dashboard page. We handle SEO; they handle stats and collections.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// Layout by Juan - dashboard wrapper. SEO? Check. Extra DOM? Nope. We're efficient.
// P.S. - Manage those collections. We've got the metadata. You've got the stats. 📊
