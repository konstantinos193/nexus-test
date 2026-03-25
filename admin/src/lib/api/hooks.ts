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
  mockPaginatedUsers,
  mockActivityList,
  mockKpis,
  mockActivity,
  mockGeneralSettings,
  mockSecuritySettings,
  mockApiKeys,
} from './mock'
import type {
  ActivityLog,
  ApiKey,
  GeneralSettings,
  PaginatedResponse,
  SecuritySettings,
  User,
} from '../types'

const QUERY_KEYS = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  usersList: (page: number, pageSize: number, search?: string) =>
    ['users', page, pageSize, search] as const,
  activity: (page: number, pageSize: number, userId?: string) =>
    ['activity', page, pageSize, userId] as const,
  dashboardKpis: ['dashboard', 'kpis'] as const,
  dashboardRecent: ['dashboard', 'recent'] as const,
  settingsGeneral: ['settings', 'general'] as const,
  settingsSecurity: ['settings', 'security'] as const,
  settingsApiKeys: ['settings', 'apiKeys'] as const,
}

/** Check if we have a real API (e.g. VITE_API_URL set); otherwise use mocks */
const useMock = !import.meta.env.VITE_API_URL

// --- Users ---

export function useUsersList(
  page: number,
  pageSize: number,
  search?: string,
  options?: UseQueryOptions<PaginatedResponse<User>>
) {
  return useQuery({
    queryKey: QUERY_KEYS.usersList(page, pageSize, search),
    queryFn: async () => {
      if (useMock) return mockPaginatedUsers(page, pageSize, search)
      return api.get<PaginatedResponse<User>>(endpoints.users.list, {
        params: { page, pageSize, search: search ?? undefined },
      })
    },
    ...options,
  })
}

export function useUser(
  id: string | null,
  options?: UseQueryOptions<User | null>
) {
  return useQuery({
    queryKey: QUERY_KEYS.user(id ?? ''),
    queryFn: async () => {
      if (!id) return null
      if (useMock) {
        const u = (await import('./mock')).mockUsers.find((x) => x.id === id)
        return u ?? null
      }
      return api.get<User>(endpoints.users.byId(id))
    },
    enabled: !!id,
    ...options,
  })
}

export function useCreateUser(
  options?: UseMutationOptions<User, Error, Omit<User, 'id' | 'createdAt' | 'lastActiveAt'>>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      if (useMock) {
        const newUser: User = {
          ...data,
          id: String(Date.now()),
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        }
        return newUser
      }
      return api.post<User>(endpoints.users.create, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users })
    },
    ...options,
  })
}

export function useUpdateUser(
  options?: UseMutationOptions<User, Error, { id: string; data: Partial<User> }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }) => {
      if (useMock) {
        return { ...(await import('./mock')).mockUsers.find((u) => u.id === id)!, ...data }
      }
      return api.patch<User>(endpoints.users.update(id), data)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.user(id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users })
    },
    ...options,
  })
}

export function useDeleteUser(options?: UseMutationOptions<void, Error, string>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      if (useMock) return
      await api.delete(endpoints.users.delete(id))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users })
    },
    ...options,
  })
}

// --- Activity / Logs ---

export function useActivityList(
  page: number,
  pageSize: number,
  userId?: string,
  options?: UseQueryOptions<PaginatedResponse<ActivityLog>>
) {
  return useQuery({
    queryKey: QUERY_KEYS.activity(page, pageSize, userId),
    queryFn: async () => {
      if (useMock) return mockActivityList(page, pageSize, userId)
      return api.get<PaginatedResponse<ActivityLog>>(endpoints.activity.list, {
        params: { page, pageSize, userId: userId ?? undefined },
      })
    },
    ...options,
  })
}

// --- Dashboard ---

export function useDashboardKpis(options?: UseQueryOptions<typeof mockKpis>) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardKpis,
    queryFn: async () => {
      if (useMock) return mockKpis
      return api.get(endpoints.dashboard.kpis)
    },
    ...options,
  })
}

export function useDashboardRecentActivity(
  options?: UseQueryOptions<ActivityLog[]>
) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardRecent,
    queryFn: async () => {
      if (useMock) return mockActivity
      return api.get(endpoints.dashboard.recentActivity)
    },
    ...options,
  })
}

// --- Settings ---

export function useSettingsGeneral(
  options?: UseQueryOptions<GeneralSettings>
) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsGeneral,
    queryFn: async () => {
      if (useMock) return mockGeneralSettings
      return api.get(endpoints.settings.general)
    },
    ...options,
  })
}

export function useSettingsSecurity(
  options?: UseQueryOptions<SecuritySettings>
) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsSecurity,
    queryFn: async () => {
      if (useMock) return mockSecuritySettings
      return api.get(endpoints.settings.security)
    },
    ...options,
  })
}

export function useSettingsApiKeys(options?: UseQueryOptions<ApiKey[]>) {
  return useQuery({
    queryKey: QUERY_KEYS.settingsApiKeys,
    queryFn: async () => {
      if (useMock) return mockApiKeys
      return api.get(endpoints.settings.apiKeys)
    },
    ...options,
  })
}
