/**
 * Mobile Privacy Policy Page Content
 * Optimized for mobile devices with touch-friendly interactions
 */

'use client'

import { useState } from 'react'
import styles from './MobilePrivacy.module.css'
import { twitterUrl, discordUrl } from '@/lib/seo/constants'

interface Section {
  title: string
  content: string[]
}

interface MobilePrivacyPageContentProps {
  sections: Section[]
}

export default function MobilePrivacyPageContent({ sections }: MobilePrivacyPageContentProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className={styles.mobilePrivacyContainer}>
      {/* Header */}
      <div className={styles.mobilePrivacyHeader}>
        <h1 className={styles.mobilePrivacyTitle}>Privacy Policy</h1>
        <div className={styles.mobilePrivacyMeta}>
          <span className={styles.metaLabel}>Last Updated</span>
          <span className={styles.metaDate}>January 25, 2026</span>
        </div>
      </div>

      {/* Introduction */}
      <div className={styles.mobilePrivacyIntro}>
        <p className={styles.mobileIntroText}>
          At NeXus, we respect your privacy and are committed to protecting your personal information. 
          This Privacy Policy explains how we collect, use, and safeguard your information when you use 
          our NFT launchpad platform. Please read this policy carefully to understand our practices.
        </p>
      </div>

      {/* Sections - Accordion Style */}
      <div className={styles.mobilePrivacySections}>
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(index)
          return (
            <div key={index} className={styles.mobilePrivacySection}>
              <button
                className={`${styles.mobileSectionHeader} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => toggleSection(index)}
                aria-expanded={isExpanded}
              >
                <h2 className={styles.mobileSectionTitle}>{section.title}</h2>
                <span className={styles.mobileSectionToggle}>
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
              {isExpanded && (
                <div className={styles.mobileSectionContent}>
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className={styles.mobileSectionParagraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Contact Section */}
      <div className={styles.mobilePrivacyContact}>
        <h2 className={styles.mobileContactTitle}>Questions About Privacy?</h2>
        <p className={styles.mobileContactText}>
          If you have any questions or concerns about this Privacy Policy, please reach out to us.
        </p>
        <div className={styles.mobileContactLinks}>
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileContactLink}
          >
            Discord
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileContactLink}
          >
            X (Twitter)
          </a>
        </div>
      </div>
    </div>
  )
}
