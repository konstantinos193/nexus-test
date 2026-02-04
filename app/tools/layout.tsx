/**
 * Tools Layout - The wrapper for /tools and its children
 * Metadata, SEO. Tools page gets its own layout love—layer generator, rarity, snapshot, airdrop, etc.
 */

import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'

const title = 'NFT Tools'
const description =
  'Creator toolkit: NFT Layer Generator and more. Generate layered NFT art and prepare collections for the Create page.'

const keywords = [
  'NFT tools',
  'NFT layer generator',
  'NFT creator tools',
  'create NFT collection',
  'Solana',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/tools') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/tools'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – NFT Tools for creators',
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
 * Tools Layout - Wraps tools pages. Pass-through + metadata. No extra DOM.
 * children = the tools page (Solana tools, Bitcoin tools, etc.). We're the frame.
 */
export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

// Layout by Juan - tools wrapper. SEO? Check. Fancy layout? Nah. Tools speak for themselves.
// P.S. - Snapshot, trade, airdrop, burn. We've got the metadata. You've got the power. 🔧
