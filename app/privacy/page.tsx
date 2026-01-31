/**
 * Privacy Page - Placeholder (Milestone 1)
 * Full privacy policy in a later milestone.
 * Styles: privacy.css (privacy-container, privacy-hero, etc.).
 *
 * @author Juan - The developer who left a note
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import Layout from '@/components/layout/Layout'
import { absoluteUrl } from '@/lib/seo/config'
import './privacy.css'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy policy for the NFT launchpad.',
  alternates: { canonical: absoluteUrl('/privacy') },
}

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="privacy-container">
        <header className="privacy-hero">
          <div className="privacy-title-wrapper">
            <h1 className="privacy-title">Privacy Policy</h1>
          </div>
          <span className="privacy-meta">January 2025</span>
        </header>
        <div className="privacy-intro">
          <p className="privacy-intro-text">
            Privacy policy and how we handle your data. Full content coming in a later milestone.
          </p>
        </div>
      </div>
    </Layout>
  )
}

// P.S. - We care about your data. The full policy is coming.
