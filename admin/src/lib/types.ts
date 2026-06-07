export type CollectionStatus =
  | 'draft'
  | 'preparing'
  | 'ready'
  | 'minting'
  | 'completed'
  | 'paused'

export interface Collection {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  bannerUrl?: string
  creator: string
  creatorAddress: string
  blockchain: string
  totalSupply: number
  minted: number
  price?: number
  status: CollectionStatus
  effectiveStatus: CollectionStatus
  featured: boolean
  mintStart?: string
  endDate?: string
  mintAddress?: string
  txSignature?: string
  royaltyBasisPoints?: number
  platformFeeBasisPoints?: number
  twitterUrl?: string
  discordUrl?: string
  websiteUrl?: string
  phases?: Record<string, unknown>[]
  fundReceivers?: Record<string, unknown>[]
  traits?: Record<string, unknown>[]
  createdAt: string
  updatedAt: string
}

export interface AdminStats {
  totalCollections: number
  activeCollections: number
  totalMinted: number
  uniqueCreators: number
  featuredCount: number
  newLast7Days: number
}

export interface Creator {
  creatorAddress: string
  displayName: string
  collectionCount: number
  totalMinted: number
  lastActivityAt: string
}

export interface ActivityLog {
  id: string
  action: string
  resource?: string
  details?: string
  timestamp: string
  ip?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export type Permission =
  | 'collections:read'
  | 'collections:write'
  | 'creators:read'
  | 'infrastructure:read'
  | 'settings:read'
  | 'settings:write'
  | 'logs:read'
