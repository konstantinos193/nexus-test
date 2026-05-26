/**
 * Carousel Constants - Magic numbers extracted for maintainability
 * Because hard-coded numbers are the root of all evil (and bugs)
 */

// Carousel timing constants
export const CAROUSEL_AUTO_PLAY_INTERVAL = 5000 // 5 seconds - not too fast, not too slow
export const CAROUSEL_TRANSITION_MS = 500 // 500ms transition duration
export const CAROUSEL_MIN_SWIPE_DISTANCE = 50 // Minimum swipe distance for gesture detection

// Display limits
export const CAROUSEL_MAX_DISPLAY_ITEMS = 5 // Maximum collections to show in carousel
export const COLLECTIONS_INITIAL_DISPLAY_LIMIT = 12 // Initial number of collections to show

// Scroll thresholds
export const HEADER_SCROLL_THRESHOLD = 20 // Scroll amount before header changes appearance
export const HEADER_COLLAPSE_THRESHOLD = 100 // Scroll amount before header collapses
export const HEADER_SHOW_THRESHOLD = 10 // Scroll amount to always show header at top
