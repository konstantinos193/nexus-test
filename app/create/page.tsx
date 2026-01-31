/**
 * Create Page - Shell for /create (Milestone 1)
 * Full create flow comes in a later milestone.
 * Styles: create-page.css (nft-create-* classes).
 *
 * @author Juan - The developer who reserved the spot
 * (Coded with care, humor, and probably too much coffee)
 */

import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/Card'
import { Plus } from 'lucide-react'

export default function CreatePage() {
  return (
    <Layout>
      <div className="nft-create-page">
        <div className="nft-create-container">
          <header className="nft-create-header">
            <h1 className="nft-create-header-title">Create Collection</h1>
          </header>
          <section className="nft-create-hero">
            <h2 className="nft-create-hero-title">Create your NFT collection</h2>
            <p className="nft-create-hero-sub">
              Full flow coming in a later milestone. Upload artwork, add metadata, and launch with our creator tools.
            </p>
          </section>
          <div className="nft-create-content-card">
            <div className="nft-create-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
              <Card variant="elevated" className="max-w-md w-full">
                <CardContent className="py-12 px-8 text-center">
                  <Plus
                    className="w-16 h-16 mx-auto mb-4 text-dark-text-secondary"
                    strokeWidth={1.5}
                  />
                  <h3 className="nft-create-step-title">Coming soon</h3>
                  <p className="text-dark-text-secondary">
                    Create your NFT collection on Solana. Full flow in a later milestone.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// P.S. - Create something cool. Or chaos. Both work.
