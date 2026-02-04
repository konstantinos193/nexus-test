/**
 * Create Page - /create route. Renders ONLY the 5-step NFT Create Wizard.
 * Do not use CreatePageHeader, StepIndicator, or CollectionForm on this route.
 * Server Component so RSC does not send a script placeholder that mismatches Layout's div during hydration.
 */

import { Suspense } from 'react'
import Layout from '@/components/layout/Layout'
import CreatePageContent from '@/components/features/create/CreatePageContent'

export default function CreatePage() {
  return (
    <Layout>
      <Suspense fallback={<div className="nft-create-page" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a9a' }}>Loading…</div>}>
        <CreatePageContent />
      </Suspense>
    </Layout>
  )
}

// Coded by Juan - because every good page needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Create something cool. Or chaos. Both work. 🎨
