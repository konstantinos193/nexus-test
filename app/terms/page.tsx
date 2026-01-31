/**
 * Terms Page - Placeholder (Milestone 1)
 * Full terms of service in a later milestone.
 * Styles: terms.css (terms-container, terms-hero, etc.).
 *
 * @author Juan - The developer who left a note
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import Layout from '@/components/layout/Layout'
import { absoluteUrl } from '@/lib/seo/config'
import './terms.css'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of service for the NFT launchpad.',
  alternates: { canonical: absoluteUrl('/terms') },
}

export default function TermsPage() {
  return (
    <Layout>
      <div className="terms-container">
        <header className="terms-hero">
          <div className="terms-title-wrapper">
            <h1 className="terms-title">Terms of Service</h1>
          </div>
          <span className="terms-meta">January 2025</span>
        </header>
        <div className="terms-intro">
          <p className="terms-intro-text">
            Terms of service. Full content coming in a later milestone.
          </p>
        </div>
      </div>
    </Layout>
  )
}

// P.S. - Terms. Conditions. All that. Coming soon.
