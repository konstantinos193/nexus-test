/**
 * FAQ Layout - The Professional Butler for /faq and All Its Children
 * Handles SEO metadata and JSON-LD structured data at the layout level
 * So the actual FAQ page component can focus entirely on rendering the Q&A content
 *
 * Think of it as the FAQ's personal assistant.
 * Metadata? Done. Structured data for rich search snippets? Also done.
 * Canonical URL? Handled. Open Graph? Twitter Card? All of it. Before you ask.
 * (The butler anticipates your needs. That's what makes a good butler.)
 *
 * Why JSON-LD here instead of in the page?
 * Because structured data is a layout concern — it should be injected regardless of
 * which child component renders under /faq. The layout guarantees it's always present.
 * (Consistency over convenience. A design principle we mostly follow.)
 *
 * @author Juan - Layout architect, metadata enthusiast, and FAQ-finding advocate
 * (Yes, we care about schema.org structured data. Yes, we also make jokes. High achievers.)
 */

// Metadata type — the TypeScript contract for everything we put in <head>
// Miss this and the compiler complains. The compiler is always right.
import type { Metadata } from 'next'

// SEO config — pageTitle formats "FAQ | NeXus", absoluteUrl builds full canonical URLs
// siteDescription is available as a fallback (we use a custom description instead)
import { pageTitle, absoluteUrl } from '@/lib/seo/config'

// FaqJsonLd — injects schema.org FAQPage structured data into <head>
// This is what enables the expandable FAQ results in Google Search (the fancy accordion ones)
// Because we want those rich results. We want the clout. We want the click-through rate.
// (Mostly the click-through rate. But also the clout.)
import FaqJsonLd from '@/components/seo/FaqJsonLd'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title is just "FAQ" — short, widely understood, no need to elaborate
// People searching for FAQs don't need a marketing pitch in the title tag

const title = 'FAQ'

// Description — the full pitch for search engine snippets and social previews
// Who it's for, what they'll find, and the key selling point ("Web3 journey" — it's aspirational)
// We promise answers. We deliver answers.
// Whether those answers resolve the user's confusion is between them and the FAQ content.
const description =
  'Frequently asked questions about NeXus NFT Launchpad. Learn how to create NFT collections, use our tools, and get support for your Web3 journey.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Comprehensive metadata for the FAQ route
// robots: index + follow because an indexed FAQ page reduces support load
// Every person who finds the FAQ via Google is a person who doesn't open a support ticket
// That's not cynicism, that's resource management
export const metadata: Metadata = {
  // Title — "FAQ | NeXus" via pageTitle()
  // Short. Recognizable. What someone searching for our FAQ would expect to see.
  title: pageTitle(title),

  // Description — the search snippet pitch
  // Covers creation, tools, and support — the three main things people ask about
  description,

  // Canonical — "this is THE FAQ page"
  // Prevents index dilution if the page is ever accessible via alternate URLs
  alternates: { canonical: absoluteUrl('/faq') },

  // Open Graph — for social previews when someone shares the FAQ
  // "Look, they have a FAQ!" — that one person who actually shares documentation
  // We accommodate that person. We love that person.
  openGraph: {
    title: pageTitle(title),       // "FAQ | NeXus"
    description,
    url: absoluteUrl('/faq'),
  },

  // Twitter Card — same pitch, Twitter's format
  // Tweet the FAQ. Reduce support volume. Manifest it.
  twitter: {
    title: pageTitle(title),
    description,
  },

  // Robots — definitely index the FAQ, definitely follow its links
  // An unindexed FAQ is a gift to competitors and a burden to the support team
  robots: {
    index: true,  // Yes, index the FAQ. Please. Someone is searching for "NeXus FAQ" right now.
    follow: true, // Yes, follow the links. The nav links to important pages. Use them.
  },
}

// ── Layout Component ──────────────────────────────────────────────────────────

/**
 * FAQLayout - The layout wrapper for /faq routes
 * Renders FaqJsonLd (structured data) before children
 * The metadata above is injected by Next.js into <head> automatically
 * The FaqJsonLd component adds the schema.org script tag for rich results
 *
 * No extra wrapper div — clean fragment, minimal DOM impact
 * The FAQ page has its own layout/spacing. We don't layer on top of it.
 */
export default function FAQLayout({
  children,
}: {
  // children — the FAQ page component (FAQPageContent rendering the Q&A list)
  // Or any other component that might live under /faq in the future
  // We wrap it, we don't interrogate it
  children: React.ReactNode
}) {
  return (
    // Fragment — no extra DOM node. Clean. No layout crimes.
    // The FAQ page manages its own container width and padding.
    <>
      {/* FaqJsonLd — injects schema.org FAQPage structured data into the document <head>
          This is what enables Google's expandable FAQ accordion in search results
          The schema reads from the same faqs data source as the page itself
          Remove this and we lose rich results. Keep it and we get the accordion.
          We like the accordion. The accordion gets clicks. */}
      <FaqJsonLd />

      {/* children — the actual FAQ page content
          The questions. The answers. The content people actually came here for.
          We provide the SEO foundation; the page provides the substance. */}
      {children}
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Layout by Juan — FAQ butler, structured-data evangelist, and "the answer is in the FAQ" broken record.
// FAQ: "Who built this layout?" A: "Juan. Read the comment. It's right there at the top."
// P.S. — Schema.org is in. Rich results are enabled. Google is pleased. We're pleased.
