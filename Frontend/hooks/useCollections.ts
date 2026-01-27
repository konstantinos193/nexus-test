import { useQuery } from '@tanstack/react-query'
import { collectionsApi } from '@/lib/api/client'
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
    queryKey: ['collections', 'all', params],
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
