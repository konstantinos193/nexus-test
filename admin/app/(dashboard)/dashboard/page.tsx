'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { TransactionStatusIndicator } from '@/components/ui/TransactionStatusIndicator'
import { SkeletonKpi, SkeletonTable } from '@/components/ui/Skeleton'
import { useDashboardKpis, useDashboardRecentActivity } from '@/lib/api/hooks'
import { formatRelativeTime } from '@/lib/utils'
import type { ActivityLog } from '@/lib/types'

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useDashboardKpis()
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = useDashboardRecentActivity()

  const handleRefresh = () => {
    refetchKpis()
    refetchRecent()
  }

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Dashboard' }]}
      actions={
        <Button variant="secondary" onClick={handleRefresh}>
          Refresh
        </Button>
      }
    >
      {/* KPIs */}
      <section className="mb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#8a8a9a' }}
        >
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpisLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
            : kpis?.map((kpi, i) => (
                <div key={i} className="card p-5">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8a8a9a' }}>
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold" style={{ color: '#ffffff' }}>
                    {kpi.value}
                  </p>
                  {kpi.change != null && (
                    <p className="mt-1 text-xs" style={{ color: '#8a8a9a' }}>
                      <span
                        style={{
                          color: kpi.change >= 0 ? '#10b981' : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                      </span>
                      {' '}{kpi.changeLabel}
                    </p>
                  )}
                </div>
              ))}
        </div>
      </section>

      {/* Wallet status */}
      <section className="mb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#8a8a9a' }}
        >
          Wallet / Transaction Status
        </h2>
        <div className="card p-5">
          <div className="flex flex-wrap gap-6">
            <TransactionStatusIndicator status="pending" />
            <TransactionStatusIndicator status="confirming" />
            <TransactionStatusIndicator status="confirmed" />
            <TransactionStatusIndicator status="failed" />
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#8a8a9a' }}
        >
          Recent Activity
        </h2>
        {recentLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y" style={{ borderColor: '#252535' }}>
              <thead style={{ background: '#1a1a24' }}>
                <tr>
                  {['User', 'Action', 'Details', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: '#8a8a9a' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#252535' }}>
                {(recent ?? []).map((log: ActivityLog) => (
                  <tr
                    key={log.id}
                    className="transition-colors duration-100"
                    style={{ color: '#b8b8c8' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(31,31,46,0.5)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium" style={{ color: '#ffffff' }}>
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#b8b8c8' }}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#8a8a9a' }}>
                      {log.details ?? log.resource ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm" style={{ color: '#8a8a9a' }}>
                      {formatRelativeTime(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </MainLayout>
  )
}
