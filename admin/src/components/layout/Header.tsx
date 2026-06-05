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
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 px-6"
      style={{ background: '#111118', borderBottom: '1px solid #252535' }}
    >
      <h1 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
        {displayTitle}
      </h1>

      <div className="flex flex-1 items-center justify-end gap-3 max-w-md ml-auto">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base max-w-xs py-1.5 text-sm"
          aria-label="Search"
        />

        {/* Notifications */}
        <button
          type="button"
          className="rounded-lg p-2 transition-colors duration-150"
          style={{ color: '#8a8a9a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1f1f2e'; (e.currentTarget as HTMLElement).style.color = '#00d4ff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8a8a9a' }}
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors duration-150 focus:outline-none"
            style={{ color: '#b8b8c8' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1f1f2e'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            aria-label="User menu"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.2)' }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#8a8a9a' }}>
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
            <Menu.Items
              className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl py-1 focus:outline-none"
              style={{ background: '#1a1a24', border: '1px solid #252535', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            >
              {user?.name && (
                <div className="px-4 py-2 mb-1" style={{ borderBottom: '1px solid #252535' }}>
                  <p className="text-xs font-medium" style={{ color: '#b8b8c8' }}>{user.name}</p>
                </div>
              )}
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#profile"
                    className={cn('block px-4 py-2 text-sm transition-colors duration-100')}
                    style={{ color: active ? '#ffffff' : '#b8b8c8', background: active ? '#1f1f2e' : 'transparent' }}
                  >
                    Profile
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#settings"
                    className={cn('block px-4 py-2 text-sm transition-colors duration-100')}
                    style={{ color: active ? '#ffffff' : '#b8b8c8', background: active ? '#1f1f2e' : 'transparent' }}
                  >
                    Settings
                  </a>
                )}
              </Menu.Item>
              <div style={{ height: '1px', background: '#252535', margin: '4px 0' }} />
              <Menu.Item>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={logout}
                    className={cn('block w-full px-4 py-2 text-left text-sm transition-colors duration-100')}
                    style={{ color: active ? '#ef4444' : '#f87171', background: active ? '#1f1f2e' : 'transparent' }}
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
