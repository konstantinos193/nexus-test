'use client'

/**
 * TraitsSection – The collection's trait distribution, displayed as chips.
 * Each trait chip shows the trait name and count.
 * Toggle "Show rarity %" to add the rarity percentage next to each count.
 * (Rarity matters. It's why some JPEGs are worth more than others. We don't judge the market.)
 *
 * Returns null when there are no traits — no ghost sections allowed.
 * A traits section with no traits is just a heading and a void.
 * We've done enough staring into voids in this codebase already.
 *
 * @author Juan – The developer who turned trait data into a grid of chips
 * (Coded with care, percentage math, and the knowledge that rarity is a social construct
 *  that people will pay good money for)
 */

// useState — for the rarity percentage toggle. One boolean. Maximum impact.
import { useState } from 'react'
// CollectionDetail type — we use traits[] and totalSupply for rarity calculation
import type { CollectionDetail } from '@/types'

/**
 * TraitsSection — Shows trait name + count chips, with optional rarity percentage.
 * The toggle is a checkbox. The math is simple. The implications for pricing are not.
 */
export default function TraitsSection({ collection }: { collection: CollectionDetail }) {
  // showRarity: when true, each trait chip shows the rarity percentage after the count
  const [showRarity, setShowRarity] = useState(false)

  // Traits array — null-coalesced to empty array so we never try to map over undefined
  const traits = collection.traits ?? []

  // If there are no traits, this component does not exist.
  // Render nothing. The page is cleaner without an empty section.
  // (NFTs without traits are valid. Sections without content are not.)
  if (traits.length === 0) return null

  return (
    <section className="cp-section">
      {/* Section heading — "Traits". Direct. Unfussy. Correct. */}
      <h2 className="cp-section-title">Traits</h2>

      {/* Rarity toggle — a simple checkbox that reveals the math behind the chips.
          Once you turn this on, every trait chip becomes a rarity calculator.
          Power users love this. Casual users ignore it. Both behaviors are correct. */}
      <label className="cp-traits-toggle">
        <input
          type="checkbox"
          checked={showRarity}
          onChange={(e) => setShowRarity(e.target.checked)}
        />
        Show rarity %
      </label>

      {/* ── Traits Grid ──────────────────────────────────────────────────────
          A responsive grid of trait chips. Each chip: name + count + optional rarity.
          The grid layout is handled by CSS. Juan doesn't hand-roll grids anymore. */}
      <div className="cp-traits-grid">
        {traits.map((t, i) => (
          // Key by index — traits don't have stable IDs (they're not DB entities, just counts)
          <div key={i} className="cp-trait">
            {/* Trait name — bold because it's the identity of the trait */}
            <strong>{t.name}</strong>

            {/* Trait count — how many NFTs in the collection have this trait value */}
            <span className="cp-trait-count">({t.count})</span>

            {/* Rarity percentage — only shown when toggle is on AND totalSupply > 0.
                Dividing by 0 supply would produce NaN. NaN in the UI is embarrassing.
                We check totalSupply > 0 before doing the division. Basic math hygiene. */}
            {showRarity && collection.totalSupply > 0 && (
              <span className="cp-trait-count">
                {' '}— {((t.count / collection.totalSupply) * 100).toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because rarity percentages are just division, but they make people feel things.
// (t.count / totalSupply × 100. That's the formula. That's all it is. And yet.)
// ─────────────────────────────────────────────────────────────────────────────
