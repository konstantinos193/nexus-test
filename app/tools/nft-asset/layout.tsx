/**
 * NFT Layer Generator – layout metadata and SEO
 */

import type { Metadata } from 'next'
import { absoluteUrl, pageTitle, ogImagePath } from '@/lib/seo/config'
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd'

const title = 'NFT Layer Generator'
const description =
  'Generate NFT collections from layered art. Upload trait folders, set draw order and rarity, add exclusions, then export images and metadata ready for the Create page.'

const keywords = [
  'NFT layer generator',
  'NFT art generator',
  'layered NFT',
  'trait rarity',
  'create NFT collection',
  'Solana NFT',
]

export const metadata: Metadata = {
  title,
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/tools/nft-asset') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/tools/nft-asset'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – NFT Layer Generator',
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

export default function NftAssetToolLayout({
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
          { name: 'NFT Layer Generator', url: absoluteUrl('/tools/nft-asset') },
        ]}
      />
      {children}
    </>
  )
}
