'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from './SidebarContext'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: ReactNode
  title?: string
  searchPlaceholder?: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: ReactNode
  className?: string
}

export function MainLayout({
  children,
  title,
  searchPlaceholder,
  breadcrumbs,
  actions,
  className,
}: MainLayoutProps) {
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <Sidebar />
      <div
        className={cn(
          'flex flex-col transition-[margin] duration-200',
          collapsed ? 'md:ml-16' : 'md:ml-[16rem]'
        )}
      >
        <Header title={title} searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 p-6">
          {(breadcrumbs?.length ?? 0) > 0 && (
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-2 text-sm" style={{ color: '#8a8a9a' }}>
                {breadcrumbs?.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i > 0 && <span style={{ color: '#252535' }}>/</span>}
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="transition-colors duration-150 hover:text-white"
                        style={{ color: '#8a8a9a' }}
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span style={{ color: '#b8b8c8' }}>{b.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {actions && (
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          )}
          <div className={className}>{children}</div>
        </main>
      </div>
    </div>
  )
}
