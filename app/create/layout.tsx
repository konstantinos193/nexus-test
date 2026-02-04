/**
 * Create Layout - The wrapper for /create and its children
 * Metadata, SEO, minimal DOM. Create flow doesn't need a fancy layout—just clean metadata.
 * "Create your collection" energy. We set the stage; the page does the rest.
 *
 * @author Juan - Layout architect and "create something" hype person
 * (Coded with care, humor, and probably too much coffee)
 */

import './create-page.css'
import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'

const title = 'Create Collection'
const description =
  'Create your NFT collection on Solana in minutes. Upload artwork, add metadata, and launch with our creator tools.'

const keywords = [
  'create NFT collection',
  'Solana NFT',
  'NFT creator',
  'mint NFT',
  'launch NFT',
  'Web3',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/create') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/create'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – Create NFT Collection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle(title),
    description,
    images: [absoluteUrl(ogImagePath)],
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
