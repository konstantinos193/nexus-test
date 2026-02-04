/**
 * Documentation Page - The Knowledge Base
 * Where developers and creators go to learn how things work
 * Because reading code is hard, but reading docs is slightly easier
 * (And we're here to make your life easier, one doc at a time)
 *
 * RTFM energy. But we made the M actually good. You're welcome.
 *
 * @author Juan - The developer who wrote docs so you don't have to guess
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import { pageTitle, absoluteUrl, ogImagePath } from '@/lib/seo/config'
// Layout - header, footer, the usual. Docs need a frame too.
import Layout from '@/components/layout/Layout'
// DocsPageContent - the actual docs UI. Sections, quick links, all the good stuff.
// Where "how do I...?" gets answered. Ideally. No guarantees.
import DocsPageContent from '@/components/features/docs/DocsPageContent'

const title = 'Documentation'
const description =
  'Complete documentation for NeXus Web3 Launchpad - Learn how to create, launch, and manage NFT collections. Step-by-step guides, API reference, and best practices.'

export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  keywords: ['NeXus documentation', 'Web3 launchpad docs', 'create NFT', 'API', 'Solana NFT'],
  alternates: { canonical: absoluteUrl('/docs') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/docs'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [{ url: absoluteUrl(ogImagePath), width: 1200, height: 630, alt: 'NeXus – Documentation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle(title),
    description,
    images: [absoluteUrl(ogImagePath)],
  },
}

/**
 * Docs Page - Main entry for /docs
 * Renders when someone finally decides to read before asking. We salute you.
 */
export default function DocsPage() {
  return (
    <Layout>
      {/* DocsPageContent - the knowledge base UI. Sections, links, the whole shebang.
          This is where "how does X work?" gets answered. Hopefully. */}
      <DocsPageContent />
    </Layout>
  )
}

// Coded by Juan - docs maintainer and "did you check the docs?" enthusiast
// (Yes, we have docs. Yes, people still ask. Some things never change.)
// P.S. - Read the docs. Your future self will thank you. Probably. 📚
