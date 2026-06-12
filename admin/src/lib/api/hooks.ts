import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { endpoints } from './endpoints'
import { api } from './client'
import {
  mockAdminStats,
  mockCreators,
  mockPaginatedCollections,
  mockActivityList,
  mockCollections,
  mockDashboardKpis,
  mockDashboardActivity,
  mockPaginatedUsers,
  mockGeneralSettings,
  mockSecuritySettings,
  mockApiKeys,
} from './mock'
import type {
  ActivityLog,
  AdminRole,
  AdminStats,
  AdminUser,
  ApiKey,
  AuditEntry,
  Collection,
  Creator,
  DashboardKpi,
  GeneralSettings,
  PaginatedResponse,
  RevenueByCollectionRow,
  RevenueByCreatorRow,
  RevenueSummary,
  RevenueTimeseriesPoint,
  SecuritySettings,
  User,
} from '../types'

const useMock = !process.env.NEXT_PUBLIC_API_URL

const QUERY_KEYS = {
  adminStats: ['admin', 'stats'] as const,
  collections: (filters: object) => ['collections', filters] as const,
  collection: (id: string) => ['collections', id] as const,
  creators: ['admin', 'creators'] as const,
  health: ['infra', 'health'] as const,
  ipfsHealth: ['infra', 'ipfs', 'health'] as const,
  ipfsPins: ['infra', 'ipfs', 'pins'] as const,
  solanaNetwork: ['infra', 'solana', 'network'] as const,
  solanaConfig: ['infra', 'solana', 'config'] as const,
  contractStatus: ['infra', 'contracts'] as const,
  activity: (page: number, pageSize: number) => ['activity', page, pageSize] as const,
  dashboardKpis: ['admin', 'dashboard', 'kpis'] as const,
  dashboardRecentActivity: ['admin', 'dashboard', 'recent-activity'] as const,
  users: (page: number, pageSize: number, search?: string) =>
    ['users', page, pageSize, search ?? ''] as const,
  settingsGeneral: ['settings', 'general'] as const,
  settingsSecurity: ['settings', 'security'] as const,
  settingsApiKeys: ['settings', 'api-keys'] as const,
}

// --- Admin Stats ---

export function useAdminStats(options?: UseQueryOptions<AdminStats>) {
  return useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: async () => {
      if (useMock) return mockAdminStats
      return api.get<AdminStats>(endpoints.admin.stats)
    },
    ...options,
  })
}

// --- Collections ---

export interface CollectionFilters {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  featured?: boolean
}

export function useCollections(
  filters: CollectionFilters = {},
  options?: UseQueryOptions<PaginatedResponse<Collection>>
) {
  const { page = 1, pageSize = 10, search, status, featured } = filters
  return useQuery({
    queryKey: QUERY_KEYS.collections(filters),
    queryFn: async () => {
      if (useMock) return mockPaginatedCollections(page, pageSize, search, status, featured)
      return api.get<PaginatedResponse<Collection>>(endpoints.collections.list, {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: status && status !== 'all' ? status : undefined,
          featured: featured || undefined,
        },
      })
    },
    ...options,
  })
}

export function useCollection(
  id: string | null,
  options?: UseQueryOptions<Collection | null>
) {
  return useQuery({
    queryKey: QUERY_KEYS.collection(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      if (useMock) return mockCollections.find((c) => c.id === id) ?? null
      return api.get<Collection>(endpoints.collections.byId(id))
    },
    enabled: !!id,
    ...options,
  })
}

// --- Admin Collection Mutations ---

export function useAdminUpdateCollection(
  options?: UseMutationOptions<
    void,
    Error,
    { id: string; data: { featured?: boolean; status?: string; featuredRank?: number } }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }) => {
      if (useMock) return
      await api.patch(endpoints.admin.updateCollection(id), data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['featured'] })
    },
    ...options,
  })
}

export function useAdminDeleteCollection(
  options?: UseMutationOptions<void, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      if (useMock) return
      await api.delete(endpoints.admin.deleteCollection(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
    },
    ...options,
  })
}

export function useTriggerSync(options?: UseMutationOptions<void, Error, void>) {
  return useMutation({
    mutationFn: async () => {
      if (useMock) return
      await api.post(endpoints.collections.sync)
    },
    ...options,
  })
}

// --- Creators ---

export function useCreators(options?: UseQueryOptions<Creator[]>) {
  return useQuery({
    queryKey: QUERY_KEYS.creators,
    queryFn: async () => {
      if (useMock) return mockCreators
      return api.get<Creator[]>(endpoints.admin.creators)
    },
    ...options,
  })
}

// --- Infrastructure ---

export function useHealthCheck(options?: UseQueryOptions<Record<string, unknown>>) {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: () => api.get<Record<string, unknown>>(endpoints.infrastructure.health),
    refetchInterval: 30_000,
    ...options,
  })
}

export function useIpfsHealth(options?: UseQueryOptions<Record<string, unknown>>) {
  return useQuery({
    queryKey: QUERY_KEYS.ipfsHealth,
    queryFn: () => api.get<Record<string, unknown>>(endpoints.infrastructure.ipfsHealth),
    refetchInterval: 30_000,
    ...options,
  })
}

export function useIpfsPins(options?: UseQueryOptions<unknown[]>) {
  return useQuery({
    queryKey: QUERY_KEYS.ipfsPins,
    queryFn: () => api.get<unknown[]>(endpoints.infrastructure.ipfsPins),
    ...options,
  })
}

export function useSolanaNetwork(options?: UseQueryOptions<Record<string, unknown>>) {
  return useQuery({
    queryKey: QUERY_KEYS.solanaNetwork,
    queryFn: () => api.get<Record<string, unknown>>(endpoints.infrastructure.solanaNetwork),
    refetchInterval: 30_000,
    ...options,
  })
}

export function useSolanaConfig(options?: UseQueryOptions<Record<string, unknown>>) {
  return useQuery({
    queryKey: QUERY_KEYS.solanaConfig,
    queryFn: () => api.get<Record<string, unknown>>(endpoints.infrastructure.solanaConfig),
    ...options,
  })
}

export function useContractStatus(options?: UseQueryOptions<Record<string, unknown>>) {
  return useQuery({
    queryKey: QUERY_KEYS.contractStatus,
    queryFn: () => api.get<Record<string, unknown>>(endpoints.infrastructure.contractStatus),
    refetchInterval: 60_000,
    ...options,
  })
}

// --- Activity Logs ---

export function useActivityList(
  page: number,
  pageSize: number,
  options?: UseQueryOptions<PaginatedResponse<ActivityLog>>
) {
  return useQuery({
    queryKey: QUERY_KEYS.activity(page, pageSize),
    queryFn: async () => {
      if (useMock) return mockActivityList(page, pageSize)
      return api.get<PaginatedResponse<ActivityLog>>(endpoints.activity.list, {
        params: { page, pageSize },
      })
    },
    ...options,
  })
}

// --- Dashboard ---

export function useDashboardKpis(options?: UseQueryOptions<DashboardKpi[]>) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardKpis,
    queryFn: async () => {
      if (useMock) return mockDashboardKpis
      return api.get<DashboardKpi[]>(endpoints.dashboard.kpis)
    },
    ...options,
  })
}

export function useDashboardRecentActivity(
  options?: UseQueryOptions<ActivityLog[]>
) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardRecentActivity,
    queryFn: async () => {
      if (useMock) return mockDashboardActivity
      return api.get<ActivityLog[]>(endpoints.dashboard.recentActivity)
    },
    ...options,
  })
}

// --- Users ---

export function useUsersList(
  page: number,
  pageSize: number,
  search?: string,
  options?: UseQueryOptions<PaginatedResponse<User>>
) {
  return useQuery({
    queryKey: QUERY_KEYS.users(page, pageSize, search),
    queryFn: async () => {
      if (useMock) return mockPaginatedUsers(page, pageSize, search)
      return api.get<PaginatedResponse<User>>(endpoints.users.list, {
        params: { page, pageSize, search: search || undefined },
      })
    },
    ...options,
  })
}

export function useDeleteUser(options?: UseMutationOptions<void, Error, string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      if (useMock) return
      await api.delete(endpoints.users.byId(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    ...options,
  })
}

// --- Settings ---

export function useSettingsGeneral(options?: UseQueryOptions<GeneralSettings>) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsGeneral,
    queryFn: async () => {
      if (useMock) return mockGeneralSettings
      return api.get<GeneralSettings>(endpoints.settings.general)
    },
    ...options,
  })
}

export function useSettingsSecurity(options?: UseQueryOptions<SecuritySettings>) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsSecurity,
    queryFn: async () => {
      if (useMock) return mockSecuritySettings
      return api.get<SecuritySettings>(endpoints.settings.security)
    },
    ...options,
  })
}

export function useSettingsApiKeys(options?: UseQueryOptions<ApiKey[]>) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsApiKeys,
    queryFn: async () => {
      if (useMock) return mockApiKeys
      return api.get<ApiKey[]>(endpoints.settings.apiKeys)
    },
    ...options,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner-console real-backend hooks (no mock fallback — these require NEXT_PUBLIC_API_URL).
// ─────────────────────────────────────────────────────────────────────────────

// --- Featured collections ---

export function useFeaturedCollections(options?: UseQueryOptions<Collection[]>) {
  return useQuery({
    queryKey: ['featured'],
    queryFn: () => api.get<Collection[]>(endpoints.collections.featured),
    ...options,
  })
}

export function useReorderFeatured(
  options?: UseMutationOptions<void, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds) => {
      await api.patch(endpoints.admin.reorderFeatured, { orderedIds })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['featured'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
    },
    ...options,
  })
}

export function useRestoreCollection(options?: UseMutationOptions<void, Error, string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.post(endpoints.admin.restoreCollection(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
    },
    ...options,
  })
}

// --- Revenue ---

export function useRevenueSummary(options?: UseQueryOptions<RevenueSummary>) {
  return useQuery({
    queryKey: ['revenue', 'summary'],
    queryFn: () => api.get<RevenueSummary>(endpoints.revenue.summary),
    refetchInterval: 60_000,
    ...options,
  })
}

export function useRevenueByCollection(
  limit = 100,
  options?: UseQueryOptions<RevenueByCollectionRow[]>
) {
  return useQuery({
    queryKey: ['revenue', 'by-collection', limit],
    queryFn: () =>
      api.get<RevenueByCollectionRow[]>(endpoints.revenue.byCollection, { params: { limit } }),
    ...options,
  })
}

export function useRevenueByCreator(options?: UseQueryOptions<RevenueByCreatorRow[]>) {
  return useQuery({
    queryKey: ['revenue', 'by-creator'],
    queryFn: () => api.get<RevenueByCreatorRow[]>(endpoints.revenue.byCreator),
    ...options,
  })
}

export function useRevenueTimeseries(
  params: { from?: string; to?: string; bucket?: string; includeBaseline?: boolean } = {},
  options?: UseQueryOptions<RevenueTimeseriesPoint[]>
) {
  return useQuery({
    queryKey: ['revenue', 'timeseries', params],
    queryFn: () =>
      api.get<RevenueTimeseriesPoint[]>(endpoints.revenue.timeseries, {
        params: {
          from: params.from,
          to: params.to,
          bucket: params.bucket,
          includeBaseline: params.includeBaseline,
        },
      }),
    ...options,
  })
}

// --- Audit log ---

export function useAuditLog(
  params: { page?: number; pageSize?: number; action?: string } = {},
  options?: UseQueryOptions<PaginatedResponse<AuditEntry> & { data: AuditEntry[] }>
) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () =>
      api.get<PaginatedResponse<AuditEntry> & { data: AuditEntry[] }>(endpoints.admin.audit, {
        params: { page: params.page, pageSize: params.pageSize, action: params.action },
      }),
    ...options,
  })
}

// --- Admin users (auth) ---

export function useAdminUsers(options?: UseQueryOptions<AdminUser[]>) {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>(endpoints.auth.users),
    ...options,
  })
}

export function useCreateAdminUser(
  options?: UseMutationOptions<
    AdminUser,
    Error,
    { email: string; password: string; displayName: string; role: AdminRole }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post<AdminUser>(endpoints.auth.users, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    ...options,
  })
}

export function useUpdateAdminUser(
  options?: UseMutationOptions<
    AdminUser,
    Error,
    { id: string; data: { displayName?: string; role?: AdminRole; disabled?: boolean; password?: string } }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.patch<AdminUser>(endpoints.auth.userById(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    ...options,
  })
}
