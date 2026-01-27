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
// SEO config - pageTitle, URLs. Google's gotta find our docs or we're screaming into the void
import { pageTitle, absoluteUrl } from '@/lib/seo/config'
// Layout - header, footer, the usual. Docs need a frame too.
import Layout from '@/components/layout/Layout'
// DocsPageContent - the actual docs UI. Sections, quick links, all the good stuff.
// Where "how do I...?" gets answered. Ideally. No guarantees.
import DocsPageContent from '@/components/features/docs/DocsPageContent'

const title = 'Documentation'
const description =
  'Complete documentation for NeXus NFT Launchpad - Learn how to create, launch, and manage NFT collections. Step-by-step guides, API reference, and best practices.'

// SEO Metadata - so search engines (and humans) can find our docs
// Because if nobody can find the docs, we're just a help center for ghosts
export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  alternates: { canonical: absoluteUrl('/docs') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/docs'),
  },
  twitter: {
    title: pageTitle(title),
    description,
  },
  robots: {
    index: true,
    follow: true,
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
