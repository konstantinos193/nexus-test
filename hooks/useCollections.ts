/**
 * useCollections - Milestone 1 stub (static data only)
 * useFeaturedCollections returns the static featured list from lib/data
 * useDiscoverCollections returns empty so DiscoverSection doesn't explode
 * Because we'd rather show nothing than break the layout
 *
 * All hooks use React Query (useQuery) so loading/error states work
 * We just never call a real API; queryFn returns static data or []
 *
 * @author Juan - The developer who made hooks that don't call an API
 * (Coded with care, humor, and probably too much coffee)
 */

// React Query - useQuery for cached, stale-while-revalidate behavior
import { useQuery } from '@tanstack/react-query'
// Static featured list - so the home page has something to show
import { featuredCollections } from '@/lib/data/collections'
// Types - NFTCollection so we type the return correctly
import { NFTCollection } from '@/types'

// Featured - used by HomePageContent (hero, featured grid, hot collections)
// Returns the static featured list so the landing page looks alive
export function useFeaturedCollections() {
  return useQuery({
    queryKey: ['collections', 'featured'],
    queryFn: async (): Promise<NFTCollection[]> => featuredCollections,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// Discover - used by DiscoverSection (tabs: trending, new, ending_soon, free_mint)
// Returns empty array so the section renders "no results" instead of breaking
export function useDiscoverCollections(_tab: string) {
  return useQuery({
    queryKey: ['collections', 'discover', _tab],
    queryFn: async (): Promise<NFTCollection[]> => [],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

// All - used by collections page and header search (not in M1, but we keep the stub)
// enabled: false so we never run the query
export function useAllCollections(_params?: { status?: string; search?: string; sortBy?: string }) {
  return useQuery({
    queryKey: ['collections', 'all', _params],
    queryFn: async (): Promise<NFTCollection[]> => [],
    enabled: false,
  })
}

// Collection by ID - used by collection detail page (not in M1, but we keep the stub)
// enabled: false so we never run the query
export function useCollection(_id: string) {
  return useQuery({
    queryKey: ['collections', _id],
    queryFn: async (): Promise<null> => null,
    enabled: false,
  })
}

// Coded by Juan - because every good hook needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Static today. Dynamic tomorrow. We're building.
