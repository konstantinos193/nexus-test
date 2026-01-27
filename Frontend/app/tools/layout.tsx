/**
 * Tools Layout - The wrapper for /tools and its children
 * Metadata, SEO. Tools page gets its own layout love—snapshot, trade, airdrop, burn, etc.
 * We tell Google "here's where the creator toolkit lives." They index. We win.
 *
 * @author Juan - Layout architect and tools-page SEO enthusiast
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
// SEO config - pageTitle, absoluteUrl. "NFT Tools" deserves to be findable.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

const title = 'NFT Tools'
const description =
  'NFT creator tools: snapshot holders, trade NFTs, airdrop, update metadata, burn NFTs, mint single NFT. Solana and Bitcoin Ordinals support.'

// Metadata - so creators searching for "NFT tools" find us. Simple as that.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/tools') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/tools'),
  },
  twitter: {
    title: pageTitle(title),
    description,
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
