/**
 * Create Layout - The minimalist wrapper for the /create route and its descendants
 * Handles metadata and SEO so the page doesn't have to worry about it.
 * Zero extra DOM. Clean pass-through. The create flow doesn't need a fancy layout.
 * It needs clarity, breathing room, and a user who knows what they're doing.
 * (We provide the first two. The third is between them and the blockchain.)
 *
 * "Create your collection" is the most important CTA in this app.
 * It's the reason the platform exists. The layout honors that by staying out of the way.
 * No extra wrappers. No decorative containers. Just SEO metadata and children. Clean.
 *
 * @author Juan - Layout architect and "create something already" hype person
 * (Coded with care, humor, and genuine excitement that someone made it to /create)
 */

// Metadata type — the Next.js contract for SEO configuration
// Type it or TypeScript gets upset. TypeScript is always right when it gets upset.
import type { Metadata } from 'next'

// SEO config — pageTitle formats "New Collection | NeXus", absoluteUrl builds full URLs
// Search engines and social cards need to know what /create is about
// "Create and deploy your Solana NFT collection" — that's the pitch. It's a good pitch.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title is short: "New Collection" — concise, action-oriented, clear
// Description is longer because /create deserves an explanation in search results
// Someone searching "how to launch NFT collection on Solana" should find this page
// and this description should tell them "yes, you've found the right place"

const title = 'New Collection'

// Description — the full pitch for search engines and social preview cards
// Covers: what you do here (create), what you configure (metadata, art, phases),
// and who it's for ("no smart-contract experience needed" — the key differentiator)
const description =
  'Create and deploy your Solana NFT collection. Set your metadata, upload artwork, configure mint phases, and go live on-chain — no smart-contract experience needed.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// The complete metadata block for the create flow
// Canonical URL declared so Google doesn't index /create twice from different referrers
// OG and Twitter tags so sharing the create URL gives a proper preview card
// (Someone sharing "I just created a collection!" with a properly formatted card = marketing)
export const metadata: Metadata = {
  // Title — "New Collection" in the tab and search results
  // Short because creators know what this page is for. No need to over-explain.
  title,

  // Description — the detailed pitch for search result snippets
  // "No smart-contract experience needed" is the most important five words here
  description,

  // Canonical — one URL, one truth, no duplicates
  // Google punishes duplicate content. We don't give it the chance.
  alternates: { canonical: absoluteUrl('/create') },

  // Open Graph — for social previews when someone shares the create URL
  // "New Collection | NeXus" tells the viewer exactly what they're looking at
  openGraph: {
    title: pageTitle(title),  // "New Collection | NeXus" — full formatted title
    description,
    url: absoluteUrl('/create'),
  },

  // Twitter — same as OG but Twitter does its own thing, as Twitter does
  // Consistent card data across platforms. We're professional like that.
  twitter: {
    title: pageTitle(title),
    description,
  },
}

// ── Layout Component ──────────────────────────────────────────────────────────

/**
 * CreateLayout - The wrapper for /create pages
 * Does exactly one thing: passes children through unchanged.
 * The metadata above is the value prop. The layout itself is a transparent envelope.
 *
 * Why does this file exist if it just renders children?
 * Because metadata must live in a Server Component, and layout.tsx is always a Server Component.
 * page.tsx under /create is a Client Component ('use client').
 * Metadata can't be exported from a Client Component.
 * So we put it here. The framework demands it. We comply.
 * (Next.js 13+ App Router rules. We don't make them, we just live in them.)
 */
export default function CreateLayout({
  children,
}: {
  // children — the create page component and its 4-step wizard
  // All the form chaos, uploads, and "are you sure you want to deploy?" moments
  // We hold none of that complexity. We just pass it through. Gracefully.
  children: React.ReactNode
}) {
  // Fragment with no extra DOM — intentional
  // The create flow needs space. We give it space.
  // Adding a wrapper div here would upset the form layout. Don't.
  return <>{children}</>
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Layout by Juan — minimal layout, maximum metadata. We keep it clean.
// SEO is handled. The stage is set. Now go build something worth minting.
// P.S. — Create something. We've got the metadata. You've got the vision. Make it happen.
