/**
 * FAQ Item Component
 * Individual accordion item for FAQ questions and answers
 */

'use client'

import { ChevronDown } from 'lucide-react'
import styles from '@/app/faq/FAQ.module.css'

export interface FAQItemData {
  question: string
  answer: string
}

interface FAQItemProps {
  faq: FAQItemData
  index: number
  isActive: boolean
  onToggle: () => void
}

export default function FAQItem({ faq, index, isActive, onToggle }: FAQItemProps) {
  return (
    <div
      className={`${styles.faqItem} ${isActive ? styles.faqItemActive : ''}`}
    >
      <button
        className={styles.faqQuestionButton}
        onClick={onToggle}
        aria-expanded={isActive}
        aria-controls={`faq-answer-${index}`}
      >
        <div className={styles.faqQuestionWrapper}>
          <div className={styles.faqQuestionNumber}>
            {String(index + 1).padStart(2, '0')}
          </div>
          <h2 className={styles.faqQuestion}>
            {faq.question}
          </h2>
        </div>
        <ChevronDown className={styles.faqChevron} />
      </button>
      <div
        id={`faq-answer-${index}`}
        className={styles.faqAnswerWrapper}
        aria-hidden={!isActive}
      >
        <div className={styles.faqAnswerContent}>
          <p className={styles.faqAnswer}>
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  )
}
