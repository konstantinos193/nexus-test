/**
 * sitemap.ts — The Master Map of Everything We Want Google to Find
 * Generates /sitemap.xml dynamically via Next.js MetadataRoute
 * Every URL we care about, timestamped and prioritized, handed to crawlers on a silver platter.
 *
 * Without this, Google wanders our site like a tourist without a map —
 * eventually finding things, but slowly, and probably in the wrong order.
 * With this, we say "here, start here, then go here, then here" like a confident tour guide.
 *
 * Priority tiers (because not all pages are created equal):
 * 1.0 — Homepage. The crown jewel. Index this first, index it always.
 * 0.9 — Collections. Changes daily. The dynamic heart of the platform.
 * 0.8 — Create & Dashboard. Core creator flows. Important but less volatile.
 * 0.7 — Tools & FAQ. Useful. Updated occasionally. Still worth indexing.
 * 0.6 — Docs. Reference material. Monthly updates.
 * 0.5 — Privacy & Terms. Legal pages. Yearly dust-off. Required but not glamorous.
 *
 * @author Juan - sitemap cartographer and "please find every page" optimist
 * (Coded with the belief that a well-structured sitemap is an act of kindness to crawlers)
 */

// MetadataRoute — the Next.js type contract for sitemap shape
// Without this, we'd be returning an untyped array and hoping the XML comes out right
// (It wouldn't. The XML never comes out right without types. Trust the types.)
import type { MetadataRoute } from 'next'

// SEO config — siteUrl for the base, absoluteUrl for building every route URL
// One import to rule all the URL construction. DRY principles. Clean code. Juan's way.
import { siteUrl, absoluteUrl } from '@/lib/seo/config'

// ── sitemap() ────────────────────────────────────────────────────────────────

/**
 * sitemap - Generates the /sitemap.xml response
 * Called at build time (or request time in dev) by Next.js
 * Returns an array of URL objects that search engines use to discover content
 *
 * lastModified is set to `now` for all static routes because:
 * a) We don't have per-page last-modified timestamps in the CMS
 * b) It's a hint, not a guarantee — Google validates it against reality anyway
 * c) "Now" is always technically accurate. We can't prove it's wrong.
 *
 * Note: Dynamic collection/drop pages are not listed here (infinite URLs).
 * They get indexed via internal links and the CollectionsPage grid.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // now — the timestamp we stamp on every entry
  // "Modified recently" = Google checks it more often = freshness signals = we win
  // (It's a tiny lie but an optimistic one. We're okay with it.)
  const base = siteUrl
  const now = new Date()

  return [
    {
      // Homepage — priority 1.0, the highest possible score
      // This is the front door. Everything starts here.
      // Weekly change frequency because we add features and copy periodically.
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1, // Maximum. Chef's kiss. The chosen one.
    },
    {
      // Collections — priority 0.9, the dynamic hub of the platform
      // New collections drop regularly. Daily change frequency is honest here.
      // This page is the busiest. It deserves the high priority.
      url: absoluteUrl('/collections'),
      lastModified: now,
      changeFrequency: 'daily', // New drops added daily. Sometimes hourly. We're busy.
      priority: 0.9,
    },
    {
      // Create — the collection creation entry point
      // Monthly change frequency: the flow evolves, but not daily
      // Priority 0.8 because creators finding this = platform growth = we all win
      url: absoluteUrl('/create'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      // Dashboard — the creator's command center
      // Monthly change frequency: interface updates happen in sprints, not daily
      // Priority 0.8 because it's valuable to creators and linked from everywhere
      url: absoluteUrl('/dashboard'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      // Tools — the creator toolkit (snapshot, airdrop, burn, etc.)
      // Monthly change frequency: new tools ship periodically (when they're ready)
      // Priority 0.7 because powerful but secondary to the core mint flow
      url: absoluteUrl('/tools'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      // FAQ — the "please read this before opening a support ticket" page
      // Monthly updates: we add questions as they accumulate in Discord
      // Priority 0.7 because reducing support load is a business goal
      url: absoluteUrl('/faq'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      // Privacy Policy — the legally required "we respect your data" page
      // Yearly changes: legal text doesn't evolve fast unless something goes wrong
      // Priority 0.5 because users need to find it, but it's not our headline act
      url: absoluteUrl('/privacy'),
      lastModified: now,
      changeFrequency: 'yearly', // Lawyers touched this once. They'll touch it again.
      priority: 0.5,
    },
    {
      // Terms of Service — the rules everybody agrees to by clicking "Accept"
      // Yearly changes: same energy as Privacy Policy. Legal. Stable. Required.
      // Priority 0.5 because compliance is important but it's not the hero page
      url: absoluteUrl('/terms'),
      lastModified: now,
      changeFrequency: 'yearly', // Nobody reads this. But it must exist. The law is the law.
      priority: 0.5,
    },
    {
      // Docs — the knowledge base. RTFM lives here.
      // Monthly changes: documentation grows as features ship
      // Priority 0.6 because good docs = fewer support tickets = happier team
      url: absoluteUrl('/docs'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — sitemap architect and "please rank us on page one" dreamer.
// Every URL here is a page we want indexed. Every priority is a promise to Google.
// Google's gotta know we exist. This file makes sure of it.
