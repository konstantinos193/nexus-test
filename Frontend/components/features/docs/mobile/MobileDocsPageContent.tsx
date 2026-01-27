/**
 * Mobile Docs Page Content - Mobile-optimized docs layout
 * Accordion sections, touch-friendly quick links
 */

'use client'

import { useState } from 'react'
import { docSections, quickLinks } from '@/lib/data/docs'
import MobileDocsHeader from './MobileDocsHeader'
import MobileDocsSection from './MobileDocsSection'
import MobileDocsQuickLinks from './MobileDocsQuickLinks'
import styles from './MobileDocs.module.css'

export default function MobileDocsPageContent() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(docSections[0].id)

  const toggleSection = (id: string) => {
    setOpenSectionId((prev) => (prev === id ? null : id))
  }

  return (
    <main className={styles.mobileDocsContainer}>
      <div className={styles.mobileDocsContent}>
        <MobileDocsHeader />
        <div className={styles.mobileDocsSectionList}>
          {docSections.map((section) => (
            <MobileDocsSection
              key={section.id}
              section={section}
              isActive={openSectionId === section.id}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
        <MobileDocsQuickLinks links={quickLinks} />
      </div>
    </main>
  )
}
