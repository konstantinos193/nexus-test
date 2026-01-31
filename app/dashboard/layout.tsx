/**
 * Dashboard Layout - The wrapper for /dashboard and its children
 * Metadata, SEO, robots. Dashboard is the creator's HQ; we make sure Google knows
 * Minimal DOM, maximum discoverability
 *
 * We import dashboard-page.css here so all dashboard pages get the styles
 * We export metadata so "Dashboard" lands nicely in search and social shares
 * The layout itself is a pass-through (no extra wrapper div)
 *
 * @author Juan - Layout architect and dashboard SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

// Dashboard page styles - stat cards, header, empty state, etc.
import './dashboard-page.css'
import type { Metadata } from 'next'
// SEO config - pageTitle, absoluteUrl so "Dashboard" shows up when creators search
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

// Title and description - what shows in tabs and search results
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

// Coded by Juan - because every good layout needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Manage those collections. We've got the metadata. You've got the stats.
