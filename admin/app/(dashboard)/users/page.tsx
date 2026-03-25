'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/tables/DataTable'
import { Modal } from '@/components/modals/Modal'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useUsersList, useDeleteUser } from '@/lib/api/hooks'
import { useAuth } from '@/lib/auth/context'
import { formatDate } from '@/lib/utils'
import type { User } from '@/lib/types'

const PAGE_SIZE = 10

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const { hasPermission } = useAuth()

  const { data, isLoading, error, refetch } = useUsersList(page, PAGE_SIZE, search || undefined)
  const deleteUser = useDeleteUser({
    onSuccess: () => setDeleteTarget(null),
  })

  const canWrite = hasPermission('users:write')

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (row: User) => (
        <StatusBadge status={row.role} size="sm" />
      ),
    },
    {
      key: 'walletAddress',
      header: 'Wallet',
      render: (row: User) =>
        row.walletAddress ? (
          <span className="font-mono text-xs">{row.walletAddress}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'lastActiveAt',
      header: 'Last active',
      render: (row: User) => formatDate(row.lastActiveAt),
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            render: (row: User) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(row)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Users' }]}
      actions={
        <>
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
          {canWrite && (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Create user
            </Button>
          )}
        </>
      }
    >
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="input-base max-w-xs"
          aria-label="Search users"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {(error as Error).message}
        </div>
      )}

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : !data?.data.length ? (
        <EmptyState
          title="No users found"
          description="Create a user or adjust your search."
          action={
            canWrite && (
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create user
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data!.data}
            keyExtractor={(row) => row.id}
            emptyMessage="No users"
          />
          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        size="md"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect to your API to create users. This modal is a placeholder for your create-user form.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
        title="Delete user"
        message={
          deleteTarget ? (
            <>Are you sure you want to delete {deleteTarget.name}? This action cannot be undone.</>
          ) : (
            ''
          )
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteUser.isPending}
      />
    </MainLayout>
  )
}
