/**
 * Centralized API endpoint paths. Keeps routes consistent and easy to change.
 */

export const endpoints = {
  users: {
    list: '/users',
    byId: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  activity: {
    list: '/activity',
  },
  settings: {
    general: '/settings/general',
    security: '/settings/security',
    apiKeys: '/settings/api-keys',
    apiKeyRevoke: (id: string) => `/settings/api-keys/${id}/revoke`,
  },
  dashboard: {
    kpis: '/dashboard/kpis',
    recentActivity: '/dashboard/recent-activity',
  },
  auth: {
    me: '/auth/me',
    login: '/auth/login',
    logout: '/auth/logout',
  },
} as const
