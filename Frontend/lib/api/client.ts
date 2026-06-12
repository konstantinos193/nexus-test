// API types - because we need to know what the API returns
// Without types, we'd be guessing (and TypeScript hates guessing)
import { ApiResponse, NFTCollection } from '@/types'

// Deploy payload shape — mirrors CreateCollectionDto on the backend
export interface DeployCollectionPayload {
  name: string
  symbol: string
  description: string
  creatorAddress: string
  uri?: string
  metadataUri?: string
  royaltyWallet?: string
  phases?: Array<{
    name: string
    phaseType: 'public' | 'allowlist'
    startDateTime: string
    endDateTime?: string
    priceOverride?: string
    maxPerWallet?: string
    allowlistRaw?: string
  }>
  totalSupply?: number
  mintPrice?: number
  freeMint?: boolean
  royaltyPercent?: number
  metadataStandard?: 'Core' | 'Legacy' | 'Metaplex' | 'Programmable' | 'CNFT' | 'Compressed'
  collectionImage?: string
  bannerImage?: string
  freezeCollection?: boolean
  freezeUntilDate?: string
  fundReceivers?: Array<{ share: string; address: string }>
  twitterUrl?: string
  discordUrl?: string
  websiteUrl?: string
  // Set by frontend after on-chain tx is signed + confirmed
  txSignature?: string
  collectionAddress?: string
}

// Shape of the deploy response — collection saved to DB after on-chain tx confirmed
export interface DeployCollectionResponse {
  collectionId: string
  collectionAddress: string
  slug: string
}

/**
 * API Client - The bridge between frontend and backend
 * Because talking to APIs shouldn't be complicated
 * (Even though it usually is)
 *
 * Calls the backend directly — make sure NEXT_PUBLIC_BACKEND_URL is set in .env.local.
 * (And that the backend has CORS enabled for the frontend origin)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

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
    creator?: string
  }): Promise<ApiResponse<NFTCollection[]>> => {
    const queryParams = new URLSearchParams()
    if (params?.status)  queryParams.append('status',  params.status)
    if (params?.search)  queryParams.append('search',  params.search)
    if (params?.sortBy)  queryParams.append('sortBy',  params.sortBy)
    if (params?.limit  != null) queryParams.append('limit',   String(params.limit))
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
   * Deploy a new collection:
   *   - Saves record to DB (status: preparing)
   *   - Returns unsigned initialize_collection tx for the wallet to sign
   * Used by: Create page / useCreateCollectionForm
   */
  deploy: async (payload: DeployCollectionPayload): Promise<ApiResponse<DeployCollectionResponse>> => {
    return fetchApi<DeployCollectionResponse>('/api/collections/deploy', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Confirm deployment — called after the signed tx is confirmed on-chain.
   * Flips collection status from 'preparing' → 'ready'.
   */
  confirmDeploy: async (collectionId: string, signature: string): Promise<ApiResponse<NFTCollection>> => {
    return fetchApi<NFTCollection>(`/api/collections/${collectionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    })
  },

  /** Update off-chain collection metadata (name, description, images, social, etc.) */
  update: async (id: string, dto: Record<string, unknown>): Promise<ApiResponse<NFTCollection>> => {
    return fetchApi<NFTCollection>(`/api/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    })
  },

  /** Fetch raw on-chain collection state — used by edit page to get metadataStandard and current config */
  getOnChain: async (mintAddress: string): Promise<ApiResponse<unknown>> => {
    return fetchApi<unknown>(`/api/collections/onchain/${mintAddress}`)
  },
}

/**
 * IPFS API client — file and directory uploads for the Create flow.
 * Matches the shape expected by CreatePageContent and step components.
 */
export const ipfsApi = {
  uploadFile: async (file: File): Promise<ApiResponse<{ gatewayUrl: string; hash: string }>> => {
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/ipfs/upload/file', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) return { success: false, error: data.error || 'Upload failed' }
      return { success: true, data: { gatewayUrl: data.data.gatewayUrl, hash: data.data.hash } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
    }
  },

  uploadDirectory: async (files: File[]): Promise<ApiResponse<{ hash: string; gatewayUrl: string; baseUri: string }>> => {
    try {
      const form = new FormData()
      for (const file of files) form.append(file.name, file)
      const response = await fetch('/api/ipfs/upload/directory', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) return { success: false, error: data.error || 'Directory upload failed' }
      return { success: true, data: { hash: data.data.hash, gatewayUrl: data.data.gatewayUrl, baseUri: data.data.baseUri } }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Directory upload failed' }
    }
  },

  // XHR version — same route, but fires onProgress(0–100) as bytes travel over the wire.
  // fetch() has no upload progress events; XHR does. This is why XHR still exists in 2025.
  uploadDirectoryWithProgress: (
    files: File[],
    onProgress: (pct: number) => void,
  ): Promise<ApiResponse<{ hash: string; gatewayUrl: string; baseUri: string }>> => {
    return new Promise((resolve) => {
      const form = new FormData()
      for (const file of files) form.append(file.name, file)
      const xhr = new window.XMLHttpRequest()
      // Upload-byte progress only reflects the browser → Next.js leg, which is
      // near-instant on localhost. The real wait is server-side IPFS pinning,
      // invisible to XHR. So cap upload progress at 90% and only complete to
      // 100% in onload (when the backend has actually pinned and responded) —
      // otherwise the bar reads "100%" while pinning is still in flight.
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90))
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status < 200 || xhr.status >= 300) {
            resolve({ success: false, error: data.error || 'Directory upload failed' })
          } else {
            onProgress(100)
            resolve({ success: true, data: { hash: data.data.hash, gatewayUrl: data.data.gatewayUrl, baseUri: data.data.baseUri } })
          }
        } catch {
          resolve({ success: false, error: 'Directory upload failed' })
        }
      }
      xhr.onerror = () => resolve({ success: false, error: 'Directory upload failed' })
      xhr.open('POST', '/api/ipfs/upload/directory')
      xhr.send(form)
    })
  },
}

// Image upload helper — routes through the Next.js proxy to keep the API key server-side.
// Returns the IPFS URI (e.g. ipfs://Qm...) on success
export async function uploadImageToIpfs(file: File): Promise<ApiResponse<{ uri: string; hash: string }>> {
  try {
    const form = new FormData()
    form.append('file', file)

    const response = await fetch('/api/ipfs/upload/file', {
      method: 'POST',
      body: form,
    })

    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error || 'Upload failed' }
    }
    // Backend returns { success, data: { hash, path, gatewayUrl, size, pinned } }
    // path is "ipfs://<hash>" — expose it as uri to match what callers expect
    const inner = data.data as { hash: string; path: string }
    return { success: true, data: { uri: inner.path, hash: inner.hash } }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}
