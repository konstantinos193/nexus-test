/**
 * API Client - Milestone 1 stub (no real backend)
 * HeaderSearch calls getAll; we return empty so the search UI doesn't break
 * Because a broken search bar is worse than no search bar
 * (And we're not leaving anyone with a spinner of eternal hope)
 *
 * All methods return success: true and empty/null data
 * So any component that calls collectionsApi still works; they just get no results
 *
 * @author Juan - The developer who stubbed the API
 * (Coded with care, humor, and probably too much coffee)
 */

// Types - ApiResponse and NFTCollection so we type the stub correctly
import { ApiResponse, NFTCollection } from '@/types'

// Stub object - same shape as the real API client
// So we can swap in the real client later without changing call sites
export const collectionsApi = {
  // Featured - used by home hero, featured grid, hot collections
  getFeatured: async (): Promise<ApiResponse<NFTCollection[]>> =>
    ({ success: true, data: [] }),
  // Discover - used by DiscoverSection (tabs: trending, new, etc.)
  getDiscover: async (_tab: string): Promise<ApiResponse<NFTCollection[]>> =>
    ({ success: true, data: [] }),
  // GetAll - used by HeaderSearch (search bar) and dashboard (creator collections)
  getAll: async (_params?: Record<string, unknown>): Promise<ApiResponse<NFTCollection[]>> =>
    ({ success: true, data: [] }),
  // GetById - used by collection detail page (not in M1, but we keep the stub)
  getById: async (_id: string): Promise<ApiResponse<NFTCollection | null>> =>
    ({ success: true, data: null }),
}

// Coded by Juan - because every good util needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Empty arrays. Full optimism. Backend later.
