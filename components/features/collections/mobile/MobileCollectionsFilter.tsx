/**
 * Mobile Collections Filter Component
 * Mobile-optimized filter bar with search and filter button
 * Because mobile users need filters too (just in a drawer, not a sidebar)
 * 
 * @author Juan - The developer who made filters mobile-friendly
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { FilterState } from '@/types'
import CustomDropdown from '../CustomDropdown'
import styles from './MobileCollections.module.css'

interface MobileCollectionsFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string[]
  onStatusChange: (status: string[]) => void
  onFilterChange: (filters: FilterState) => void
  currentFilters?: FilterState
}

/**
 * Maps display status to internal CollectionStatus
 * Because users think in "live/upcoming/ended" but we think in "minting/ready/completed"
 */
function mapDisplayStatusToInternal(displayStatus: string): string | undefined {
  if (displayStatus === 'live') return 'minting'
  if (displayStatus === 'upcoming') return 'ready' // or "preparing"
  if (displayStatus === 'ended') return 'completed'
  return undefined
}

export default function MobileCollectionsFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onFilterChange,
  currentFilters,
}: MobileCollectionsFilterProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileFiltersOpen])

  const handleSearchChange = (query: string) => {
    onSearchChange(query)
    onFilterChange({
      ...currentFilters,
      search: query || undefined,
    })
  }

  const toggleStatus = (status: string) => {
    const newStatuses = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status]
    
    onStatusChange(newStatuses)
    
    // Map display statuses to internal status and update filter
    const internalStatus = newStatuses.length > 0 
      ? mapDisplayStatusToInternal(newStatuses[0]) // For now, use first selected status
      : undefined
    
    onFilterChange({
      ...currentFilters,
      status: internalStatus as any,
    })
  }

  const statusOptions = [
    { value: 'live', label: 'Live Minting', color: '#10b981' },
    { value: 'upcoming', label: 'Upcoming', color: '#f59e0b' },
    { value: 'ended', label: 'Ended', color: '#8a8a9a' },
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'minted', label: 'Most Minted' },
  ]

  const sortDropdownOptions = sortOptions.map((option) => ({
    value: option.value,
    label: `Sort: ${option.label}`,
  }))

  const handleSortChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      sortBy: value as FilterState['sortBy'],
    })
  }

  const handleClearFilters = () => {
    onStatusChange([])
    onSearchChange('')
    onFilterChange({
      sortBy: 'newest',
    })
  }

  const hasActiveFilters = !!(
    currentFilters?.status ||
    currentFilters?.search ||
    (currentFilters?.sortBy && currentFilters.sortBy !== 'newest')
  )

  const FilterContent = () => (
    <div className={styles.mobileFilterContent}>
      {/* Status Filter */}
      <div className={styles.mobileFilterSection}>
        <h3 className={styles.mobileFilterSectionTitle}>Status</h3>
        <div className={styles.mobileCheckboxGroup}>
          {statusOptions.map((status) => (
            <div key={status.value} className={styles.mobileCheckboxItem}>
              <input
                type="checkbox"
                id={`mobile-${status.value}`}
                checked={statusFilter.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className={styles.mobileCheckbox}
              />
              <label
                htmlFor={`mobile-${status.value}`}
                className={styles.mobileCheckboxLabel}
              >
                <span
                  className={styles.mobileStatusDot}
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Sort Filter */}
      <div className={styles.mobileFilterSection}>
        <h3 className={styles.mobileFilterSectionTitle}>Sort By</h3>
        <CustomDropdown
          value={currentFilters?.sortBy || 'newest'}
          options={sortDropdownOptions}
          onChange={handleSortChange}
          placeholder="Sort: Newest"
        />
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className={styles.mobileClearButton}
        >
          <X className={styles.mobileClearIcon} />
          Clear Filters
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Filter Bar */}
      <div className={styles.mobileFilterBar}>
        <div className={styles.mobileSearchWrapper}>
          <Search className={styles.mobileSearchIcon} />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.mobileSearchInput}
          />
        </div>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className={styles.mobileFilterButton}
          aria-label="Open filters"
        >
          <SlidersHorizontal className={styles.mobileFilterButtonIcon} />
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className={styles.mobileDrawer}>
          {/* Backdrop */}
          <div
            className={styles.mobileDrawerBackdrop}
            onClick={() => setMobileFiltersOpen(false)}
            onTouchStart={(e) => {
              // Prevent drawer content from closing when touching inside
              e.stopPropagation()
            }}
          />
          
          {/* Drawer Content */}
          <div 
            className={styles.mobileDrawerContent}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileDrawerHeader}>
              <h2 className={styles.mobileDrawerTitle}>Filter Collections</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className={styles.mobileDrawerClose}
                aria-label="Close filters"
              >
                <X className={styles.mobileDrawerCloseIcon} />
              </button>
            </div>
            
            <FilterContent />
            
            <button
              type="button"
              className={styles.mobileApplyButton}
              onClick={() => setMobileFiltersOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Mobile filters: making "find my stuff" less painful on small screens. 🔍
