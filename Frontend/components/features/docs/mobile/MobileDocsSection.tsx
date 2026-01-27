/**
 * Mobile Docs Section - Collapsible accordion section per doc category
 */

'use client'

import { ChevronDown } from 'lucide-react'
import type { DocSection } from '@/lib/data/docs'
import styles from './MobileDocs.module.css'

interface MobileDocsSectionProps {
  section: DocSection
  isActive: boolean
  onToggle: () => void
}

export default function MobileDocsSection({ section, isActive, onToggle }: MobileDocsSectionProps) {
  return (
    <div
      className={`${styles.mobileDocsSection} ${isActive ? styles.mobileDocsSectionActive : ''}`}
      id={section.id}
    >
      <button
        type="button"
        className={styles.mobileDocsSectionButton}
        onClick={onToggle}
        aria-expanded={isActive}
        aria-controls={`mobile-docs-body-${section.id}`}
      >
        <div className={styles.mobileDocsSectionHeader}>
          <h2 className={styles.mobileDocsSectionTitle}>
            {section.title}
          </h2>
        </div>
        <ChevronDown className={styles.mobileDocsSectionChevron} />
      </button>
      <div
        id={`mobile-docs-body-${section.id}`}
        className={styles.mobileDocsSectionBody}
        aria-hidden={!isActive}
      >
        <div className={styles.mobileDocsSectionBodyInner}>
          <p className={styles.mobileDocsSectionDescription}>
            {section.description}
          </p>
          <div className={styles.mobileDocsTopics}>
            {section.topics.map((topic, idx) => (
              <article key={idx} className={styles.mobileDocsTopic}>
                <h3 className={styles.mobileDocsTopicTitle}>{topic.title}</h3>
                <p className={styles.mobileDocsTopicContent}>{topic.content}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
