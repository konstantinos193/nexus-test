"use client";

/**
 * Collections Page - The Grand Bazaar of Solana NFT Drops
 * Full-width marketplace layout with sticky filter bar, status tabs, and an honest grid
 * Because sidebars are for spreadsheets, not NFT launchpads. The sidebar is gone. Goodbye.
 *
 * This page was redesigned from a two-column layout to match the homepage's dark, editorial vibe:
 * - Sticky glassmorphism filter bar pinned to the top while you scroll
 * - Status tabs (All / Live / Upcoming / Ended) on the left
 * - Search input + sort dropdown on the right
 * - Full-width collection grid below, no sidebar eating half the screen
 *
 * (The sidebar left the building some time ago. We are not mourning it. The grid is better.)
 *
 * Architecture:
 * CollectionsPage (exported) = thin Suspense boundary wrapper
 *   └── CollectionsPageContent (inner) = the actual component with hooks and state
 * Split this way because useSearchParams() requires a Suspense boundary in Next.js 15.
 * We learned this the hard way. The error message was not friendly.
 *
 * @author Juan - The developer who buried the sidebar and danced on its grave
 * (Coded with care, humor, and one too many filter state refactors)
 */

// React core hooks — the holy quartet of frontend survival
// useState for local values, useCallback for stable handlers, useMemo for expensive transforms,
// Suspense for the Next.js useSearchParams requirement we cannot escape
import { useState, useCallback, useMemo, Suspense } from 'react'

// useSearchParams — reads query string params from the URL
// Lets us initialize the search input from ?search=xyz so shareable URLs work
// Also the reason this whole component needs to be wrapped in Suspense. Thanks, Next.js.
import { useSearchParams } from 'next/navigation'

// Lucide icons — Search (the magnifying glass everyone recognizes) and ChevronDown (the sort arrow)
// These are UI chrome. Functional and aesthetically correct.
import { Search, ChevronDown } from 'lucide-react'

// CollectionGrid — the card grid component that renders individual collection tiles
// The actual product. The reason the page exists.
import CollectionGrid from '@/components/features/collections/CollectionGrid'

// CollectionsPageContent (aliased as CollectionsContent) — handles loading/empty/error states
// We let it own the conditional rendering logic so this file stays clean
import { CollectionsPageContent as CollectionsContent } from '@/components/features/collections/CollectionsPageContent'

// FilterState — the TypeScript shape of our filter object
// Without this, sortBy would be a plain string and TypeScript would be disappointed in us
import { FilterState } from '@/types'

// useAllCollections — the data hook. Talks to the API. Returns collections (or cries trying).
// Backed by React Query, so caching and deduplication are handled automatically.
// We just call the hook and trust the process.
import { useAllCollections } from '@/hooks/useCollections'

// useCollectionsPageState — the page state reducer hook
// Replaced five useState calls with a single dispatch pattern
// Because useState spaghetti scales about as well as my patience after the third refactor
import { useCollectionsPageState } from '@/hooks/useCollectionsPageState'

// mapDisplayStatusToInternal — translates "live" (what users see) to "minting" (what the API wants)
// Because the API and the UI don't use the same vocabulary. Welcome to software.
import { mapDisplayStatusToInternal } from '@/lib/type-utils'

// CSS module — scoped styles for this page only, no global pollution
// If you're hunting for the styles that make the filter bar stick: they're in here
import styles from './collections.module.css'

// ── Status Filter Tabs ────────────────────────────────────────────────────────
// The four tabs at the top of the filter bar: All, Live, Upcoming, Ended
// Ordered by excitement level, descending. "Live" is the hot one.
// Empty string for "All" because the API interprets undefined-status as "return everything"
const STATUS_TABS = [
  { value: '', label: 'All' },        // No filter — show everything. The democratic choice.
  { value: 'live', label: 'Live' },   // Actively minting. The exciting one. Has a pulsing dot.
  { value: 'upcoming', label: 'Upcoming' }, // Not live yet. The patient person's tab.
  { value: 'ended', label: 'Ended' }, // Mint closed. History. Archaeology, really.
] as const

// ── Sort Options ──────────────────────────────────────────────────────────────
// The four sort orderings available in the dropdown
// Newest is the default because freshness is what people care about most
// (Name A-Z is for the extremely organized. We respect them deeply.)
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },       // Default. Most recent first.
  { value: 'oldest', label: 'Oldest' },       // Reverse chronological. For the nostalgic.
  { value: 'name', label: 'Name A–Z' },       // Alphabetical. The organized person's option.
  { value: 'minted', label: 'Most Minted' },  // Sorted by popularity. Social proof baked in.
] as const

// ── Inner Page Component ──────────────────────────────────────────────────────

/**
 * CollectionsPageContent - The real component. The one that does all the work.
 * Reads URL search params, manages filter state, fetches collections, renders the page.
 * Wrapped in Suspense by the exported CollectionsPage below because of useSearchParams.
 * (Without the Suspense boundary, Next.js throws a build-time warning that becomes a runtime error.
 * We found out. We fixed it. It's fixed. Moving on.)
 */
function CollectionsPageContent() {
  // Read initial search query from URL params — enables ?search=xyz shareable URLs
  // If the param isn't present, default to empty string (no filter applied)
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''

  // Page state reducer — single dispatch instead of five useState calls
  // Contains: filters (API-bound), statusFilter (display), searchQuery (input controlled),
  //           displayLimit (pagination slice), and the dispatch function
  // One hook. One source of truth. Much cleaner than the old way.
  const {
    filters,        // The API filter object passed to useAllCollections
    statusFilter,   // Display-state array of selected status strings
    searchQuery,    // Controlled value for the search input field
    displayLimit,   // How many collections to show (grows with "Load More" clicks)
    dispatch,       // The dispatch function — sends action objects to the reducer
  } = useCollectionsPageState(initialSearch)

  // ── Data Fetching ─────────────────────────────────────────────────────────
  // useAllCollections — React Query hook that fetches from /api/collections
  // Passes the current filter state so API results match what the user selected
  // Returns the full matched set; we slice it to displayLimit below for pagination
  const { data: collections = [], isLoading, error } = useAllCollections({
    search: filters.search,   // Text search filter
    status: filters.status,   // Status filter (minting/upcoming/ended)
    sortBy: filters.sortBy,   // Sort order for results
  })

  // ── Event Handlers ────────────────────────────────────────────────────────
  // All memoized with useCallback so they don't cause unnecessary re-renders
  // of the filter bar on every keypress or click. Performance. We care about it.

  // handleSearchChange — updates both the visible input value and the API filter
  // Dispatches two actions: one for the controlled input, one for the API filter
  // Debounce is not implemented here. That's a future problem. (It's always a future problem.)
  const handleSearchChange = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
    dispatch({ type: 'SET_FILTERS', payload: { search: query || undefined } })
  }, [dispatch])

  // handleStatusTabChange — handles tab clicks on All/Live/Upcoming/Ended
  // Maps the display status string to the internal API status before dispatching
  // "live" (tab label) maps to "minting" (API value). Different vocabularies. One mapper.
  const handleStatusTabChange = useCallback((status: string) => {
    const newStatuses = status ? [status] : []
    dispatch({ type: 'SET_STATUS_FILTER', payload: newStatuses })
    const internalStatus = status ? mapDisplayStatusToInternal(status) : undefined
    dispatch({ type: 'SET_FILTERS', payload: { status: internalStatus } })
  }, [dispatch])

  // handleSortChange — updates the sort order when the dropdown changes
  // Cast to FilterState['sortBy'] because the select value is a plain string
  // TypeScript knows best. We cast responsibly.
  const handleSortChange = useCallback((sort: string) => {
    dispatch({ type: 'SET_FILTERS', payload: { sortBy: sort as FilterState['sortBy'] } })
  }, [dispatch])

  // handleClearFilters — resets everything back to defaults
  // Fresh start. No judgment. Like a Monday morning except you actually want it.
  const handleClearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' })
  }, [dispatch])

  // ── Derived State ─────────────────────────────────────────────────────────
  // displayedCollections — the slice of collections visible to the user right now
  // Simple array slice: [0, displayLimit]. LOAD_MORE increments displayLimit.
  // Memoized so we don't re-slice on every render that doesn't change collections/limit
  const displayedCollections = useMemo(
    () => collections.slice(0, displayLimit),
    [collections, displayLimit]
  )

  // hasMore — true when there are collections beyond the current display slice
  // Controls whether the "Load More" button appears. Simple boolean. Clean.
  const hasMore = collections.length > displayLimit

  // handleLoadMore — appends the next batch by incrementing the display limit
  // The LOAD_MORE action in the reducer adds the page size constant. We don't care what that is.
  const handleLoadMore = useCallback(() => {
    dispatch({ type: 'LOAD_MORE' })
  }, [dispatch])

  // activeStatus — the currently selected tab value ('' means "All")
  // Derived from the statusFilter array. First item or empty string.
  // Used to apply the active tab style class in the tab row below.
  const activeStatus = statusFilter[0] ?? ''

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Page Header ────────────────────────────────────────────────────
          Slim and editorial — just the title and subtitle, nothing else
          We had stats up here once. A whole grid of them.
          We removed them. Nobody misses them. The page breathes better now. */}
      <section className={styles.header}>
        <div className={styles.headerContainer}>
          {/* H1 — the page title. One line. No decoration. Just the truth. */}
          <h1 className={styles.title}>Browse Collections</h1>
          {/* Subtitle — one sentence of context. Sets the vibe. */}
          <p className={styles.subtitle}>
            Discover and mint from the hottest NFT collections launching on our platform
          </p>
        </div>
      </section>

      {/* ── Sticky Filter Bar ──────────────────────────────────────────────
          Glassmorphism filter bar that stays pinned to the top while users scroll
          Status tabs on the left, search + sort on the right
          Designed to feel like a trading desk toolbar. Functional. Always in view.
          If you're debugging why it's not sticking: check the CSS module's position. */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarContainer}>

          {/* Status Tabs — pill buttons for All / Live / Upcoming / Ended
              Click one to filter the grid. Click the active one to clear it.
              The Live tab has a pulsing dot because live things should feel alive.
              (Static elements don't pulse. Only the living ones do.) */}
          <div className={styles.statusTabs}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                // Active tab gets the tabActive class — highlighted styling
                // Inactive tabs are just pills waiting for their moment
                className={`${styles.tab} ${activeStatus === tab.value ? styles.tabActive : ''}`}
                onClick={() => handleStatusTabChange(tab.value)}
              >
                {/* Pulsing dot — only shown for the Live tab
                    A visual indicator that "live" means something is actively happening
                    Not purely decorative. It signals urgency. It suggests scarcity. */}
                {tab.value === 'live' && <span className={styles.liveDot} />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side of the filter bar: search input + sort dropdown
              These two controls live together because they're related concerns:
              both narrow or reorder the results the user sees */}
          <div className={styles.filterRight}>
            {/* Search Input — find collections by name
                Magnifying glass icon is included. No extra charge.
                Controlled input: value comes from state, onChange updates state.
                Debounce not implemented. Yet. (It's on the list.) */}
            <div className={styles.searchWrapper}>
              {/* Search icon — the universal "find things" symbol */}
              <Search className={styles.searchIcon} size={14} />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={styles.searchInput}
                aria-label="Search collections" // Accessibility. Screen readers deserve context.
              />
            </div>

            {/* Sort Dropdown — Newest / Oldest / Name A-Z / Most Minted
                Custom styled with a ChevronDown icon overlay
                Because the native browser select is ugly and we have standards */}
            <div className={styles.sortWrapper}>
              <select
                className={styles.sortSelect}
                value={filters.sortBy ?? 'newest'} // Default to newest if not set
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort collections" // Accessibility again. We're thorough.
              >
                {SORT_OPTIONS.map((opt) => (
                  // Each option is just a value/label pair from the constant above
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {/* ChevronDown overlay — because the browser's native dropdown arrow
                  does not match our dark, editorial aesthetic. So we cover it. */}
              <ChevronDown className={styles.sortChevron} size={12} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Collections Grid ───────────────────────────────────────────────
          The main event. Full width. No sidebar. Just cards.
          More screen space for cards = more cards visible = more mints.
          Simple math. We did the math. We liked the answer. */}
      <div className={styles.gridSection}>
        <div className={styles.gridContainer}>

          {/* Results count — shows how many collections are displayed vs total
              Only visible when not loading and there are results to count
              Understated. "14 collections" — not "WOW 14 AMAZING COLLECTIONS!!"
              We let the collections speak for themselves. */}
          {!isLoading && displayedCollections.length > 0 && (
            <div className={styles.resultsRow}>
              <span className={styles.resultsCount}>
                {displayedCollections.length} collection{displayedCollections.length !== 1 ? 's' : ''}
                {/* "of N" suffix — only shown when there are more than what's displayed
                    So users know there are more and can hit "Load More" to get them */}
                {collections.length !== displayedCollections.length && (
                  <span className={styles.resultsTotal}> of {collections.length}</span>
                )}
              </span>
            </div>
          )}

          {/* CollectionsContent — the smart content renderer
              Handles all the conditional states so we don't have to:
              - Loading: skeleton cards or spinner
              - Error: friendly error message with retry option
              - Empty: "no results" message with a clear filters CTA
              - Has results: the actual CollectionGrid with load more
              Pass everything down and let it sort itself out. We trust it. */}
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

// ── Exported Page Component ───────────────────────────────────────────────────

/**
 * CollectionsPage - The exported default page component
 * A thin Suspense boundary that wraps CollectionsPageContent
 *
 * Why Suspense here?
 * Next.js 15 requires any component using useSearchParams() to be inside a Suspense boundary
 * If it's not, you get a build warning that becomes a hard runtime error in production
 * The fallback is a dark background div — invisible to users, satisfies the framework.
 * (Next.js 15 is strict. We respect that. We comply. Mostly cheerfully.)
 */
export default function CollectionsPage() {
  return (
    // Suspense boundary — required by Next.js 15 for useSearchParams usage
    // Fallback is a min-height dark div so there's no layout flash during hydration
    <Suspense fallback={<div className="min-h-screen bg-dark-bg-primary" />}>
      {/* CollectionsPageContent — the real component, now safe inside Suspense */}
      <CollectionsPageContent />
    </Suspense>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — sidebar abolisher, filter state refactor survivor, and "load more" button enthusiast.
// Browse. Filter. Search. Sort. Discover. Mint. Repeat.
// P.S. — The sidebar is gone. It's not coming back. We've moved on. So should you.
