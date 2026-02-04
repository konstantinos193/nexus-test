/**
 * Mobile FAQ Page Content Component
 * Mobile-optimized orchestrator for FAQ page
 */

'use client'

import MobileFAQHeader from './MobileFAQHeader'
import MobileFAQList from './MobileFAQList'
import MobileFAQContact from './MobileFAQContact'
import { FAQItemData } from '../FAQPageContent'
import styles from './MobileFAQ.module.css'

interface MobileFAQPageContentProps {
  faqs: FAQItemData[]
}

export default function MobileFAQPageContent({ faqs }: MobileFAQPageContentProps) {
  return (
    <div className={styles.mobileFaqContainer}>
      <div className={styles.mobileFaqContent}>
        <MobileFAQHeader />
        <MobileFAQList faqs={faqs} />
        <MobileFAQContact />
      </div>
    </div>
  )
}
