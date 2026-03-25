'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Role, SessionUser } from '../types'

/** Default demo user for development */
const DEMO_USER: SessionUser = {
  id: '1',
  email: 'admin@nexus.dev',
  name: 'Admin User',
  role: 'admin',
  lastActiveAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  permissions: [
    'users:read',
    'users:write',
    'settings:read',
    'settings:write',
    'logs:read',
    'wallet:view',
    'wallet:transact',
    'api_keys:manage',
  ],
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'users:read',
    'users:write',
    'settings:read',
    'settings:write',
    'logs:read',
    'wallet:view',
    'wallet:transact',
    'api_keys:manage',
  ],
  editor: ['users:read', 'logs:read', 'wallet:view', 'wallet:transact'],
  viewer: ['users:read', 'logs:read', 'wallet:view'],
}

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: SessionUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(DEMO_USER)

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false
      return user.permissions?.includes(permission) ?? false
    },
    [user]
  )

  const login = useCallback(async (_email: string, _password: string) => {
    // In production, call your auth API and set user from response
    setUser(DEMO_USER)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      hasPermission,
      login,
      logout,
      setUser,
    }),
    [user, hasPermission, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Resolve permissions for a role (for API layer or backend reference) */
export function getPermissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? []
}
