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
  /** Breadcrumb items: [{ label, href? }] */
  breadcrumbs?: { label: string; href?: string }[]
  /** Optional actions (Create, Export, etc.) */
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
    <div className="min-h-screen bg-surface">
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
              <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {breadcrumbs?.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">/</span>
                    )}
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-200">
                        {b.label}
                      </span>
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
