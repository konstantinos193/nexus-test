/**
 * Create Layout - The wrapper for /create and its children
 * Metadata, SEO, minimal DOM. Create flow doesn't need a fancy layout—just clean metadata.
 * "Create your collection" energy. We set the stage; the page does the rest.
 *
 * @author Juan - Layout architect and "create something" hype person
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
// SEO config - pageTitle, absoluteUrl. So "Create Collection" shows up nice in search and shares.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

const title = 'Create Collection'
const description =
  'Create your NFT collection in minutes. Upload artwork, set blockchain, add metadata, and launch on Ethereum, Solana, or Polygon with our creator tools.'

// Metadata - Google and social cards need to know /create is where the magic happens
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

/**
 * Create Layout - Wraps create pages. No extra DOM—just pass-through + metadata.
 * children = the create page. We provide SEO sprinkles; they provide the form chaos.
 */
export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// Layout by Juan - minimal layout, maximum metadata. We keep it clean.
// P.S. - Create something. We've got the SEO. You've got the vision. 🎨
