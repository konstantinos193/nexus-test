"use client";

/**
 * CollectionsFilter – The control panel for users who refuse to scroll through everything.
 * Search bar, status checkboxes, a sort dropdown, and a "Clear Filters" button
 * for when the user realizes they've filtered themselves into an empty state.
 *
 * Desktop: sticky sidebar with all the controls visible at once.
 * Mobile: search bar + button that opens a bottom drawer. Because mobile screens
 * don't have room for a sidebar AND a soul.
 *
 * If this component disappears, users have to scroll through every collection ever
 * to find the live ones. That would be bad for engagement. And for Juan's mental health.
 *
 * @author Juan – The developer who gatekept the collections behind three checkboxes
 * (Coded with care, useRef, and a deep distrust of browser-native select elements)
 */

// useState — for tracking mobile drawer open/close state. One piece of state. We respect minimalism.
import { useState } from "react";
// Lucide icons — the search magnifier, the sliders, and the X that clears regret
// If these break, the filter UI looks like a text-only website from 2003
import { Search, SlidersHorizontal, X } from "lucide-react";
// FilterState type — the shape of what filters look like in this codebase
import { FilterState } from "@/types";
// The custom dropdown — because native <select> belongs in a different era
import CustomDropdown from "./CustomDropdown";
// Status mapping utilities — because "live" in the UI is "minting" in the DB
// Abstracted here so we don't encode that mapping in 14 different places
import { mapDisplayStatusToInternal, mapInternalStatusToDisplay } from "@/lib/type-utils";
// Scoped CSS — the filter sidebar doesn't style anything it doesn't own
import styles from "./CollectionsFilter.module.css";

/** Props: everything the parent needs to push down and everything this component needs to push up. */
interface CollectionsFilterProps {
  searchQuery: string;          // Current search string — controlled from above
  onSearchChange: (query: string) => void;  // Called every keystroke (debounce is the caller's problem)
  statusFilter: string[];       // Array of active status display values
  onStatusChange: (status: string[]) => void;  // Swap out the status array
  onFilterChange: (filters: FilterState) => void; // The unified filter update — merges with current
  currentFilters?: FilterState; // What the filter state looks like right now (for spread merging)
}

/**
 * CollectionsFilter — The component that makes "find my collection" not a nightmare.
 * Search, status, sort. Three levers of power. Use them wisely.
 */
export function CollectionsFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onFilterChange,
  currentFilters,
}: CollectionsFilterProps) {
  // Mobile drawer state — false = closed, true = open, simple as life should be
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /**
   * Handles search input — updates parent state AND pushes to onFilterChange.
   * Empty string is treated as undefined because the backend doesn't want blank search queries.
   * (It would just return everything, but we like to be explicit about our intentions.)
   */
  const handleSearchChange = (query: string) => {
    onSearchChange(query);
    onFilterChange({
      ...currentFilters,
      // Undefined means "no filter applied", not "filter for empty string"
      search: query || undefined,
    });
  };

  /**
   * Toggles a status filter on/off.
   * If the status is already in the array, remove it. If not, add it.
   * Then map display status → internal status for the backend query.
   * (Note: currently only the FIRST selected status is sent. Multi-status is a future problem.
   *  The backend will eventually need to handle arrays here. That's next sprint's problem.)
   */
  const toggleStatus = (status: string) => {
    const newStatuses = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)  // Remove if already selected
      : [...statusFilter, status];                 // Add if not yet selected

    onStatusChange(newStatuses);

    // Map display statuses to internal DB status — "live" → "minting", etc.
    // Only first selected status sent for now. Multi-filter is a TODO that has been pending since the meeting.
    const internalStatus = newStatuses.length > 0
      ? mapDisplayStatusToInternal(newStatuses[0])
      : undefined;

    onFilterChange({
      ...currentFilters,
      status: internalStatus,
    });
  };

  // ── Filter Options ──────────────────────────────────────────────────────────
  // Status options — the three states a collection can be in (plus our emotions about each)
  const statusOptions = [
    { value: "live",     label: "Live Minting", color: "#10b981" },  // Green — good news
    { value: "upcoming", label: "Upcoming",     color: "#f59e0b" },  // Amber — stay tuned
    { value: "ended",    label: "Ended",        color: "#8a8a9a" },  // Gray — move on
  ];

  // Sort options — how users want the collections ordered, from optimistic to alphabetical
  const sortOptions = [
    { value: "newest",  label: "Newest"       },  // Default — recency bias is human nature
    { value: "oldest",  label: "Oldest"       },  // For the historians
    { value: "name",    label: "Name (A-Z)"   },  // For the pedants
    { value: "minted",  label: "Most Minted"  },  // For the trend-followers
  ];

  // Dropdown options with "Sort: " prefix for visual context in the dropdown trigger
  const sortDropdownOptions = sortOptions.map((option) => ({
    value: option.value,
    label: `Sort: ${option.label}`,
  }));

  /**
   * Handles sort selection from the CustomDropdown.
   * Casts the value to FilterState["sortBy"] — the type is an enum-ish union,
   * and TypeScript will yell at us if we don't cast here.
   */
  const handleSortChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      sortBy: value as FilterState["sortBy"],
    });
  };

  /**
   * Nuclear option — clears all filters back to defaults.
   * This resets status, search, and sort. A blank slate. Zen mode.
   * The "I give up and want everything" button.
   */
  const handleClearFilters = () => {
    onStatusChange([]);
    onSearchChange("");
    onFilterChange({
      sortBy: "newest",  // Back to the default sort — hope springs eternal
    });
  };

  // Determines whether the "Clear Filters" button should appear at all
  // (No point showing a clear button if there's nothing to clear)
  const hasActiveFilters = !!(
    currentFilters?.status ||
    currentFilters?.search ||
    // "newest" is the default — if sort is newest, it's not a "filter", it's just the baseline
    (currentFilters?.sortBy && currentFilters.sortBy !== "newest")
  );

  /**
   * FilterContent — the actual filter controls, extracted as an inner component
   * so it can be rendered in BOTH the desktop sidebar AND the mobile drawer
   * without duplicating JSX. DRY principle. Juan respects DRY.
   * (He doesn't always practice it, but he respects it.)
   */
  const FilterContent = () => (
    <div className={styles.filterContent}>

      {/* ── Status Filter ────────────────────────────────────────────────────
          Three checkboxes: Live, Upcoming, Ended.
          Users can pick one, some, or none. None = show everything = chaos. */}
      <div className={styles.filterSection}>
        <h3 className={styles.sectionTitle}>Status</h3>
        <div className={styles.checkboxGroup}>
          {statusOptions.map((status) => (
            <div key={status.value} className={styles.checkboxItem}>
              {/* Custom-styled checkbox — controlled via statusFilter array */}
              <input
                type="checkbox"
                id={status.value}
                checked={statusFilter.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className={styles.checkbox}
              />
              {/* Label with colored dot — the dot color matches the badge on the card */}
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

      {/* ── Sort Filter ──────────────────────────────────────────────────────
          A dropdown for sort order. Uses our custom dropdown component
          because native <select> styling is a crime against design. */}
      <div className={styles.filterSection}>
        <h3 className={styles.sectionTitle}>Sort By</h3>
        <CustomDropdown
          value={currentFilters?.sortBy || "newest"}  // Default to newest
          options={sortDropdownOptions}
          onChange={handleSortChange}
          placeholder="Sort: Newest"
        />
      </div>

      {/* ── Clear Filters Button ─────────────────────────────────────────────
          Only visible when there's something to clear — we don't taunt users
          with a clear button when there's nothing to clear. That would be cruel. */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          className={styles.clearButton}
        >
          {/* X icon — the universal symbol for "undo everything I just did" */}
          <X className={styles.clearIcon} />
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop Filter Sidebar ─────────────────────────────────────────────
          Sticky on desktop. Always visible. A permanent judge of filter choices.
          Hidden on mobile via CSS — mobile gets the drawer treatment instead. */}
      <aside className={styles.desktopSidebar}>
        <div className={styles.sidebarContent}>
          <h2 className={styles.sidebarTitle}>Filter Collections</h2>

          {/* Desktop search input — the search bar that lives above the filters
              Every character typed fires handleSearchChange. It's eager like that. */}
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

          {/* Render the shared filter controls below the search bar */}
          <FilterContent />
        </div>
      </aside>

      {/* ── Mobile Search + Filter Toggle ──────────────────────────────────────
          On mobile, we compress the filter into a search bar + icon button.
          Everything else lives inside the drawer that opens below. */}
      <div className={styles.mobileBar}>
        {/* Mobile search bar — same handler as desktop, different aesthetic */}
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

        {/* The sliders icon button — opens the mobile filter drawer.
            One tap. No form submission. No page refresh. Just state. */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className={styles.mobileFilterButton}
          aria-label="Open filters"
        >
          <SlidersHorizontal className={styles.filterButtonIcon} />
        </button>
      </div>

      {/* ── Mobile Filter Drawer ────────────────────────────────────────────────
          Slides up from the bottom when the filter button is tapped.
          Only rendered when open — no DOM pollution when closed. */}
      {mobileFiltersOpen && (
        <div className={styles.mobileDrawer}>
          {/* Backdrop — clicking it closes the drawer.
              Because clicking outside of something to close it is a universal contract. */}
          <div
            className={styles.drawerBackdrop}
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Drawer Content — the actual filter panel, floating above the backdrop */}
          <div className={styles.drawerContent}>
            {/* Drawer header — title + close button */}
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Filter Collections</h2>
              {/* X button — for the users who prefer a button over tapping the backdrop */}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className={styles.drawerClose}
                aria-label="Close filters"
              >
                <X className={styles.closeIcon} />
              </button>
            </div>

            {/* The same FilterContent component — identical to desktop, same behavior */}
            <FilterContent />

            {/* Done button — closes the drawer, keeping whatever filters the user set.
                It says "Done" not "Apply" because the filters already applied. Trust the state. */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because "scroll through all of them" is not a filtering strategy.
// (It's a patience test. And users fail patience tests at 300ms.)
// ─────────────────────────────────────────────────────────────────────────────
