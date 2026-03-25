'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import {
  useSettingsGeneral,
  useSettingsSecurity,
  useSettingsApiKeys,
} from '@/lib/api/hooks'
import { useAuth } from '@/lib/auth/context'
import { formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

type SettingsTab = 'general' | 'security' | 'api-keys'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const { hasPermission } = useAuth()

  const { data: general, isLoading: generalLoading } = useSettingsGeneral()
  const { data: security, isLoading: securityLoading } = useSettingsSecurity()
  const { data: apiKeys, isLoading: apiKeysLoading } = useSettingsApiKeys()

  const canManageApiKeys = hasPermission('api_keys:manage')

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    ...(canManageApiKeys ? [{ id: 'api-keys' as const, label: 'API keys' }] : []),
  ]

  return (
    <MainLayout breadcrumbs={[{ label: 'Settings' }]}>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="shrink-0 md:w-48" aria-label="Settings sections">
          <ul className="space-y-0.5">
            {tabs.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-surface-muted text-gray-900 dark:text-white'
                      : 'text-gray-600 hover:bg-surface-muted hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1">
          {tab === 'general' && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                General settings
              </h2>
              {generalLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : general ? (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Site name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {general.siteName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Timezone
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {general.timezone}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Language
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {general.language}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          )}

          {tab === 'security' && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                Security
              </h2>
              {securityLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : security ? (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Two-factor authentication
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Session timeout (minutes)
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {security.sessionTimeout}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          )}

          {tab === 'api-keys' && canManageApiKeys && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
                API keys
              </h2>
              {apiKeysLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apiKeys?.length ? (
                <ul className="divide-y divide-border">
                  {apiKeys.map((key) => (
                    <li
                      key={key.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {key.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {key.maskedKey}
                          {key.lastUsedAt && (
                            <> · Last used {formatDate(key.lastUsedAt)}</>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400">
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No API keys yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
