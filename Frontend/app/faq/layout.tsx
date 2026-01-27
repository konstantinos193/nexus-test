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
// SEO config - pageTitle, URLs, the usual. Google needs its breadcrumbs.
import { pageTitle, absoluteUrl, siteDescription } from '@/lib/seo/config'
// FaqJsonLd - structured data so search engines can show our FAQs in fancy snippets
// Because we want those expandable FAQ results. Clout (and CTR). Clout and CTR.
import FaqJsonLd from '@/components/seo/FaqJsonLd'

// title - short and sweet. "FAQ" says it all. No need to overthink it.
const title = 'FAQ'
// description - the elevator pitch for when someone lands on /faq from search
// We promise answers. We deliver answers. Whether they're the *right* answers is between them and the FAQ gods.
const description =
  'Frequently asked questions about NeXus NFT Launchpad. Learn how to create NFT collections, use our tools, and get support for your Web3 journey.'

// Metadata - everything Next.js and Google need to not get lost
// We're thorough. Annoyingly thorough. Your future self will thank us.
export const metadata: Metadata = {
  // Page title - "FAQ | SiteName" or whatever pageTitle spits out
  title: pageTitle(title),
  // Description - see above. We wrote it once, we use it everywhere. DRY, baby.
  description,
  // Canonical URL - "this is THE FAQ page, don't index 47 copies of it"
  alternates: { canonical: absoluteUrl('/faq') },
  // Open Graph - for when someone shares /faq on social media
  // "Look, I found the FAQ!" — that one person who actually reads before asking
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/faq'),
  },
  // Twitter Card - same vibes, different platform
  // Tweet the FAQ. Make it famous. Reduce support ticket volume. Manifest it.
  twitter: {
    title: pageTitle(title),
    description,
  },
  // robots - we WANT to be indexed. We're not hiding. FAQ is not a secret.
  // index: true, follow: true. Classic "please crawl us" energy.
  robots: {
    index: true,
    follow: true,
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
