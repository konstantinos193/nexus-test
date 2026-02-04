/**
 * FAQ Layout - The wrapper that hugs every FAQ page
 * Handles metadata, JSON-LD for SEO, and whatever else /faq needs at the layout level
 * Think of it as the FAQ's personal butler. Very professional. Knows where everything goes.
 *
 * This layout runs for /faq and its children. Metadata? Here. Structured data? Also here.
 * (We're nothing if not organized. Mostly.)
 *
 * @author Juan - Layout architect and metadata enthusiast
 * (Yes, we care about SEO. Yes, we also make jokes. Multitasking.)
 */

import type { Metadata } from 'next'
import { pageTitle, absoluteUrl, ogImagePath } from '@/lib/seo/config'
import FaqJsonLd from '@/components/seo/FaqJsonLd'

const title = 'FAQ'
const description =
  'Frequently asked questions about NeXus Web3 Launchpad. Learn how to create NFT collections, use our tools, and get support for your Web3 journey.'

const keywords = [
  'NeXus FAQ',
  'Web3 launchpad FAQ',
  'Solana NFT help',
  'create NFT',
  'NFT support',
]

export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  keywords,
  alternates: { canonical: absoluteUrl('/faq') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/faq'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: 'NeXus – FAQ',
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
 * FAQ Layout Component - Wraps FAQ pages with metadata + JSON-LD
 * children = the actual FAQ page content (or whatever lives under /faq)
 * We provide the SEO sprinkles, they provide the readable stuff.
 */
export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Fragment - we're not adding extra DOM. Clean. Minimal. Chef's kiss.
    <>
      {/* FaqJsonLd - injects schema.org FAQPage structured data
          Search engines eat this up. Rich results? We want 'em.
          (It's like SEO catnip. But for algorithms. You get it.) */}
      <FaqJsonLd />
      {/* children - the page.tsx output. The real MVP. We're just the frame. */}
      {children}
    </>
  )
}

// Layout by Juan - because layout files deserve signatures too
// FAQ: "Who wrote this layout?" A: "Juan. It's right there. Did you even look?"
