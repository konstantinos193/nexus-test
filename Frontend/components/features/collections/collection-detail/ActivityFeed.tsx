'use client'

/**
 * ActivityFeed – Mint / list / sale feed.
 */

import type { CollectionDetail, ActivityItem } from '@/types'

export interface ActivityFeedProps {
  collection: CollectionDetail
}

function formatActivity(item: ActivityItem) {
  if (item.type === 'minted') {
    return (
      <>
        Minted <strong>{item.tokenId}</strong> — {item.user}
      </>
    )
  }
  if (item.type === 'listed') {
    return (
      <>
        Listed <strong>{item.tokenId}</strong>
        {item.price != null && (
          <> — <span className="cp-activity-price">◎ {item.price}</span></>
        )}
      </>
    )
  }
  if (item.type === 'sold') {
    return (
      <>
        Sold <strong>{item.tokenId}</strong>
        {item.price != null && (
          <> — <span className="cp-activity-price">◎ {item.price}</span></>
        )}
      </>
    )
  }
  return null
}

export default function ActivityFeed({ collection }: ActivityFeedProps) {
  const activity = collection.activity ?? []

  return (
    <section className="cp-section">
      <div className="cp-container">
        <h2 className="cp-section-title">Activity</h2>
        <ul className="cp-activity-list">
          {activity.map((item, i) => (
            <li key={i} className="cp-activity-item">
              <span className="cp-activity-desc">{formatActivity(item)}</span>
              <span className="cp-activity-meta">{item.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
