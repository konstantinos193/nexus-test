'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/tables/DataTable'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useActivityList } from '@/lib/api/hooks'
import { formatDate } from '@/lib/utils'
import type { ActivityLog } from '@/lib/types'

const PAGE_SIZE = 20

export default function LogsPage() {
  const [page, setPage] = useState(1)
  const [userFilter, setUserFilter] = useState('')

  const { data, isLoading, error, refetch } = useActivityList(
    page,
    PAGE_SIZE,
    userFilter || undefined
  )

  const columns = [
    { key: 'timestamp', header: 'Time', render: (row: ActivityLog) => formatDate(row.timestamp) },
    { key: 'userName', header: 'User' },
    { key: 'action', header: 'Action' },
    { key: 'resource', header: 'Resource' },
    { key: 'details', header: 'Details' },
  ]

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Activity' }]}
      actions={
        <Button variant="secondary" onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Filter by user..."
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value)
            setPage(1)
          }}
          className="input-base max-w-xs"
          aria-label="Filter by user"
        />
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
        >
          {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={10} cols={5} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            keyExtractor={(row) => row.id}
            emptyMessage="No activity yet"
          />
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm" style={{ color: '#8a8a9a' }}>
              <span>
                Page {data.page} of {data.totalPages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </MainLayout>
  )
}
