/**
 * Mobile Collections Page Content Component
 * Mobile-optimized orchestrator for collections page
 * Because mobile users deserve a great experience too
 * (Even if their screens are smaller than our ambitions)
 * 
 * @author Juan - The developer who made collections mobile-friendly
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import MobileCollectionsHeader from './MobileCollectionsHeader'
import MobileCollectionsFilter from './MobileCollectionsFilter'
import MobileCollectionGrid from './MobileCollectionGrid'
import LoadMore from '../LoadMore'
import EmptyState from '../EmptyState'
import { FilterState } from '@/types'
import { useAllCollections } from '@/hooks/useCollections'
import styles from './MobileCollections.module.css'

export default function MobileCollectionsPageContent() {
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
    <div className={styles.mobileCollectionsContainer}>
      <div className={styles.mobileCollectionsContent}>
        {/* Mobile Header with Stats */}
        <MobileCollectionsHeader stats={stats} />

        {/* Mobile Filter Bar */}
        <MobileCollectionsFilter
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onFilterChange={handleFilterChange}
          currentFilters={filters}
        />

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
            <MobileCollectionGrid
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
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Mobile collections: making browsing on small screens less painful. 📱
