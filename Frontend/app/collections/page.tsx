"use client";

/**
 * Collections Page - The grand bazaar of NFT collections
 * Full-width marketplace layout with horizontal filter bar
 * Because sidebars are for spreadsheets, not NFT drops
 *
 * Redesigned to match the homepage's dark, editorial visual language:
 * sticky filter bar, status tabs, full-width grid. No sidebar.
 * (The sidebar has left the building. We are not mourning it.)
 *
 * @author Juan - The developer who built this collections page
 * (Coded with care, humor, and probably too much coffee)
 */

// React hooks - state, memoization, and the ability to not re-render everything on every keystroke
import { useState, useCallback, useMemo, Suspense } from 'react'
// Search params - so the URL can carry a search query like a little messenger
import { useSearchParams } from 'next/navigation'
// Lucide icons - the search glass and chevron, doing their visual duty
import { Search, ChevronDown } from 'lucide-react'
// Collections grid + content wrapper - the actual cards and their states
import CollectionGrid from '@/components/features/collections/CollectionGrid'
import { CollectionsPageContent as CollectionsContent } from '@/components/features/collections/CollectionsPageContent'
// Types - because TypeScript deserves to know what's happening
import { FilterState } from '@/types'
// Data hooks - fetches collections from the backend (or cries trying)
import { useAllCollections } from '@/hooks/useCollections'
// Page state reducer - because 5 useState calls was a mess and we knew it
import { useCollectionsPageState } from '@/hooks/useCollectionsPageState'
// Status mapping util - bridges "live" (display) to "minting" (internal)
import { mapDisplayStatusToInternal } from '@/lib/type-utils'
// CSS module - standalone styles, no global pollution
import styles from './collections.module.css'

// Status filter tabs - All, Live, Upcoming, Ended
// (Ordered by excitement level, descending)
const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
] as const

// Sort options - the usual suspects
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'minted', label: 'Most Minted' },
] as const

/**
 * Collections Page Content - the real component
 * Wrapped in Suspense below because useSearchParams needs it
 * (Next.js 15 rules. We don't make them, we just follow them.)
 */
function CollectionsPageContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''

  // Single reducer for all page state - no useState spaghetti
  const {
    filters,
    statusFilter,
    searchQuery,
    displayLimit,
    dispatch,
  } = useCollectionsPageState(initialSearch)

  // Fetch collections from API with active filters
  const { data: collections = [], isLoading, error } = useAllCollections({
    search: filters.search,
    status: filters.status,
    sortBy: filters.sortBy,
  })

  // Handle search input - debounce is a future problem
  const handleSearchChange = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
    dispatch({ type: 'SET_FILTERS', payload: { search: query || undefined } })
  }, [dispatch])

  // Handle status tab click - maps display label to internal API status
  const handleStatusTabChange = useCallback((status: string) => {
    const newStatuses = status ? [status] : []
    dispatch({ type: 'SET_STATUS_FILTER', payload: newStatuses })
    const internalStatus = status ? mapDisplayStatusToInternal(status) : undefined
    dispatch({ type: 'SET_FILTERS', payload: { status: internalStatus } })
  }, [dispatch])

  // Handle sort dropdown change
  const handleSortChange = useCallback((sort: string) => {
    dispatch({ type: 'SET_FILTERS', payload: { sortBy: sort as FilterState['sortBy'] } })
  }, [dispatch])

  // Clear all active filters - fresh start, no judgment
  const handleClearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [dispatch])

  // Paginate the fetched collections (simple slice - load more appends)
  const displayedCollections = useMemo(
    () => collections.slice(0, displayLimit),
    [collections, displayLimit]
  )

  const hasMore = collections.length > displayLimit

  const handleLoadMore = useCallback(() => {
    dispatch({ type: 'LOAD_MORE' })
  }, [dispatch])

  // Currently active status tab value ('' = All)
  const activeStatus = statusFilter[0] ?? ''

  return (
    <div className={styles.page}>

      {/* ── Page Header ──────────────────────────────────────────── */}
      {/* Slim and clean - title + subtitle, nothing else */}
      {/* The stats grid is gone. Nobody misses it. */}
      <section className={styles.header}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Browse Collections</h1>
          <p className={styles.subtitle}>
            Discover and mint from the hottest NFT collections launching on our platform
          </p>
        </div>
      </section>

      {/* ── Sticky Filter Bar ────────────────────────────────────── */}
      {/* Glassmorphism sticky bar - stays put while you scroll */}
      {/* Status tabs on the left, search + sort on the right */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarContainer}>

          {/* Status tabs - pill buttons for All / Live / Upcoming / Ended */}
          <div className={styles.statusTabs}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ''}`}
                onClick={() => handleStatusTabChange(tab.value)}
              >
                {/* Pulsing dot for Live tab - because live things should feel alive */}
                {tab.value === 'live' && <span className={styles.liveDot} />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side: search input + sort dropdown */}
          <div className={styles.filterRight}>
            {/* Search input - magnifying glass included, no extra charge */}
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={14} />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={styles.searchInput}
                aria-label="Search collections"
              />
            </div>

            {/* Sort dropdown - custom styled, not using the ugly browser default */}
            <div className={styles.sortWrapper}>
              <select
                className={styles.sortSelect}
                value={filters.sortBy ?? 'newest'}
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort collections"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={styles.sortChevron} size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Collections Grid ─────────────────────────────────────── */}
      {/* Full-width, no sidebar eating up space */}
      {/* More cards visible. More happiness. Simple math. */}
      <div className={styles.gridSection}>
        <div className={styles.gridContainer}>

          {/* Results count - understated, because we're not trying to brag */}
          {!isLoading && displayedCollections.length > 0 && (
            <div className={styles.resultsRow}>
              <span className={styles.resultsCount}>
                {displayedCollections.length} collection{displayedCollections.length !== 1 ? 's' : ''}
                {collections.length !== displayedCollections.length && (
                  <span className={styles.resultsTotal}> of {collections.length}</span>
                )}
              </span>
            </div>
          )}

          {/* The actual content: grid, loading, empty, and error states */}
          <CollectionsContent
            displayedCollections={displayedCollections}
            isLoading={isLoading}
            error={error}
            handleLoadMore={handleLoadMore}
            hasMore={hasMore}
            handleClearFilters={handleClearFilters}
          />
        </div>
      </div>

    </div>
  )
}

/**
 * Collections Page - exported default, wraps content in Suspense
 * The Suspense boundary is required by Next.js when using useSearchParams
 * (Without it, Next.js yells at you. We've learned our lesson.)
 */
export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-bg-primary" />}>
      <CollectionsPageContent />
    </Suspense>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Browse. Filter. Discover. Repeat. 🔍
