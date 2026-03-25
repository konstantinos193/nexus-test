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
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpisLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
            : kpis?.map((kpi, i) => (
                <div key={i} className="card p-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {kpi.value}
                  </p>
                  {kpi.change != null && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className={kpi.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                      </span>
                      {' '}{kpi.changeLabel}
                    </p>
                  )}
                </div>
              ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Wallet / transaction status
        </h2>
        <div className="card p-4">
          <div className="flex flex-wrap gap-6">
            <TransactionStatusIndicator status="pending" />
            <TransactionStatusIndicator status="confirming" />
            <TransactionStatusIndicator status="confirmed" />
            <TransactionStatusIndicator status="failed" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Recent activity
        </h2>
        {recentLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(recent ?? []).map((log: ActivityLog) => (
                  <tr key={log.id} className="hover:bg-surface-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {log.details ?? log.resource ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
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
