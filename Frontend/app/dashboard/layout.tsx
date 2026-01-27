/**
 * Dashboard Layout - The wrapper for /dashboard and its children
 * Metadata, SEO, robots. Dashboard is the creator's HQ—we make sure Google knows.
 * Minimal DOM, maximum discoverability. Same energy as Create layout.
 *
 * @author Juan - Layout architect and dashboard SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
// SEO config - pageTitle, absoluteUrl. "Dashboard" needs to show up when creators search.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

const title = 'Dashboard'
const description =
  'Manage your NFT collections, track minting stats, and oversee your creator dashboard on the NFT Launchpad.'

// Metadata - so "Dashboard" lands nicely in search and social shares
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/dashboard') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/dashboard'),
  },
  twitter: {
    title: pageTitle(title),
    description,
  },
  robots: {
    index: true,
    follow: true,
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
