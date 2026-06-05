'use client'

/**
 * UtilityRoadmapSection – The "why you should care beyond the art" section.
 * Utility bullets: what the NFT actually does. DAO access, merch discounts, game items, etc.
 * Roadmap phases: what the team plans to build. Q1, Q2, "before heat death of the universe."
 *
 * Both sections are optional — not every collection has utility or a roadmap.
 * If both arrays are empty, this component returns null. No section. No ghost headers.
 * "No roadmap" is an honest state. We don't fill it with placeholder content.
 * (Empty sections are sadness with padding. We said this already. Still true.)
 *
 * If only utility exists: renders utility. If only roadmap exists: renders roadmap.
 * Both can coexist — they're in a React fragment, not fighting each other for space.
 *
 * @author Juan – The developer who trusts the creator to actually ship the roadmap
 * (Coded with care, conditional rendering, and the eternal optimism of a Q3 delivery date)
 */

// CollectionDetail type — we use utility[] and roadmap[] from the collection data
import type { CollectionDetail } from '@/types'

/**
 * UtilityRoadmapSection — Renders utility bullets and/or roadmap phase chips.
 * Both are optional. Either can be absent. Neither is required to exist.
 * The component renders gracefully regardless. Because we are professionals.
 */
export default function UtilityRoadmapSection({ collection }: { collection: CollectionDetail }) {
  // Null-coerce both arrays — the API may not send these fields for all collections
  const utility = collection.utility ?? []
  const roadmap  = collection.roadmap ?? []

  // If both arrays are empty, there's nothing to render. Return null. Walk away.
  // This is cleaner than rendering two section headers with no content.
  // An empty roadmap section is a broken promise encoded in HTML. We don't do that.
  if (utility.length === 0 && roadmap.length === 0) return null

  return (
    // React fragment — two optional sections sharing a parent without adding DOM noise
    <>
      {/* ── Utility Section ───────────────────────────────────────────────
          Only rendered if the collection has utility items.
          Each item is a bullet point in an unordered list. Short. Punchy. Scannable. */}
      {utility.length > 0 && (
        <section className="cp-section">
          {/* Section heading — "Utility". What does owning this NFT get you? Answer here. */}
          <h2 className="cp-section-title">Utility</h2>
          {/* Bulleted list — each utility item is one line.
              Long utility descriptions are the creator's problem, not ours. */}
          <ul className="cp-utility-list">
            {utility.map((item, i) => (
              // Key by index — utility items are plain strings with no stable identity
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Roadmap Section ───────────────────────────────────────────────
          Only rendered if the collection has roadmap phases.
          Each phase is a chip — think "Q1 2026", "Phase 2", "Token Launch", etc.
          Chips because phases are milestones, not prose. */}
      {roadmap.length > 0 && (
        <section className="cp-section">
          {/* Section heading — "Roadmap". Where are we going? When are we getting there? */}
          <h2 className="cp-section-title">Roadmap</h2>
          {/* Phase chips — styled pills for each roadmap milestone.
              No completion state here — this is a launchpad, not a project tracker. */}
          <div className="cp-roadmap-phases">
            {roadmap.map((phase, i) => (
              // Key by index — phase strings have no stable ID, index is fine here
              <span key={i} className="cp-phase">{phase}</span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because "building in public" means publishing the roadmap in the UI.
// (Whether they ship it is between the creator and their Discord. Not our department.)
// ─────────────────────────────────────────────────────────────────────────────
