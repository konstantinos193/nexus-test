/**
 * Mock data for development when backend is not available.
 * Replace with real api calls in production.
 */

import type {
  ActivityLog,
  ApiKey,
  GeneralSettings,
  KpiMetric,
  PaginatedResponse,
  SecuritySettings,
  User,
} from '../types'

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@nexus.dev',
    name: 'Admin User',
    role: 'admin',
    lastActiveAt: new Date().toISOString(),
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    email: 'editor@nexus.dev',
    name: 'Editor User',
    role: 'editor',
    walletAddress: '0x742d...8a2f',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: '2024-02-01T12:00:00Z',
  },
  {
    id: '3',
    email: 'viewer@nexus.dev',
    name: 'Viewer User',
    role: 'viewer',
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: '2024-03-10T09:00:00Z',
  },
]

export const mockActivity: ActivityLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Admin User',
    action: 'user.created',
    resource: 'users',
    details: 'Created user editor@nexus.dev',
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    userId: '2',
    userName: 'Editor User',
    action: 'wallet.transaction',
    resource: 'wallet',
    details: 'Transaction confirmed',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    userId: '1',
    userName: 'Admin User',
    action: 'settings.updated',
    resource: 'settings',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
]

export const mockKpis: KpiMetric[] = [
  { label: 'Total Users', value: 1247, change: 12, changeLabel: 'vs last month' },
  { label: 'Active Sessions', value: 89, change: -3, changeLabel: 'vs last week' },
  { label: 'Transactions', value: '1,432', change: 8, changeLabel: 'vs last month' },
  { label: 'API Calls', value: '24.2k', change: 5, changeLabel: 'vs last week' },
]

export const mockGeneralSettings: GeneralSettings = {
  siteName: 'Nexus Admin',
  timezone: 'America/New_York',
  language: 'en',
}

export const mockSecuritySettings: SecuritySettings = {
  twoFactorEnabled: true,
  sessionTimeout: 30,
}

export const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production API',
    lastUsedAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    maskedKey: 'nex_••••••••••••••••••••••••',
  },
]

export function mockPaginatedUsers(
  page: number,
  pageSize: number,
  search?: string
): PaginatedResponse<User> {
  let data = [...mockUsers]
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
    )
  }
  const total = data.length
  const start = (page - 1) * pageSize
  const slice = data.slice(start, start + pageSize)
  return {
    data: slice,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

export function mockActivityList(
  _page: number,
  _pageSize: number,
  _userId?: string
): PaginatedResponse<ActivityLog> {
  return {
    data: mockActivity,
    total: mockActivity.length,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  }
}
