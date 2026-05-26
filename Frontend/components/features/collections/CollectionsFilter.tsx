"use client";

/**
 * CollectionsFilter Component - The filter sidebar that helps users find collections
 * Desktop: Sticky sidebar with search and status filters
 * Mobile: Search bar + button that opens bottom drawer
 * Because finding stuff without filters is like finding a needle in a haystack
 * 
 * Uses CSS modules - no global dependencies (because we're independent like that)
 * 
 * @author Juan - The developer who built this filter
 * (Coded with care, humor, and probably too much coffee)
 */

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { FilterState } from "@/types";
import CustomDropdown from "./CustomDropdown";
import { mapDisplayStatusToInternal, mapInternalStatusToDisplay } from "@/lib/type-utils";
import styles from "./CollectionsFilter.module.css";

interface CollectionsFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string[];
  onStatusChange: (status: string[]) => void;
  onFilterChange: (filters: FilterState) => void;
  currentFilters?: FilterState;
}

export function CollectionsFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onFilterChange,
  currentFilters,
}: CollectionsFilterProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const handleSearchChange = (query: string) => {
    onSearchChange(query);
    onFilterChange({
      ...currentFilters,
      search: query || undefined,
    });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    
    onStatusChange(newStatuses);
    
    // Map display statuses to internal status and update filter
    const internalStatus = newStatuses.length > 0 
      ? mapDisplayStatusToInternal(newStatuses[0]) // For now, use first selected status
      : undefined;
    
    onFilterChange({
      ...currentFilters,
      status: internalStatus,
    });
  };

  const statusOptions = [
    { value: "live", label: "Live Minting", color: "#10b981" },
    { value: "upcoming", label: "Upcoming", color: "#f59e0b" },
    { value: "ended", label: "Ended", color: "#8a8a9a" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name", label: "Name (A-Z)" },
    { value: "minted", label: "Most Minted" },
  ];

  const sortDropdownOptions = sortOptions.map((option) => ({
    value: option.value,
    label: `Sort: ${option.label}`,
  }));

  const handleSortChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      sortBy: value as FilterState["sortBy"],
    });
  };

  const handleClearFilters = () => {
    onStatusChange([]);
    onSearchChange("");
    onFilterChange({
      sortBy: "newest",
    });
  };

  const hasActiveFilters = !!(
    currentFilters?.status ||
    currentFilters?.search ||
    (currentFilters?.sortBy && currentFilters.sortBy !== "newest")
  );

  const FilterContent = () => (
    <div className={styles.filterContent}>
      {/* Status Filter */}
      <div className={styles.filterSection}>
        <h3 className={styles.sectionTitle}>Status</h3>
        <div className={styles.checkboxGroup}>
          {statusOptions.map((status) => (
            <div key={status.value} className={styles.checkboxItem}>
              <input
                type="checkbox"
                id={status.value}
                checked={statusFilter.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className={styles.checkbox}
              />
              <label
                htmlFor={status.value}
                className={styles.checkboxLabel}
              >
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Sort Filter */}
      <div className={styles.filterSection}>
        <h3 className={styles.sectionTitle}>Sort By</h3>
        <CustomDropdown
          value={currentFilters?.sortBy || "newest"}
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
          className={styles.clearButton}
        >
          <X className={styles.clearIcon} />
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Filter Sidebar */}
      <aside className={styles.desktopSidebar}>
        <div className={styles.sidebarContent}>
          <h2 className={styles.sidebarTitle}>Filter Collections</h2>

          {/* Search */}
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <FilterContent />
        </div>
      </aside>

      {/* Mobile Filter Button and Search */}
      <div className={styles.mobileBar}>
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
          <SlidersHorizontal className={styles.filterButtonIcon} />
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className={styles.mobileDrawer}>
          {/* Backdrop */}
          <div
            className={styles.drawerBackdrop}
            onClick={() => setMobileFiltersOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className={styles.drawerContent}>
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Filter Collections</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className={styles.drawerClose}
                aria-label="Close filters"
              >
                <X className={styles.closeIcon} />
              </button>
            </div>
            
            <FilterContent />
            
            <button
              type="button"
              className={styles.applyButton}
              onClick={() => setMobileFiltersOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Filters: making "find my stuff" less painful since... today. 🔍
