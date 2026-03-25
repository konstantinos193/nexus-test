'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { useSidebar } from './SidebarContext'

const navItems: { href: string; label: string; permission?: string }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Users', permission: 'users:read' },
  { href: '/settings', label: 'Settings', permission: 'settings:read' },
  { href: '/logs', label: 'Activity', permission: 'logs:read' },
]

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const { hasPermission } = useAuth()
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
      aria-label="Primary navigation"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <span className="text-lg">Nexus</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-2 text-gray-500 hover:bg-surface-muted hover:text-gray-700 dark:hover:text-gray-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-surface-muted text-gray-900 dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 hover:bg-surface-muted hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
