/**
 * Mobile Terms of Service Page Content
 * Optimized for mobile devices with touch-friendly interactions
 */

'use client'

import { useState } from 'react'
import styles from './MobileTerms.module.css'

interface Section {
  title: string
  content: string[]
}

interface MobileTermsPageContentProps {
  sections: Section[]
}

export default function MobileTermsPageContent({ sections }: MobileTermsPageContentProps) {
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
    <div className={styles.mobileTermsContainer}>
      {/* Header */}
      <div className={styles.mobileTermsHeader}>
        <h1 className={styles.mobileTermsTitle}>Terms of Service</h1>
        <div className={styles.mobileTermsMeta}>
          <span className={styles.metaLabel}>Last Updated</span>
          <span className={styles.metaDate}>January 25, 2026</span>
        </div>
      </div>

      {/* Introduction */}
      <div className={styles.mobileTermsIntro}>
        <p className={styles.mobileIntroText}>
          Welcome to NeXus NFT Launchpad. These Terms of Service ("Terms") govern your access to and use of 
          our platform and services. By using NeXus, you agree to be bound by these Terms. Please read them carefully.
        </p>
      </div>

      {/* Sections - Accordion Style */}
      <div className={styles.mobileTermsSections}>
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(index)
          return (
            <div key={index} className={styles.mobileTermsSection}>
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
      <div className={styles.mobileTermsContact}>
        <h2 className={styles.mobileContactTitle}>Questions About Our Terms?</h2>
        <p className={styles.mobileContactText}>
          If you have any questions about these Terms of Service, please don't hesitate to reach out.
        </p>
        <div className={styles.mobileContactLinks}>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileContactLink}
          >
            Discord
          </a>
          <a
            href="https://x.com"
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
