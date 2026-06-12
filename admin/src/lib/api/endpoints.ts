export const endpoints = {
  auth: {
    login: '/api/admin/auth/login',
    me: '/api/admin/auth/me',
    users: '/api/admin/auth/users',
    userById: (id: string) => `/api/admin/auth/users/${id}`,
  },
  collections: {
    list: '/api/collections',
    byId: (id: string) => `/api/collections/${id}`,
    featured: '/api/collections/featured',
    sync: '/api/collections/sync',
    onchain: (address: string) => `/api/collections/onchain/${address}`,
  },
  admin: {
    stats: '/api/admin/stats',
    creators: '/api/admin/creators',
    audit: '/api/admin/audit',
    updateCollection: (id: string) => `/api/admin/collections/${id}`,
    deleteCollection: (id: string) => `/api/admin/collections/${id}`,
    restoreCollection: (id: string) => `/api/admin/collections/${id}/restore`,
    reorderFeatured: '/api/admin/featured/order',
  },
  revenue: {
    summary: '/api/admin/revenue/summary',
    byCollection: '/api/admin/revenue/by-collection',
    byCreator: '/api/admin/revenue/by-creator',
    timeseries: '/api/admin/revenue/timeseries',
    exportCsv: '/api/admin/revenue/export.csv',
  },
  // Legacy mock-only endpoints — retained so the not-yet-migrated pages still compile.
  // These have no real backend implementation; they only return data in mock mode.
  dashboard: {
    kpis: '/api/admin/dashboard/kpis',
    recentActivity: '/api/admin/dashboard/recent-activity',
  },
  users: {
    list: '/api/admin/users',
    byId: (id: string) => `/api/admin/users/${id}`,
  },
  settings: {
    general: '/api/admin/settings/general',
    security: '/api/admin/settings/security',
    apiKeys: '/api/admin/settings/api-keys',
  },
  activity: {
    list: '/api/activity',
  },
  infrastructure: {
    health: '/health',
    ipfsHealth: '/api/ipfs/health',
    ipfsPins: '/api/ipfs/pins',
    solanaNetwork: '/api/solana/network',
    solanaConfig: '/api/solana/config',
    contractStatus: '/api/solana/contracts/status',
  },
} as const
