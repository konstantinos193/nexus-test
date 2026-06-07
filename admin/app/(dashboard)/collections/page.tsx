'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Drawer } from '@/components/ui/Drawer'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import {
  useCollections,
  useAdminUpdateCollection,
  useAdminDeleteCollection,
  useTriggerSync,
} from '@/lib/api/hooks'
import { formatRelativeTime } from '@/lib/utils'
import type { Collection, CollectionStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'minting', label: 'Minting' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
]

function truncateAddress(addr: string) {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function CollectionDrawer({
  collection,
  onClose,
}: {
  collection: Collection
  onClose: () => void
}) {
  return (
    <Drawer open={!!collection} onClose={onClose} title={collection.name}>
      <div className="space-y-6 text-sm">
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Identity
          </h3>
          <dl className="space-y-2">
            <Row label="Slug" value={collection.slug} mono />
            <Row label="Creator" value={collection.creator} />
            <Row label="Creator Address" value={collection.creatorAddress} mono />
            <Row label="Blockchain" value={collection.blockchain} />
          </dl>
        </section>

        {collection.mintAddress && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              On-chain
            </h3>
            <dl className="space-y-2">
              <Row label="Mint Address" value={collection.mintAddress} mono />
              {collection.txSignature && (
                <Row label="Tx Signature" value={`${collection.txSignature.slice(0, 20)}…`} mono />
              )}
              <div className="pt-1">
                <a
                  href={`https://explorer.solana.com/address/${collection.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:text-cyan-400 underline"
                >
                  View on Solana Explorer ↗
                </a>
              </div>
            </dl>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Economics
          </h3>
          <dl className="space-y-2">
            <Row label="Price" value={collection.price != null ? `${collection.price} SOL` : 'Free'} />
            <Row label="Royalty" value={collection.royaltyBasisPoints != null ? `${collection.royaltyBasisPoints / 100}%` : '—'} />
            <Row label="Platform Fee" value={collection.platformFeeBasisPoints != null ? `${collection.platformFeeBasisPoints / 100}%` : '—'} />
            {collection.fundReceivers && collection.fundReceivers.length > 0 && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Fund Receivers</dt>
                <dd className="mt-1">
                  <pre className="rounded bg-surface-muted p-2 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                    {JSON.stringify(collection.fundReceivers, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {collection.phases && collection.phases.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Mint Phases
            </h3>
            <pre className="rounded bg-surface-muted p-2 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(collection.phases, null, 2)}
            </pre>
          </section>
        )}

        {(collection.twitterUrl || collection.discordUrl || collection.websiteUrl) && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Social Links
            </h3>
            <div className="space-y-1">
              {collection.twitterUrl && (
                <a href={collection.twitterUrl} target="_blank" rel="noopener noreferrer" className="block text-cyan-500 hover:text-cyan-400 underline">
                  Twitter ↗
                </a>
              )}
              {collection.discordUrl && (
                <a href={collection.discordUrl} target="_blank" rel="noopener noreferrer" className="block text-cyan-500 hover:text-cyan-400 underline">
                  Discord ↗
                </a>
              )}
              {collection.websiteUrl && (
                <a href={collection.websiteUrl} target="_blank" rel="noopener noreferrer" className="block text-cyan-500 hover:text-cyan-400 underline">
                  Website ↗
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </Drawer>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt className="w-32 flex-shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`text-gray-900 dark:text-white break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

export default function CollectionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [selected, setSelected] = useState<Collection | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Collection | null>(null)
  const [confirmPause, setConfirmPause] = useState<{ collection: Collection; action: 'paused' | 'ready' } | null>(null)

  const { data, isLoading, refetch } = useCollections({
    page,
    pageSize: 10,
    search: search || undefined,
    status,
    featured: featuredOnly || undefined,
  })

  const updateMutation = useAdminUpdateCollection()
  const deleteMutation = useAdminDeleteCollection()
  const syncMutation = useTriggerSync()

  const handleToggleFeatured = (col: Collection) => {
    updateMutation.mutate({ id: col.id, data: { featured: !col.featured } })
  }

  const handleForceStatus = () => {
    if (!confirmPause) return
    updateMutation.mutate(
      { id: confirmPause.collection.id, data: { status: confirmPause.action } },
      { onSuccess: () => setConfirmPause(null) }
    )
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    deleteMutation.mutate(confirmDelete.id, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  const handleSync = () => {
    syncMutation.mutate()
  }

  const totalPages = data?.totalPages ?? 1

  return (
    <MainLayout
      breadcrumbs={[{ label: 'Collections' }]}
      actions={
        <Button
          variant="secondary"
          onClick={handleSync}
          isLoading={syncMutation.isPending}
        >
          Trigger Sync
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search collections…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={featuredOnly}
            onChange={(e) => { setFeaturedOnly(e.target.checked); setPage(1) }}
            className="rounded border-border accent-cyan-500"
          />
          Featured only
        </label>
        {data && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {data.total} collection{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={10} cols={8} />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-muted">
              <tr>
                {['Name', 'Creator', 'Status', 'Minted / Supply', 'Price', 'Featured', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No collections found.
                  </td>
                </tr>
              ) : (
                (data?.data ?? []).map((col) => (
                  <tr
                    key={col.id}
                    className="hover:bg-surface-muted/50 cursor-pointer"
                    onClick={() => setSelected(col)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[160px] truncate">
                      {col.name}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                      {truncateAddress(col.creatorAddress)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={col.effectiveStatus} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {col.minted.toLocaleString()} / {col.totalSupply.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {col.price != null && col.price > 0 ? `${col.price} SOL` : 'Free'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(col)}
                        title={col.featured ? 'Remove from featured' : 'Add to featured'}
                        className={`text-lg leading-none transition-colors ${col.featured ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-yellow-400'}`}
                      >
                        ★
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(col.createdAt)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {col.mintAddress && (
                          <a
                            href={`https://explorer.solana.com/address/${col.mintAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on-chain"
                            className="text-cyan-500 hover:text-cyan-400 text-xs"
                          >
                            Chain ↗
                          </a>
                        )}
                        <button
                          type="button"
                          title={col.effectiveStatus === 'paused' ? 'Resume' : 'Pause'}
                          onClick={() =>
                            setConfirmPause({
                              collection: col,
                              action: col.effectiveStatus === 'paused' ? 'ready' : 'paused',
                            })
                          }
                          className="text-xs text-amber-500 hover:text-amber-400"
                        >
                          {col.effectiveStatus === 'paused' ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setConfirmDelete(col)}
                          className="text-xs text-red-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <CollectionDrawer collection={selected} onClose={() => setSelected(null)} />
      )}

      {/* Pause / Resume confirm */}
      {confirmPause && (
        <ConfirmDialog
          open={!!confirmPause}
          onClose={() => setConfirmPause(null)}
          onConfirm={handleForceStatus}
          title={confirmPause.action === 'paused' ? 'Pause Collection' : 'Resume Collection'}
          message={
            confirmPause.action === 'paused'
              ? `Pause "${confirmPause.collection.name}"? Minting will be suspended.`
              : `Resume "${confirmPause.collection.name}"? Status will be set back to ready.`
          }
          confirmLabel={confirmPause.action === 'paused' ? 'Pause' : 'Resume'}
          variant={confirmPause.action === 'paused' ? 'danger' : 'primary'}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          open={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Delete Collection"
          message={`Permanently delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      )}
    </MainLayout>
  )
}
