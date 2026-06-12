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
  featuredRank?: number | null
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
  totalFeeRevenue: number
}

export interface Creator {
  creatorAddress: string
  displayName: string
  collectionCount: number
  totalMinted: number
  feeRevenue: number
  lastActivityAt: string
}

// ── Owner-console auth / RBAC ────────────────────────────────────────────────
export type AdminRole = 'super_admin' | 'finance' | 'moderator' | 'read_only'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: AdminRole
}

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: AdminRole
  disabled: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

// ── Revenue reporting ────────────────────────────────────────────────────────
export interface RevenueSummary {
  allTimeRevenue: number
  last24h: number
  last7d: number
  last30d: number
  ledgerAllTime: number
  totalMinted: number
  paidCollections: number
  freeCollections: number
  treasuryWallet: string
  treasuryBalance: number | null
  expectedAccrued: number
  treasuryDrift: number | null
  defaultFeeBps: number
}

export interface RevenueByCollectionRow {
  id: string
  name: string
  slug: string
  mintAddress?: string
  creatorAddress: string
  creator: string
  minted: number
  totalSupply: number
  price: number | null
  platformFeeBps: number
  feeRevenue: number
}

export interface RevenueByCreatorRow {
  creatorAddress: string
  displayName: string
  collectionCount: number
  totalMinted: number
  feeRevenue: number
}

export interface RevenueTimeseriesPoint {
  bucket: string
  feeRevenue: number
  minted: number
}

// ── Audit log ────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string
  actorId?: string
  actorEmail?: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  txSignature?: string
  ip?: string
  createdAt: string
}

export interface ActivityLog {
  id: string
  userName?: string
  action: string
  resource?: string
  details?: string
  timestamp: string
  ip?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  walletAddress?: string
  lastActiveAt: string
  createdAt: string
}

export interface DashboardKpi {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
}

export interface GeneralSettings {
  siteName: string
  timezone: string
  language: string
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
}

export interface ApiKey {
  id: string
  name: string
  maskedKey: string
  lastUsedAt?: string
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
  | 'users:read'
  | 'users:write'
  | 'api_keys:manage'
  | 'revenue:read'
