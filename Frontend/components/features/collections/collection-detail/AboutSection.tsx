'use client'

/**
 * AboutSection – Short description, lore/utility/roadmap summary.
 * Read More expands to full description.
 */

import { useState } from 'react'
import type { CollectionDetail } from '@/types'

export interface AboutSectionProps {
  collection: CollectionDetail
}

export default function AboutSection({ collection }: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = collection.description.length > 200
  const text = expanded || !hasMore
    ? collection.description
    : collection.description.slice(0, 200) + '…'

  return (
    <section className="cp-section">
      <div className="cp-container">
        <h2 className="cp-section-title">About</h2>
        <div
          className={`cp-section-content ${!expanded && hasMore ? 'cp-clamped' : ''}`}
        >
          {text}
        </div>
        {hasMore && (
          <button
            type="button"
            className="cp-read-more"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Read Less' : 'Read More'}
          </button>
        )}
      </div>
    </section>
  )
}
