/**
 * Tools Page - Placeholder (Milestone 1)
 * Standalone layout and styles via tools-page.css.
 * Full tool cards/content in a later milestone.
 *
 * @author Juan - The developer who left a note
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import Layout from '@/components/layout/Layout'
import { absoluteUrl } from '@/lib/seo/config'
import './tools-page.css'

export const metadata: Metadata = {
  title: 'Tools',
  description: 'Platform tools for NFT creators.',
  alternates: { canonical: absoluteUrl('/tools') },
}

export default function ToolsPage() {
  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-container">
          <header className="tools-page-hero">
            <span className="tools-page-hero-badge">Creator toolkit</span>
            <h1 className="tools-page-hero-title">Tools</h1>
            <p className="tools-page-hero-sub">
              Powerful tools to help you manage and interact with your NFTs. Full content coming in a later milestone.
            </p>
          </header>
          <section className="tools-page-section" aria-label="Tools coming soon">
            <div className="tools-page-section-header">
              <h2 className="tools-page-section-title">Coming Soon</h2>
            </div>
            <p className="tools-page-hero-sub" style={{ marginTop: 0 }}>
              Snapshot, airdrop, burn, and more. Stay tuned.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  )
}

// P.S. - Tools. We'll have them. Later.
