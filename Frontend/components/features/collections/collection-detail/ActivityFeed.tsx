'use client'

/**
 * ActivityFeed – The receipts. Mints, listings, and sales — the public blockchain ledger
 * distilled into a human-readable list. Every entry is evidence that something happened.
 * (Or that the indexer decided to bother tracking it. Same thing, really.)
 *
 * Shows nothing when the activity array is empty. Not even the section header.
 * Silence is cleaner than a section that says "Activity" followed by nothing.
 * (An empty section with a title is a promise you can't keep. We don't make empty promises.)
 *
 * @author Juan – The developer who made "someone minted something" look elegant
 * (Coded with care, map(), and an appreciation for on-chain transparency)
 */

// CollectionDetail and ActivityItem types — the shape of collections and their activity records
// ActivityItem is the per-event data: type, token, price, user, timestamp
import type { CollectionDetail, ActivityItem } from '@/types'
// SolIcon — the Solana gradient SVG mark. Shows up next to prices. The eternal brand ambassador.
import SolIcon from './SolIcon'

/**
 * ActivityLabel – The event type badge: "Mint", "List", or "Sale".
 * Color-coded via CSS class to give users instant visual context without reading the word.
 * (Though they will read the word. It's right there. Belt and suspenders.)
 */
function ActivityLabel({ type }: { type: ActivityItem['type'] }) {
  return (
    // cp-activity-type class handles base styling; `type` class handles the color coding
    <span className={`cp-activity-type ${type}`}>
      {/* Map internal type values to readable labels — "minted" → "Mint", etc.
          "Minted" is past tense in the DB but "Mint" reads better as a label. English is hard. */}
      {type === 'minted' ? 'Mint' : type === 'listed' ? 'List' : 'Sale'}
    </span>
  )
}

/**
 * ActivityDesc – The human-readable description of what happened.
 * Mints show who did the minting (if known). Listings and sales show the price.
 * The "—" placeholder for unknown users is intentional — "by —" reads weird, so we hide it.
 */
function ActivityDesc({ item }: { item: ActivityItem }) {
  // Mint events: "Minted #42 by wallet123" — or just "Minted #42" if user is unknown
  if (item.type === 'minted') {
    return (
      <span className="cp-activity-desc">
        Minted <strong>{item.tokenId}</strong>
        {/* Only show "by [user]" if there's a real user value — "—" means unknown, skip it */}
        {item.user && item.user !== '—' ? ` by ${item.user}` : ''}
      </span>
    )
  }

  // Listing or sale events: "Listed #42 — 0.5 SOL" or "Sold #42 — 1.2 SOL"
  return (
    <span className="cp-activity-desc">
      {item.type === 'listed' ? 'Listed' : 'Sold'} <strong>{item.tokenId}</strong>
      {/* Only show the price if it exists — some events don't have price data (free mints, etc.) */}
      {item.price != null && (
        <> — <span className="cp-activity-price">{item.price} <SolIcon size={11} /></span></>
      )}
    </span>
  )
}

/**
 * ActivityFeed – Renders the full activity list, or nothing if there's no activity.
 * The "nothing" case is intentional — an empty section header is noise.
 * If there's no data, there's no component. The page is quieter. That's fine.
 */
export default function ActivityFeed({ collection }: { collection: CollectionDetail }) {
  // Fallback to empty array — never assume the API sends this field
  const activity = collection.activity ?? []

  // Bail out completely if there's no activity to show.
  // No section header, no empty list, no nothing. Just null, floating into the void.
  if (activity.length === 0) return null

  return (
    <section className="cp-section">
      {/* Section heading — "Activity". Direct. Unambiguous. No subtitle needed. */}
      <h2 className="cp-section-title">Activity</h2>

      {/* Activity list — each item is a mint, listing, or sale event */}
      <ul className="cp-activity-list">
        {activity.map((item, i) => (
          // Key by index — activity items don't have stable IDs, so index is the best we've got
          // (Yes, index keys are not ideal. The activity feed is append-only. It's fine here.)
          <li key={i} className="cp-activity-item">
            {/* Event type badge — Mint, List, or Sale */}
            <ActivityLabel type={item.type} />
            {/* Description of what specifically happened */}
            <ActivityDesc item={item} />
            {/* Timestamp — when this happened, relative or absolute depending on the API */}
            <span className="cp-activity-meta">{item.when}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because the chain remembers everything, and so should the UI.
// (Empty activity feed? Silence is data. It means nothing has happened yet. Or ever.)
// ─────────────────────────────────────────────────────────────────────────────
