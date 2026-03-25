'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/settings': 'Settings',
  '/logs': 'Activity',
}

export function Header({
  title,
  searchPlaceholder = 'Search...',
}: {
  title?: string
  searchPlaceholder?: string
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [search, setSearch] = useState('')
  const displayTitle = title ?? pageTitles[pathname ?? ''] ?? 'Nexus Admin'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
        {displayTitle}
      </h1>
      <div className="flex flex-1 items-center justify-end gap-4 max-w-md ml-auto">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base max-w-xs py-1.5 text-sm"
          aria-label="Search"
        />
        <button
          type="button"
          className="rounded-lg p-2 text-gray-500 hover:bg-surface-muted hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <Menu as="div" className="relative">
          <Menu.Button
            className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User menu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200">
              {user?.name?.charAt(0) ?? 'U'}
            </span>
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#profile"
                    className={cn(
                      'block px-4 py-2 text-sm',
                      active ? 'bg-surface-muted' : '',
                      'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Profile
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#settings"
                    className={cn(
                      'block px-4 py-2 text-sm',
                      active ? 'bg-surface-muted' : '',
                      'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Settings
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={logout}
                    className={cn(
                      'block w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400',
                      active && 'bg-surface-muted'
                    )}
                  >
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  )
}
