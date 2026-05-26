// React Query - because we need to fetch data without going insane
// Without it, we'd be writing useEffect spaghetti code (nobody wants that)
import { useQuery } from '@tanstack/react-query'
// API client - the thing that talks to our backend
// Because frontend can't live in a vacuum (it needs data)
import { collectionsApi } from '@/lib/api/client'
// Types - because TypeScript needs to know what we're working with
// Otherwise it gets confused (and so do we)
import { NFTCollection } from '@/types'

/**
 * React Query hooks for collections
 * Because fetching data shouldn't be complicated
 * (Even though it usually is)
 */

/**
 * Get featured collections
 * Used by: Hero, FeaturedDropsGrid, HotCollections
 */
export function useFeaturedCollections() {
  return useQuery({
    queryKey: ['collections', 'featured'],
    queryFn: async () => {
      const response = await collectionsApi.getFeatured()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch featured collections')
      }
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

/**
 * Get discover collections by tab
 * Used by: DiscoverSection
 */
export function useDiscoverCollections(tab: string) {
  return useQuery({
    queryKey: ['collections', 'discover', tab],
    queryFn: async () => {
      const response = await collectionsApi.getDiscover(tab)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch discover collections')
      }
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

/**
 * Get all collections with filters
 * Used by: Collections page
 */
export function useAllCollections(params?: {
  status?: string
  search?: string
  sortBy?: string
}) {
  return useQuery({
    queryKey: ['collections', 'all', params?.status, params?.search, params?.sortBy],
    queryFn: async () => {
      const response = await collectionsApi.getAll(params)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch collections')
      }
      return response.data
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

/**
 * Get single collection by ID
 * Used by: Collection detail pages
 */
export function useCollection(id: string) {
  return useQuery({
    queryKey: ['collections', id],
    queryFn: async () => {
      const response = await collectionsApi.getById(id)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch collection')
      }
      return response.data
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })
}
