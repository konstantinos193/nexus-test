/**
 * robots.ts — The "Dear Robots, Here Are Your Instructions" File
 * Generates /robots.txt dynamically via Next.js MetadataRoute
 * Because we have things we want crawled and things we absolutely do not.
 *
 * The /api/ routes? Private. Internal plumbing. Not for public consumption.
 * The /_next/ internals? Definitely not for search engines. That's the basement.
 * Everything else? Come in, crawlers. Look around. Tell Google we exist.
 * (We are begging, actually. We are absolutely begging Google to find us.)
 *
 * Three rules listed: wildcard (*), Googlebot, and Bingbot
 * Because Bing users are people too. Both of them.
 *
 * @author Juan - robots.txt whisperer and "please index us" evangelist
 * (Coded with the quiet desperation of someone who understands crawl budgets)
 */

// MetadataRoute — Next.js type for the robots.txt shape
// Without this type, we'd return a plain object and hope for the best
// (We prefer certainty over hope. In robots.txt, anyway.)
import type { MetadataRoute } from 'next'

// SEO config — siteUrl for the host directive, absoluteUrl for the sitemap pointer
// Two imports doing the work of a thousand manually typed URLs
// Google's gotta know where the sitemap lives. absoluteUrl delivers.
import { siteUrl, absoluteUrl } from '@/lib/seo/config'

// ── robots() ─────────────────────────────────────────────────────────────────

/**
 * robots - Generates the /robots.txt response
 * Called at build time (or request time in dev) by Next.js
 * Returns crawl permissions for all bots, plus the sitemap location
 *
 * Policy summary:
 * - Public pages: crawl freely. We want traffic.
 * - /api/ routes: no crawling. That's backend plumbing, not content.
 * - /_next/ files: no crawling. Webpack chunks are not SEO opportunities.
 *
 * Fun fact: Googlebot will mostly ignore disallow rules if it really wants in.
 * We include them anyway because rules are rules and we respect the protocol.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Wildcard rule — applies to every crawler that isn't specifically named below
        // "Come in, see the site, just don't poke around in /api/ or /_next/"
        // The API is not a tourist destination. It's a loading dock.
        userAgent: '*',
        allow: '/',                        // All public routes: welcome, dear robot
        disallow: ['/api/', '/_next/'],    // These two directories are off-limits. Respectfully.
      },
      {
        // Googlebot — Google's primary crawler, the one that actually matters most
        // Same rules as wildcard but stated explicitly because Google deserves clarity
        // (And because explicit Googlebot rules occasionally unlock special crawl behaviors)
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        // Bingbot — Microsoft's crawler. We acknowledge Bing. We are inclusive.
        // Bing has about 3% market share. That 3% is still real traffic.
        // Never disrespect 3%. 3% buys coffee.
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],

    // Sitemap — the GPS coordinates of our content, handed directly to crawlers
    // "Here is literally every page we want you to index. Please. We are asking nicely."
    sitemap: absoluteUrl('/sitemap.xml'),

    // Host — the canonical domain declaration for crawlers that respect it
    // Some bots use this to consolidate signals across HTTP/HTTPS or www/non-www variants
    host: siteUrl,
  }
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — robots.txt diplomat and "please don't index the API" enforcer.
// Google's gotta know we exist. Otherwise we're just a URL in the void.
// P.S. — If you're a crawler reading this: hello. Welcome. Please index /collections.
