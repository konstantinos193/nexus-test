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
    ...(canManageApiKeys ? [{ id: 'api-keys' as const, label: 'API Keys' }] : []),
  ]

  return (
    <MainLayout breadcrumbs={[{ label: 'Settings' }]}>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Tab nav */}
        <nav className="shrink-0 md:w-48" aria-label="Settings sections">
          <ul className="space-y-0.5">
            {tabs.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150"
                  style={
                    tab === t.id
                      ? {
                          background: 'rgba(0, 212, 255, 0.08)',
                          color: '#00d4ff',
                          borderLeft: '2px solid #00d4ff',
                        }
                      : {
                          background: 'transparent',
                          color: '#8a8a9a',
                          borderLeft: '2px solid transparent',
                        }
                  }
                  onMouseEnter={e => {
                    if (tab !== t.id) {
                      (e.currentTarget as HTMLElement).style.background = '#1f1f2e'
                      ;(e.currentTarget as HTMLElement).style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={e => {
                    if (tab !== t.id) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = '#8a8a9a'
                    }
                  }}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {tab === 'general' && (
            <div className="card p-6">
              <h2 className="mb-4 text-base font-semibold" style={{ color: '#ffffff' }}>
                General Settings
              </h2>
              {generalLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : general ? (
                <dl className="space-y-4">
                  {[
                    { label: 'Site name', value: general.siteName },
                    { label: 'Timezone', value: general.timezone },
                    { label: 'Language', value: general.language },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #252535' }}>
                      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8a8a9a' }}>
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium" style={{ color: '#ffffff' }}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )}

          {tab === 'security' && (
            <div className="card p-6">
              <h2 className="mb-4 text-base font-semibold" style={{ color: '#ffffff' }}>
                Security
              </h2>
              {securityLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : security ? (
                <dl className="space-y-4">
                  {[
                    { label: 'Two-factor authentication', value: security.twoFactorEnabled ? 'Enabled' : 'Disabled' },
                    { label: 'Session timeout (minutes)', value: String(security.sessionTimeout) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #252535' }}>
                      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8a8a9a' }}>
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium" style={{ color: '#ffffff' }}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )}

          {tab === 'api-keys' && canManageApiKeys && (
            <div className="card p-6">
              <h2 className="mb-4 text-base font-semibold" style={{ color: '#ffffff' }}>
                API Keys
              </h2>
              {apiKeysLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apiKeys?.length ? (
                <ul className="divide-y" style={{ borderColor: '#252535' }}>
                  {apiKeys.map((key) => (
                    <li
                      key={key.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#ffffff' }}>
                          {key.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#8a8a9a' }}>
                          <span className="font-mono">{key.maskedKey}</span>
                          {key.lastUsedAt && (
                            <> · Last used {formatDate(key.lastUsedAt)}</>
                          )}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" style={{ color: '#ef4444' }}>
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: '#8a8a9a' }}>
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
