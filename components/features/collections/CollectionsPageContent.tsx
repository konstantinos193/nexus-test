/**
 * Collections Page Content Component
 * The main orchestrator for the collections page
 * Conditionally renders mobile or desktop components
 * Because one size doesn't fit all (especially when it comes to screens)
 * 
 * @author Juan - The developer who made collections responsive
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { useState, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/hooks/useMediaQuery'
import CollectionsPageHeader from './CollectionsPageHeader'
import { CollectionsFilter } from './CollectionsFilter'
import CollectionGrid from './CollectionGrid'
import LoadMore from './LoadMore'
import EmptyState from './EmptyState'
import MobileCollectionsPageContent from './mobile/MobileCollectionsPageContent'
import { FilterState } from '@/types'
import { useAllCollections } from '@/hooks/useCollections'
import styles from '@/app/collections/collections.module.css'

// Loading fallback for Suspense boundary
const CollectionsLoadingFallback = () => (
  <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroContainer}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Explore Collections</h1>
          <p className={styles.heroDescription}>
            Discover and mint from the hottest NFT collections launching on our platform
          </p>
        </div>
      </div>
    </section>
    <section className={styles.content}>
      <div className={styles.contentContainer}>
        <div className={styles.mainLayout}>
          <div className={styles.mainContent}>
            <div className="w-full h-64 bg-dark-bg-secondary animate-pulse rounded" />
          </div>
        </div>
      </div>
    </section>
  </div>
)

export default function CollectionsPageContent() {
  const isMobile = useIsMobile()

  // Render mobile-optimized components on mobile devices
  // Wrap in Suspense because MobileCollectionsPageContent uses useSearchParams()
  if (isMobile) {
    return (
      <Suspense fallback={<CollectionsLoadingFallback />}>
        <MobileCollectionsPageContent />
      </Suspense>
    )
  }

  // Render desktop components on larger screens
  // Wrap in Suspense because DesktopCollectionsPageContent uses useSearchParams()
  return (
    <Suspense fallback={<CollectionsLoadingFallback />}>
      <DesktopCollectionsPageContent />
    </Suspense>
  )
}

function DesktopCollectionsPageContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''
  
  // Filter state - because we need to track what users want to see
  // (Even though they probably don't know what they want)
  const [filters, setFilters] = useState<FilterState>({
    search: initialSearch || undefined,
    status: undefined,
    sortBy: 'newest',
  })

  // Status filter state for CollectionsFilter component
  // Because checkboxes need arrays, but our API needs single values
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    // Map initial filter status to display status
    if (!filters.status) return []
    if (filters.status === 'minting') return ['live']
    if (filters.status === 'ready' || filters.status === 'preparing') return ['upcoming']
    if (filters.status === 'completed') return ['ended']
    return []
  })
  
  // Search query state for CollectionsFilter component
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  // Fetch collections from API with current filters
  // Because we're not going to make users wait forever (just a little bit)
  const { data: collections = [], isLoading, error } = useAllCollections({
    search: filters.search,
    status: filters.status,
    sortBy: filters.sortBy,
  })

  // Handle filter changes from filter bar
  // Because filters are like opinions - everyone has them
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Handle search change from CollectionsFilter
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setFilters((prev) => ({ ...prev, search: query || undefined }))
  }, [])

  // Handle status filter change from CollectionsFilter
  const handleStatusChange = useCallback((statuses: string[]) => {
    setStatusFilter(statuses)
    // Map display status to internal status (use first selected)
    const internalStatus = statuses.length > 0
      ? (statuses[0] === 'live' ? 'minting' : statuses[0] === 'upcoming' ? 'ready' : 'completed')
      : undefined
    setFilters((prev) => ({ ...prev, status: internalStatus as any }))
  }, [])

  // Clear all filters - because sometimes you need a fresh start
  // (Like when you realize you've been filtering wrong the whole time)
  const handleClearFilters = useCallback(() => {
    setFilters({ sortBy: 'newest' })
  }, [])

  // Pagination state (simple load more for now)
  // Because infinite scroll is cool, but buttons are more predictable
  const [displayLimit, setDisplayLimit] = useState(12)
  const displayedCollections = useMemo(() => {
    return collections.slice(0, displayLimit)
  }, [collections, displayLimit])

  const hasMore = collections.length > displayLimit

  const handleLoadMore = useCallback(() => {
    setDisplayLimit((prev) => prev + 12)
  }, [])

  // Calculate stats for the hero section
  // Because numbers make everything look more impressive
  const stats = useMemo(() => {
    return {
      total: collections.length,
      live: collections.filter((c) => c.status === 'minting').length,
      upcoming: collections.filter((c) => c.status === 'ready' || c.status === 'preparing').length,
      completed: collections.filter((c) => c.status === 'completed').length,
    }
  }, [collections])

  return (
    <div className={styles.page}>
      {/* Hero Section - The grand entrance */}
      {/* Because first impressions matter (and we're not going to mess this up) */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Explore Collections
            </h1>
            <p className={styles.heroDescription}>
              Discover and mint from the hottest NFT collections launching on our platform
            </p>
          </div>

          {/* Stats Grid - Because numbers are sexy */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Collections</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueLive}`}>
                {stats.live}
              </div>
              <div className={styles.statLabel}>Live Now</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueUpcoming}`}>
                {stats.upcoming}
              </div>
              <div className={styles.statLabel}>Upcoming</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueCompleted}`}>
                {stats.completed}
              </div>
              <div className={styles.statLabel}>Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className={styles.content}>
        <div className={styles.contentContainer}>
          {/* Layout: Sidebar + Main Content */}
          <div className={styles.mainLayout}>
            {/* Filter Sidebar - Desktop only */}
            <CollectionsFilter
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusChange={handleStatusChange}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
            />

            {/* Main Content Area */}
            <div className={styles.mainContent}>
              {/* Page Header - Minimal title */}
              <CollectionsPageHeader />

              {/* Results Count - So users know what they're looking at */}
              <div className={styles.resultsHeader}>
                <p className={styles.resultsCount}>
                  Showing{' '}
                  <span className={styles.resultsNumber}>
                    {displayedCollections.length}
                  </span>{' '}
                  collection{displayedCollections.length !== 1 ? 's' : ''}
                  {collections.length !== displayedCollections.length && (
                    <span className={styles.resultsTotal}>
                      {' '}of {collections.length}
                    </span>
                  )}
                </p>
              </div>

              {/* Collections Grid - Where the magic happens */}
              {/* (Or at least the rendering) */}
              {error ? (
                <div className={styles.errorContainer}>
                  <div className={styles.errorIcon}>⚠️</div>
                  <h3 className={styles.errorTitle}>Error loading collections</h3>
                  <p className={styles.errorMessage}>
                    Something went wrong. Please try again later.
                  </p>
                </div>
              ) : (
                <>
                  <CollectionGrid
                    collections={displayedCollections}
                    loading={isLoading}
                  />
                  
                  {/* Load More Button - Because infinite scroll is cool, but buttons are more predictable */}
                  {!isLoading && displayedCollections.length > 0 && (
                    <div className={styles.loadMoreSection}>
                      <LoadMore
                        onLoadMore={handleLoadMore}
                        hasMore={hasMore}
                      />
                    </div>
                  )}

                  {/* Empty State - When no collections match filters */}
                  {/* Because empty grids are sadder than a birthday party with no guests */}
                  {!isLoading && displayedCollections.length === 0 && (
                    <EmptyState onClearFilters={handleClearFilters} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Browse. Filter. Discover. Repeat. (On any screen size) 🔍
