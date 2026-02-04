'use client'

/**
 * TraitsSection – Trait name + count. Optional rarity % toggle.
 * Filterable later for gallery.
 */

import { useState } from 'react'
import type { CollectionDetail } from '@/types'

export interface TraitsSectionProps {
  collection: CollectionDetail
}

export default function TraitsSection({ collection }: TraitsSectionProps) {
  const [showRarity, setShowRarity] = useState(false)
  const traits = collection.traits ?? []

  return (
    <section className="cp-section">
      <div className="cp-container">
        <h2 className="cp-section-title">Traits</h2>
        <div className="cp-traits-toggle">
          <label>
            <input
              type="checkbox"
              checked={showRarity}
              onChange={(e) => setShowRarity(e.target.checked)}
            />
            Toggle rarity percentages
          </label>
        </div>
        <div className="cp-traits-grid">
          {traits.map((t, i) => (
            <div key={i} className="cp-trait">
              <strong>{t.name}</strong>
              <span className="cp-trait-count">({t.count})</span>
              {showRarity && collection.totalSupply > 0 && (
                <span className="cp-trait-count">
                  {' '}
                  — {((t.count / collection.totalSupply) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
