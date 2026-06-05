/**
 * Collections Layout - The backstage crew for every /collections route
 * Handles metadata, custom scrollbar, and whatever SEO housekeeping /collections needs
 * at the layout level, so the actual page doesn't have to worry about it.
 *
 * Think of it as the collections route's personal butler.
 * The page shows up, content is ready, scrollbar is styled, SEO is set.
 * The butler doesn't get credit. The butler is fine with that.
 * (The butler is Juan. Juan is not fine with that. Hence, this comment.)
 *
 * What lives here vs. the page:
 * - Metadata/SEO: here. Pages inherit it or override specific fields.
 * - LaunchpadScrollbar: here. It's layout-level styling, not page content.
 * - Collections grid, filters, search: in the page. That's the page's job.
 *
 * @author Juan - Layout architect and "browse collections" SEO enthusiast
 * (Coded with care, humor, and a deep respect for the separation of concerns)
 */

// Metadata type — the Next.js contract for what goes in <head>
// Without this type, we're just guessing at the shape. We don't guess.
import type { Metadata } from 'next'

// SEO config — absoluteUrl builds full URLs, pageTitle formats the title string
// "Browse NFT Collections | NeXus" — search engines see this. First impressions.
// Google's gotta find our collections page. These two imports make it happen.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

// LaunchpadScrollbar — custom scrollbar styling injected at layout level
// Because browser default scrollbars in 2026 are a design choice we refuse to make
// The collections grid scrolls. It should scroll beautifully. This ensures that.
import LaunchpadScrollbar from '@/components/ui/LaunchpadScrollbar'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title and description defined once, used in both metadata and OG/Twitter tags
// Because DRY isn't just a principle, it's a lifestyle (unlike my apartment, which is wet with coffee)

const title = 'Browse NFT Collections'

// Description — the sales pitch for search results and social previews
// What does /collections do? This sentence answers that. Concisely.
const description =
  'Discover and browse Solana NFT collections from creators worldwide. Filter by status and explore featured collections on our launchpad.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Everything search engines and social platforms need to represent /collections accurately
// Get this right and /collections shows up in search results with the right context
// Get it wrong and we're just another unindexed grid of images in the void
export const metadata: Metadata = {
  // Title — "Browse NFT Collections" in the tab, in search results, in Discord previews
  title,

  // Description — the one-liner that convinces searchers to click on us
  // "Discover and browse" is active language. We want active users.
  description,

  // Canonical URL — "this is THE collections page, not some duplicate"
  // Duplicate content penalties are real. We sidestep them proactively.
  alternates: { canonical: absoluteUrl('/collections') },

  // Open Graph — for when someone shares /collections on social media
  // "Here's where to browse all the drops" — with a proper title and description
  // No OG image override here — inherits from root layout. Root layout has us covered.
  openGraph: {
    title: pageTitle(title),      // "Browse NFT Collections | NeXus"
    description,
    url: absoluteUrl('/collections'),
  },

  // Twitter Card — same energy, different platform
  // Someone sharing /collections on Twitter/X deserves a properly labeled card
  twitter: {
    title: pageTitle(title),
    description,
  },
}

// ── Layout Component ──────────────────────────────────────────────────────────

/**
 * CollectionsLayout - Wraps all /collections routes
 * Provides the custom scrollbar component and the metadata above.
 * That's it. Minimal DOM. Clean. Efficient. Like a Swiss watch, but for layouts.
 *
 * children = CollectionsPage (the filters, grid, all the good stuff)
 * We're the frame. They're the art. You know the drill by now.
 */
export default function CollectionsLayout({
  children,
}: {
  // children — whatever lives under /collections in the route tree
  // Today: the collections page. Tomorrow: maybe sub-routes. Who knows.
  // We'll be here either way, scrollbar ready.
  children: React.ReactNode
}) {
  return (
    // Fragment — no wrapper div, no extra DOM nodes, no layout crimes
    // Clean HTML output. SEO bots appreciate it. Lighthouse appreciates it.
    // Our future selves appreciate it.
    <>
      {/* LaunchpadScrollbar — custom scrollbar styles injected here
          The collections page has a long scroll. It should scroll with dignity.
          Without this: ugly default scrollbar. With this: chef's kiss.
          A small thing that makes a big visual difference. Like seasoning. */}
      <LaunchpadScrollbar />

      {/* children — the actual collections page content
          The real MVP lands here. We just set the stage.
          Filters, search, grid, load more — all of that lives in the page.
          We provide the scrollbar and the SEO. They provide everything else. */}
      {children}
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Layout by Juan — because layout files deserve signatures too.
// Browse. Discover. The scrollbar is nice. The SEO is tight. You're welcome.
// P.S. — If you're here debugging a layout issue: check the Suspense boundary in the page.
