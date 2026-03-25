'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './context'

interface ProtectedRouteProps {
  children: ReactNode
  permission?: string
}

/** Wraps routes that require authentication; optionally checks a permission */
export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      const from = pathname ? `/login?from=${encodeURIComponent(pathname)}` : '/login'
      router.replace(from)
      return
    }
  }, [isAuthenticated, router, pathname])

  if (!isAuthenticated) {
    return null
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
