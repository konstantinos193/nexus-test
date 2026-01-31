/**
 * Create Layout - Wrapper for /create
 * Metadata, SEO. Styles: create-page.css (scoped to /create).
 *
 * @author Juan - Layout architect and "create something" hype person
 * (Coded with care, humor, and probably too much coffee)
 */

import './create-page.css'
import type { Metadata } from 'next'
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

const title = 'Create Collection'
const description =
  'Create your NFT collection on Solana in minutes. Upload artwork, add metadata, and launch with our creator tools.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/create') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/create'),
  },
  twitter: {
    title: pageTitle(title),
    description,
  },
}

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// P.S. - Create something. We've got the SEO. You've got the vision.
