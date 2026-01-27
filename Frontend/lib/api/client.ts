import { ApiResponse, NFTCollection } from '@/types'

/**
 * API Client - The bridge between frontend and backend
 * Because talking to APIs shouldn't be complicated
 * (Even though it usually is)
 * 
 * Now uses Next.js API routes as a proxy to hide the backend URL
 * Because we don't want to expose our backend URL to the client
 * (Security through obscurity? Maybe. But also CORS and stuff)
 */

// Use relative paths - Next.js API routes will proxy to backend
// This way the backend URL is never exposed to the client
const API_BASE_URL = ''

/**
 * Fetch wrapper with error handling
 * Because fetch errors are annoying and we want to handle them gracefully
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      return {
        success: false,
        error: errorData.error || `Request failed with status ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    }
  }
}

/**
 * Collections API client
 * All the endpoints we need for collections
 */
export const collectionsApi = {
  /**
   * Get featured collections
   * Used by: Hero, FeaturedDropsGrid, HotCollections
   */
  getFeatured: async (): Promise<ApiResponse<NFTCollection[]>> => {
    return fetchApi<NFTCollection[]>('/api/collections/featured')
  },

  /**
   * Get discover collections by tab
   * Used by: DiscoverSection
   */
  getDiscover: async (tab: string): Promise<ApiResponse<NFTCollection[]>> => {
    return fetchApi<NFTCollection[]>(`/api/collections/discover?tab=${tab}`)
  },

  /**
   * Get all collections with filters
   * Used by: Collections page, header search
   */
  getAll: async (params?: {
    status?: string
    search?: string
    sortBy?: string
    limit?: number
  }): Promise<ApiResponse<NFTCollection[]>> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.limit != null) queryParams.append('limit', String(params.limit))

    const query = queryParams.toString()
    return fetchApi<NFTCollection[]>(
      `/api/collections${query ? `?${query}` : ''}`
    )
  },

  /**
   * Get single collection by ID
   * Used by: Collection detail pages
   */
  getById: async (id: string): Promise<ApiResponse<NFTCollection>> => {
    return fetchApi<NFTCollection>(`/api/collections/${id}`)
  },
}
