'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Permission } from '../types'

interface SessionUser {
  name: string
  permissions: Permission[]
}

const PLATFORM_ADMIN: SessionUser = {
  name: 'Platform Admin',
  permissions: [
    'collections:read',
    'collections:write',
    'creators:read',
    'infrastructure:read',
    'settings:read',
    'settings:write',
    'logs:read',
  ],
}

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  hasPermission: (permission: string) => boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(PLATFORM_ADMIN)

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false
      return user.permissions?.includes(permission as Permission) ?? false
    },
    [user]
  )

  const login = useCallback(async (_email: string, _password: string) => {
    setUser(PLATFORM_ADMIN)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, hasPermission, login, logout }),
    [user, hasPermission, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
