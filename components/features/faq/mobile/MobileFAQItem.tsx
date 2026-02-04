/**
 * Mobile FAQ Item Component
 * Individual accordion item optimized for mobile
 */

'use client'

import { ChevronDown } from 'lucide-react'
import styles from './MobileFAQ.module.css'
import { FAQItemData } from '../FAQPageContent'

interface MobileFAQItemProps {
  faq: FAQItemData
  index: number
  isActive: boolean
  onToggle: () => void
}

export default function MobileFAQItem({ faq, index, isActive, onToggle }: MobileFAQItemProps) {
  return (
    <div
      className={`${styles.mobileFaqItem} ${isActive ? styles.mobileFaqItemActive : ''}`}
    >
      <button
        className={styles.mobileFaqQuestionButton}
        onClick={onToggle}
        aria-expanded={isActive}
        aria-controls={`mobile-faq-answer-${index}`}
      >
        <div className={styles.mobileFaqQuestionWrapper}>
          <div className={styles.mobileFaqQuestionNumber}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <h2 className={styles.mobileFaqQuestion}>
            {faq.question}
          </h2>
        </div>
        <ChevronDown className={styles.mobileFaqChevron} />
      </button>
      <div
        id={`mobile-faq-answer-${index}`}
        className={styles.mobileFaqAnswerWrapper}
        aria-hidden={!isActive}
      >
        <div className={styles.mobileFaqAnswerContent}>
          <p className={styles.mobileFaqAnswer}>
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  )
}
