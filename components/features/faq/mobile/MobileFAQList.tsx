/**
 * Mobile FAQ List Component
 * Accordion list optimized for mobile devices
 */

'use client'

import { useState } from 'react'
import MobileFAQItem from './MobileFAQItem'
import { FAQItemData } from '../FAQPageContent'
import styles from './MobileFAQ.module.css'

interface MobileFAQListProps {
  faqs: FAQItemData[]
}

export default function MobileFAQList({ faqs }: MobileFAQListProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className={styles.mobileFaqList}>
      {faqs.map((faq, index) => (
        <MobileFAQItem
          key={index}
          faq={faq}
          index={index}
          isActive={activeIndex === index}
          onToggle={() => toggleFAQ(index)}
        />
      ))}
    </div>
  )
}
