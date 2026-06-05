/**
 * Documentation Page - The Knowledge Base. The RTFM Destination.
 * Where developers and creators come to understand how things work
 * Because reading the docs is always faster than opening a support ticket
 * (We know this. You know this. Everyone knows this. Please read the docs.)
 *
 * "RTFM energy. But we made the M actually good." — Juan, on this documentation effort
 * We put real work into these docs. Not just copy-pasted API signatures.
 * Actual explanations. Actual examples. Actual "why does this work this way" context.
 * (You're welcome. We spent the afternoon on it. It was a lot of afternoons.)
 *
 * This file: metadata + thin wrapper over DocsPageContent
 * DocsPageContent: the actual docs UI with sections, quick links, code examples
 * The data for what's in the docs lives in the component (or its children)
 * This page file is just the Server Component metadata shell. As always.
 *
 * @author Juan - Docs maintainer, "did you check the docs?" evangelist, and RTFM believer
 * (Coded with care, because good documentation is an act of kindness to future developers)
 */

// Metadata type — the TypeScript shape for Next.js <head> SEO configuration
// Docs deserve good SEO. Someone searching "how to create NFT collection Solana" should find this.
import type { Metadata } from 'next'

// SEO config — pageTitle formats "Documentation | NeXus", absoluteUrl builds canonical URLs
// Google's gotta find our docs or we're just a knowledge base that doesn't help anyone
import { pageTitle, absoluteUrl } from '@/lib/seo/config'

// DocsPageContent — the actual documentation UI component
// Renders sections, quick links, getting-started guides, API references
// The place where "how do I...?" gets answered. Ideally on the first read.
// (Nobody gets it on the first read. But we optimized for readability anyway.)
import DocsPageContent from '@/components/features/docs/DocsPageContent'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title: "Documentation" — clear, professional, what developers expect
// Description: comprehensive enough to capture multiple search intents

const title = 'Documentation'

// Description — covers what the docs contain and who they're for
// Step-by-step guides + API reference + best practices = the three things every dev wants
// "Complete documentation" is aspirational but directionally accurate
const description =
  'Complete documentation for NeXus NFT Launchpad - Learn how to create, launch, and manage NFT collections. Step-by-step guides, API reference, and best practices.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Full metadata for the docs page
// Indexed because findable docs = fewer support questions = everyone is happier
// robots: index + follow because documentation should be discoverable by design
export const metadata: Metadata = {
  // Title — "Documentation | NeXus" in tabs and search results
  // "Documentation" is the first word developers search for when they need help
  title: pageTitle(title),

  // Description — the search result snippet
  // "Step-by-step guides, API reference, and best practices" — three search intents in one line
  description,

  // Canonical — one URL for the docs page, no duplicates
  // Documentation sometimes ends up at multiple paths. We prevent that proactively.
  alternates: { canonical: absoluteUrl('/docs') },

  // Open Graph — for when the docs URL gets shared
  // It happens more than you'd think. Devs share documentation in Discord constantly.
  openGraph: {
    title: pageTitle(title),         // "Documentation | NeXus"
    description,
    url: absoluteUrl('/docs'),
  },

  // Twitter Card — same content, Twitter format
  // Some devs tweet "here are the docs" links. We want those to look good.
  twitter: {
    title: pageTitle(title),
    description,
  },

  // Robots — definitely index the docs. Follow all the links.
  // An unindexed documentation page is documentation that only exists if you already know where it is
  // That's not documentation. That's a secret. We don't keep secrets.
  robots: {
    index: true,  // Yes. Index the docs. Developers will search for them. Meet them there.
    follow: true, // Yes. Follow the links. Docs link to features, features link back to docs.
  },
}

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * DocsPage - The exported default for /docs
 * Renders when someone finally decides to read before asking questions
 * We salute them. They are doing the right thing.
 *
 * This component's job: render DocsPageContent. That's it.
 * The documentation content, layout, navigation, and search are all in DocsPageContent.
 * We just invoke it. The knowledge base handles the rest.
 *
 * If you're wondering why this file is so short: because it's supposed to be.
 * Simple pages should have simple page files.
 * The complexity lives where it belongs: in the feature component.
 */
export default function DocsPage() {
  return (
    // Fragment — root layout handles nav/footer; DocsPageContent handles everything inside
    <>
      {/* DocsPageContent — the full documentation knowledge base UI
          Sections, quick navigation links, code snippets, guides — all of it
          This is where "how does X work?" gets its answer
          If the answer isn't here: open a GitHub issue and help us improve the docs
          The docs grow through community contribution. Juan can't document everything alone.
          (He tried. It was a lot. He needed help.) */}
      <DocsPageContent />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — docs maintainer, RTFM evangelist, and "the answer is in section 3" broken record.
// Read the docs. They're good. We worked on them. Someone worked on them.
// P.S. — Your future self who finds the answer in the docs will thank your past self for looking here first.
