/**
 * FAQ Page - Placeholder (Milestone 1)
 * Full FAQ content in a later milestone.
 * Styles: FAQ.module.css (faqContainer, faqContent, etc.).
 *
 * @author Juan - The developer who left a note
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import Layout from '@/components/layout/Layout'
import { absoluteUrl } from '@/lib/seo/config'
import styles from './FAQ.module.css'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about the NFT launchpad.',
  alternates: { canonical: absoluteUrl('/faq') },
}

export default function FAQPage() {
  return (
    <Layout>
      <div className={styles.faqContainer}>
        <div className={styles.faqContent}>
          <header className={styles.faqHeader}>
            <h1 className={styles.faqTitle}>FAQ</h1>
            <p className={styles.faqSubtitle}>
              Frequently asked questions and answers. Content coming in a later milestone.
            </p>
          </header>
        </div>
      </div>
    </Layout>
  )
}

// P.S. - Questions? We'll have answers. Later.
