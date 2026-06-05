'use client'

/**
 * NFTGalleryGrid – The grid of actually-minted NFT items in this collection.
 * Has filter tabs: All, Price, Rarity, Listed only.
 * The filtering is UI-only for now — we're displaying what the backend sends.
 * (The indexer fills this eventually. Probably. Have faith. Light a candle.)
 *
 * Returns null when the gallery is empty — which is correct and intentional.
 * An NFT gallery with no NFTs is just a section with a title and nothing else.
 * That section is sadness with padding. We don't render that.
 *
 * @author Juan – The developer who made an empty array gracefully disappear
 * (Coded with care, optional chaining, and an indexer that's doing its best)
 */

// useState — for the active filter tab. One piece of state. One honest responsibility.
import { useState } from 'react'
// CollectionDetail type — we use galleryItems from the collection data
import type { CollectionDetail } from '@/types'

// The filter options — tabs that will eventually filter the gallery items.
// "All" shows everything. The rest await backend support. It's aspirational architecture.
const FILTERS = ['All', 'Price', 'Rarity', 'Listed only'] as const

/**
 * NFTGalleryGrid — Renders a filterable grid of minted NFT items.
 * When empty: nothing. Absolutely nothing. The component dissolves into null.
 * When populated: a tab bar + a grid of image cards. Clean. Simple. Indexer-dependent.
 */
export default function NFTGalleryGrid({ collection }: { collection: CollectionDetail }) {
  // Active filter tab — defaults to "All" because showing everything first is correct
  const [activeFilter, setActiveFilter] = useState<string>('All')

  // Gallery items — null-coalesced to empty array so we never map over undefined
  const items = collection.galleryItems ?? []

  // If there are no items, render nothing.
  // The indexer will fill this eventually. Until then, the section doesn't exist.
  // (An "Items" section with 0 items is a promise you can't keep. We don't make those.)
  if (items.length === 0) return null

  return (
    <section className="cp-section">
      {/* Section heading — "Items". What they are. Where they live. */}
      <h2 className="cp-section-title">Items</h2>

      {/* ── Filter Tabs ──────────────────────────────────────────────────────
          Four tabs. Currently cosmetic — the active filter doesn't actually filter data yet.
          But the UI is ready for when the backend sends pre-filtered or sortable item data. */}
      <div className="cp-gallery-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            // Active tab gets the active CSS class — visual feedback for the user's choice
            className={`cp-gallery-filter ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Gallery Grid ─────────────────────────────────────────────────────
          The actual NFT cards. Each item has an image and a token ID.
          Simple. No price. No rarity. Just the items and their numbers.
          (Secondary market features belong on secondary market UIs. This is a launchpad.) */}
      <div className="cp-gallery-grid">
        {items.map((item) => (
          // Key by item.id — stable identity for React's reconciler
          <div key={item.id} className="cp-gallery-item">
            {/* NFT image — direct URL from the indexer. IPFS images will timeout sometimes. Life.) */}
            <img src={item.imageUrl} alt={`NFT #${item.id}`} />
            {/* Token ID label — the NFT's identity in the collection. "#42". "#1". "#9999". */}
            <div className="cp-gallery-item-label">#{item.id}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because "shows nothing when empty" is a feature, not a bug.
// (The indexer will fill this eventually. We wait. We render null. We cope.)
// ─────────────────────────────────────────────────────────────────────────────
