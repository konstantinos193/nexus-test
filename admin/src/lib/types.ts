/** Role-based access levels */
export type Role = 'admin' | 'editor' | 'viewer'

/** User model (API-compatible) */
export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl?: string
  walletAddress?: string
  lastActiveAt: string
  createdAt: string
}

/** Session / current user */
export interface SessionUser extends User {
  permissions: Permission[]
}

/** Permission flags for wallet-aware and feature access */
export type Permission =
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | 'logs:read'
  | 'wallet:view'
  | 'wallet:transact'
  | 'api_keys:manage'

/** Transaction status for wallet/activity indicators */
export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed'

/** Activity log entry */
export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  resource?: string
  details?: string
  timestamp: string
  ip?: string
}

/** Paginated response (REST/tRPC compatible) */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** API error shape */
export interface ApiError {
  message: string
  code?: string
  status?: number
}

/** KPI / dashboard metric */
export interface KpiMetric {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
}

/** Settings sections */
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
  lastUsedAt?: string
  createdAt: string
  maskedKey: string
}
