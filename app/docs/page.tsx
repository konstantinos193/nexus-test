/**
 * Docs Page - Placeholder (Milestone 1)
 * Full documentation in a later milestone
 *
 * @author Juan - The developer who left a note
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import Layout from '@/components/layout/Layout'
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Documentation for the NFT launchpad.',
  alternates: { canonical: absoluteUrl('/docs') },
}

export default function DocsPage() {
  return (
    <Layout>
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold text-dark-text-primary mb-4">Docs</h1>
        <p className="text-dark-text-secondary text-center max-w-md">
          Developer and creator documentation. Content coming in a later milestone.
        </p>
      </main>
    </Layout>
  )
}

// P.S. - Read the docs. When we write them.
