'use client'

/**
 * CollectionStatsBar – Floor, Volume, Owners, Items.
 * Real-time when indexed; for now we use mock values.
 */

import type { CollectionDetail } from '@/types'

export interface CollectionStatsBarProps {
  collection: CollectionDetail
}

export default function CollectionStatsBar({ collection }: CollectionStatsBarProps) {
  const floor = collection.floorPrice ?? 0
  const volume = collection.volume ?? 0
  const owners = collection.owners ?? 0
  const items = collection.totalSupply ?? 0

  return (
    <section className="cp-stats">
      <div className="cp-container">
        <div className="cp-stats-grid">
          <div className="cp-stat">
            <div className="cp-stat-label">Floor Price</div>
            <div className="cp-stat-value">
              <span className="sol">◎</span> {floor.toFixed(2)}
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-label">Volume</div>
            <div className="cp-stat-value">
              <span className="sol">◎</span> {volume.toLocaleString()}
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-label">Owners</div>
            <div className="cp-stat-value">{owners.toLocaleString()}</div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-label">Items</div>
            <div className="cp-stat-value">{items.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
