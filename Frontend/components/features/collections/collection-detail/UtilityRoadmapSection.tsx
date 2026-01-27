'use client'

/**
 * UtilityRoadmapSection – Utility bullets + optional roadmap timeline.
 */

import type { CollectionDetail } from '@/types'

export interface UtilityRoadmapSectionProps {
  collection: CollectionDetail
}

export default function UtilityRoadmapSection({ collection }: UtilityRoadmapSectionProps) {
  const utility = collection.utility ?? []
  const roadmap = collection.roadmap ?? []

  return (
    <section className="cp-section">
      <div className="cp-container">
        <h2 className="cp-section-title">Utility</h2>
        {utility.length > 0 && (
          <ul className="cp-utility-list">
            {utility.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        {roadmap.length > 0 && (
          <div className="cp-roadmap-phases">
            {roadmap.map((phase, i) => (
              <span key={i} className="cp-phase">
                {phase}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
