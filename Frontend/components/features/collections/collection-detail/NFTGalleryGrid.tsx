'use client'

/**
 * NFTGalleryGrid – Grid of collection items.
 * Filters: Price, Rarity, Listed only, Attributes (placeholder).
 */

import { useState } from 'react'
import type { CollectionDetail } from '@/types'

export interface NFTGalleryGridProps {
  collection: CollectionDetail
}

const FILTERS = ['All', 'Price', 'Rarity', 'Listed only', 'Attributes'] as const

export default function NFTGalleryGrid({ collection }: NFTGalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All')
  const items = collection.galleryItems ?? []

  return (
    <section className="cp-section">
      <div className="cp-container">
        <h2 className="cp-section-title">Items</h2>
        <div className="cp-gallery-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`cp-gallery-filter ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="cp-gallery-grid">
          {items.map((item) => (
            <div key={item.id} className="cp-gallery-item">
              <img
                src={item.imageUrl}
                alt={`NFT #${item.id}`}
              />
              <div className="cp-gallery-item-label">#{item.id}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
