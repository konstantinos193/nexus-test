/**
 * FAQ List Component
 * The accordion list container for all FAQ items
 */

'use client'

import { useState } from 'react'
import FAQItem, { FAQItemData } from './FAQItem'
import styles from '@/app/faq/FAQ.module.css'

interface FAQListProps {
  faqs: FAQItemData[]
}

export default function FAQList({ faqs }: FAQListProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <div className={styles.faqList}>
      {faqs.map((faq, index) => (
        <FAQItem
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
