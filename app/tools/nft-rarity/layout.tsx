/**
 * Solana NFT Rarity – layout metadata and SEO
 */

import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'

const title = 'Solana NFT Rarity'
const description =
  'View on-chain trait rarities for any Solana NFT collection. Enter a collection mint (DAS RPC) or paste mint addresses to see count, percentage, and rarity score per trait.'

const keywords = [
  'Solana NFT rarity',
  'NFT rarity',
  'on-chain rarity',
  'trait rarity',
  'NFT collection stats',
  'Solana NFT tools',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/tools/nft-rarity') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/tools/nft-rarity'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – Solana NFT Rarity',
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

export default function NftRarityToolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: absoluteUrl('/') },
          { name: 'Tools', url: absoluteUrl('/tools') },
          { name: 'Solana NFT Rarity', url: absoluteUrl('/tools/nft-rarity') },
        ]}
      />
      {children}
    </>
  )
}
