/**
 * Home Page Content Component
 * The main orchestrator for the home page
 * This is the first impression, so it better be good
 * Because first impressions are everything (unlike second chances)
 * 
 * This component brings together all the pieces of the homepage:
 * - Hero section (the big carousel that greets visitors)
 * 
 * It's like a conductor for an orchestra, but for React components
 * (And the components actually listen, unlike some orchestras)
 * 
 * @author Juan - The developer who orchestrated this homepage
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { Suspense, lazy } from 'react'
import { useFeaturedCollections } from '@/hooks/useCollections'
import { featuredCollections as placeholderFeatured } from '@/lib/data/collections'

// HeroSection loads immediately - it's above the fold and critical for LCP
import HeroSection from './HeroSection'

// Dynamic imports for below-the-fold components - load only when needed
// This reduces initial bundle size and improves FCP/LCP
const FeaturedDropsGrid = lazy(() => import('./FeaturedDropsGrid'))
const HotCollections = lazy(() => import('./HotCollections'))
const DiscoverSection = lazy(() => import('./DiscoverSection'))

// Loading fallback component
const SectionSkeleton = () => (
  <div className="min-h-[200px] bg-dark-bg-secondary animate-pulse rounded-lg" />
)

/**
 * Home Page Content Component - The homepage orchestrator
 * This is what gets rendered on the home page
 * It's simple, clean, and delegates to other components
 * Because this component is just a conductor (the real talent is in the sections)
 */
export default function HomePageContent() {
  // Fetch featured collections from backend
  const { data: featuredCollections, isLoading, error } = useFeaturedCollections()

  // Show loading state (optional - you can remove this if you want to show empty state)
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading collections...</div>
        </div>
      </main>
    )
  }

  // Use fetched data; on error or empty, use placeholder data so homepage always has indexable content
  const collections =
    featuredCollections && featuredCollections.length > 0
      ? featuredCollections
      : placeholderFeatured

  return (
    // Main container - the wrapper for all homepage content
    // min-h-screen ensures it's at least full viewport height
    // bg-gradient-dark gives it a nice dark gradient background
    // Because empty space is sad, and flat colors are boring
    <main className="min-h-screen bg-gradient-dark">
      {/* Hero Section - The big intro that greets visitors
          This is the carousel that shows featured drops
          It's the first thing users see, so it better be impressive
          Because if this doesn't hook them, nothing will
          Load immediately (above the fold, critical for LCP) */}
      <HeroSection collections={collections} />

      {/* Featured Drops Grid - Shows featured drops with minting statistics
          Appears directly below the hero section
          Because users need to see the numbers (and numbers don't lie)
          Displays collections in a clean grid with all the important stats
          Lazy load after hero is visible */}
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedDropsGrid collections={collections} />
      </Suspense>

      {/* Hot Collections - Horizontal scrolling row of trending collections
          Shows the hottest collections in a single scrollable row
          Because hot collections deserve hot presentation
          Lazy load as user scrolls */}
      <Suspense fallback={<SectionSkeleton />}>
        <HotCollections collections={collections} />
      </Suspense>

      {/* Discover - Tabs (Trending | New | Ending Soon | Free Mint) + CollectionCard grid
          Enriches homepage below Hot Collections per gap analysis
          Lazy load as user scrolls */}
      <Suspense fallback={<SectionSkeleton />}>
        <DiscoverSection />
      </Suspense>
    </main>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - This is the homepage. Make it count. 🎯
