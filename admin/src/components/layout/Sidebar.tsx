'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { useSidebar } from './SidebarContext'

const navItems: { href: string; label: string; icon: string; permission?: string }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', permission: 'users:read' },
  { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', permission: 'settings:read' },
  { href: '/logs', label: 'Activity', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', permission: 'logs:read' },
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
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-[width] duration-200',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
      style={{ background: '#111118', borderRight: '1px solid #252535' }}
      aria-label="Primary navigation"
    >
      {/* Logo row */}
      <div
        className="flex h-14 shrink-0 items-center justify-between px-4"
        style={{ borderBottom: '1px solid #252535' }}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/nexuslogo_nobg.png"
              alt="NeXus Launchpad"
              width={130}
              height={43}
              priority
              className="logo-pulse h-8 w-auto"
            />
            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
              Admin
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 transition-colors duration-150"
          style={{ color: '#8a8a9a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1f1f2e'; (e.currentTarget as HTMLElement).style.color = '#ffffff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8a8a9a' }}
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

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center'
              )}
              style={
                isActive
                  ? {
                      background: 'rgba(0, 212, 255, 0.06)',
                      color: '#00d4ff',
                      borderLeft: '2px solid #00d4ff',
                      boxShadow:
                        '0 0 14px rgba(0, 212, 255, 0.35), 0 0 28px rgba(124, 58, 237, 0.15), inset 0 0 14px rgba(0, 212, 255, 0.04)',
                    }
                  : {
                      color: '#8a8a9a',
                      borderLeft: '2px solid transparent',
                    }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '#1f1f2e'
                  ;(e.currentTarget as HTMLElement).style.color = '#ffffff'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#8a8a9a'
                }
              }}
              title={collapsed ? item.label : undefined}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom version tag */}
      {!collapsed && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid #252535' }}>
          <p className="text-xs" style={{ color: '#8a8a9a' }}>Nexus Admin v1.0</p>
        </div>
      )}
    </aside>
  )
}
