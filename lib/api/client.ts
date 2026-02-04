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
   * Used by: Collections page, header search, dashboard (creator)
   */
  getAll: async (params?: {
    status?: string
    search?: string
    sortBy?: string
    limit?: number
    creator?: string
  }): Promise<ApiResponse<NFTCollection[]>> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.limit != null) queryParams.append('limit', String(params.limit))
    if (params?.creator) queryParams.append('creator', params.creator)

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

  /**
   * Get collection data directly from blockchain
   * Used for: Real-time verification, hybrid approach
   */
  getOnChain: async (address: string): Promise<ApiResponse<any>> => {
    return fetchApi<any>(`/api/collections/onchain/${address}`)
  },

  /**
   * Trigger manual sync from blockchain
   * Used for: Admin actions, manual refresh
   */
  syncCollections: async (): Promise<ApiResponse<{ message: string }>> => {
    return fetchApi<{ message: string }>('/api/collections/sync', {
      method: 'POST',
    })
  },
}

/** IPFS upload result from backend (hash, gatewayUrl, etc.) */
export interface IpfsUploadResult {
  hash: string
  path: string
  gatewayUrl: string
  size: number
  pinned: boolean
  filename?: string
  error?: string
}

/** Single pinned item from GET /api/ipfs/pins */
export interface IpfsPinItem {
  cid: string
  type: string
  gatewayUrl: string
}

/**
 * IPFS API client - upload files via backend IPFS
 * Used by: Create page step 2 (collection image, banner, images folder, metadata folder)
 */
export const ipfsApi = {
  /**
   * List all pinned files (CIDs) on our IPFS node.
   * Used by: Tools → IPFS Files browser
   */
  getPins: async (): Promise<ApiResponse<{ pins: IpfsPinItem[] }>> => {
    return fetchApi<{ pins: IpfsPinItem[] }>('/api/ipfs/pins')
  },

  /**
   * Upload a file to IPFS via backend.
   * Returns gatewayUrl for preview and hash for metadata.
   */
  uploadFile: async (file: File): Promise<ApiResponse<IpfsUploadResult>> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed: ${response.status}`,
        }
      }

      if (!data.success || !data.data) {
        return {
          success: false,
          error: data.error || 'Invalid response from IPFS upload',
        }
      }

      return {
        success: true,
        data: data.data as IpfsUploadResult,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      }
    }
  },

  /**
   * Upload multiple files to IPFS (e.g. from folder drop).
   * Returns array of results (hash, gatewayUrl, filename, or error per file).
   */
  uploadFiles: async (files: File[]): Promise<ApiResponse<{ results: IpfsUploadResult[] }>> => {
    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload/files`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed: ${response.status}`,
        }
      }

      if (!data.success || !data.data?.results) {
        return {
          success: false,
          error: data.error || 'Invalid response from IPFS bulk upload',
        }
      }

      return {
        success: true,
        data: { results: data.data.results as IpfsUploadResult[] },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      }
    }
  },

  /**
   * Upload JSON metadata to IPFS via backend.
   * Returns hash, path (ipfs://...), gatewayUrl, size, pinned.
   */
  uploadMetadata: async (
    metadata: Record<string, unknown>,
    pin = true
  ): Promise<ApiResponse<IpfsUploadResult>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed: ${response.status}`,
        }
      }

      if (!data.success || !data.data) {
        return {
          success: false,
          error: data.error || 'Invalid response from IPFS metadata upload',
        }
      }

      return {
        success: true,
        data: data.data as IpfsUploadResult,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      }
    }
  },

  /**
   * Upload multiple files as one IPFS directory (for contract base_uri).
   * Each file is added with path = file.name (e.g. 0.json, 1.png).
   * Returns baseUri = ipfs://<cid>/ for use in update_base_uri.
   */
  uploadDirectory: async (
    files: File[]
  ): Promise<
    ApiResponse<{ baseUri: string; hash: string; gatewayUrl: string; pinned: boolean }>
  > => {
    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append(file.name, file)
      }

      const response = await fetch(`${API_BASE_URL}/api/ipfs/upload/directory`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Upload failed: ${response.status}`,
        }
      }

      if (!data.success || !data.data?.baseUri) {
        return {
          success: false,
          error: data.error || 'Invalid response from IPFS directory upload',
        }
      }

      return {
        success: true,
        data: {
          baseUri: data.data.baseUri,
          hash: data.data.hash,
          gatewayUrl: data.data.gatewayUrl,
          pinned: data.data.pinned,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
      }
    }
  },
}
