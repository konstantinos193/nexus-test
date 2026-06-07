'use client'

import { Suspense, lazy } from 'react'
import { useFeaturedCollections } from '@/hooks/useCollections'

// HeroSection loads immediately - it's above the fold and critical for LCP
import HeroSection from './HeroSection'

// Dynamic imports for below-the-fold components - load only when needed
// This reduces initial bundle size and improves FCP/LCP
const FeaturedDropsGrid = lazy(() => import('./FeaturedDropsGrid'))
const HotCollections = lazy(() => import('./HotCollections'))
const DiscoverSection = lazy(() => import('./DiscoverSection'))

// Loading fallback component
const SectionSkeleton = () => (
  <div className="min-h-50 bg-dark-bg-secondary animate-pulse rounded-lg" />
)

export default function HomePageContent() {
  // Fetch featured collections from backend
  const { data: featuredCollections, isLoading } = useFeaturedCollections()

  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Loading collections...</div>
        </div>
      </main>
    )
  }

  const collections = featuredCollections ?? []

  return (
    <main className="min-h-screen bg-gradient-dark">
      {/* Hero Section - The big intro carousel that greets visitors
          Loads immediately (above the fold, critical for LCP) */}
      <HeroSection collections={collections} />

      {/* Featured Drops Grid - Shows minting collections with statistics
          Lazy load after hero is visible */}
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedDropsGrid collections={collections} />
      </Suspense>

      {/* Hot Collections - Horizontal scrolling row of trending collections
          Lazy load as user scrolls */}
      <Suspense fallback={<SectionSkeleton />}>
        <HotCollections collections={collections} />
      </Suspense>

      {/* Discover - Tabs (Trending | New | Ending Soon | Free Mint) + CollectionCard grid
          Lazy load as user scrolls */}
      <Suspense fallback={<SectionSkeleton />}>
        <DiscoverSection />
      </Suspense>
    </main>
  )
}
