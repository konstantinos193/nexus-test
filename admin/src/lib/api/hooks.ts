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
} from './mock'
import type {
  ActivityLog,
  AdminStats,
  Collection,
  Creator,
  PaginatedResponse,
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
  options?: UseMutationOptions<void, Error, { id: string; data: { featured?: boolean; status?: string } }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }) => {
      if (useMock) return
      await api.patch(endpoints.admin.updateCollection(id), data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
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
