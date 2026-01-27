/**
 * FAQ Page Content Component
 * The main orchestrator for the FAQ page
 * Conditionally renders mobile or desktop components
 */

'use client'

import { useIsMobile } from '@/hooks/useMediaQuery'
import FAQHeader from './FAQHeader'
import FAQList from './FAQList'
import FAQContact from './FAQContact'
import MobileFAQPageContent from './mobile/MobileFAQPageContent'
import styles from '@/app/faq/FAQ.module.css'

export interface FAQItemData {
  question: string
  answer: string
}

interface FAQPageContentProps {
  faqs: FAQItemData[]
}

export default function FAQPageContent({ faqs }: FAQPageContentProps) {
  const isMobile = useIsMobile()

  // Render mobile-optimized components on mobile devices
  if (isMobile) {
    return <MobileFAQPageContent faqs={faqs} />
  }

  // Render desktop components on larger screens
  return (
    <div className={styles.faqContainer}>
      <div className={styles.faqContent}>
        <FAQHeader />
        <FAQList faqs={faqs} />
        <FAQContact />
      </div>
    </div>
  )
}
