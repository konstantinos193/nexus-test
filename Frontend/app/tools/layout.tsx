/**
 * Tools Layout - The Minimal Wrapper for /tools and Its Creator Toolkit Pages
 * Metadata, SEO, canonical URLs. That's the whole contribution of this file.
 * Zero extra DOM. Clean pass-through. The tools page doesn't need layout decoration.
 * It needs discoverability — so creators searching "NFT tools" can find us.
 * We provide that. Then we step back.
 *
 * What this layout covers:
 * /tools — the main tools page (snapshot, trade, airdrop, burn, etc.)
 * Any future sub-routes under /tools will inherit this metadata as their default
 *
 * The tools here span two chains:
 * - Solana tools: snapshot holders, NFT exchange, batch airdrop, metadata editing, burn, quick mint
 * - Bitcoin tools: Ordinals inscriptions studio (the OG chain gets a tab)
 * More are coming. The metadata description will need updating when they do.
 * (Juan is aware. Juan has a calendar reminder. Juan will handle it.)
 *
 * @author Juan - Layout architect, tools-page SEO enthusiast, and "manual work is for peasants" believer
 * (Coded with care, because finding the tools page via Google is better than hunting through nav)
 */

// Metadata type — the TypeScript shape for Next.js <head> configuration
// Type it correctly or TypeScript will remind you with passive-aggressive red underlines
import type { Metadata } from 'next'

// SEO config — absoluteUrl builds full canonical URLs, pageTitle formats "NFT Tools | NeXus"
// Creators searching for NFT tools should find us. These two imports make that possible.
import { absoluteUrl, pageTitle } from '@/lib/seo/config'

// ── Page Identity ─────────────────────────────────────────────────────────────
// "NFT Tools" — direct, searchable, exactly what someone looking for this would type
// The description enumerates the actual tools for search engine keyword coverage

const title = 'NFT Tools'

// Description — covers both chains (Solana + Bitcoin) and the specific tools available
// "snapshot holders, trade NFTs, airdrop, update metadata, burn NFTs, mint single NFT"
// These are the search terms creators use. We put them in the description. SEO 101.
const description =
  'NFT creator tools: snapshot holders, trade NFTs, airdrop, update metadata, burn NFTs, mint single NFT. Solana and Bitcoin Ordinals support.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Complete metadata for /tools — title, description, canonical, OG, Twitter
// No robots override: inherits the root layout's default (index: true, follow: true)
// The tools page is public-facing and should be indexed. Always.
export const metadata: Metadata = {
  // Title — "NFT Tools" in the browser tab and search results
  // The tab title that makes creators click when they're comparing launchpads
  title,

  // Description — the search snippet that appears below the title in search results
  // Enumerates specific tools because specificity converts better than vague promises
  description,

  // Canonical — one official URL for the tools page
  // If someone ever links to /tools?ref=sidebar, this tells Google "ignore that, use this"
  alternates: { canonical: absoluteUrl('/tools') },

  // Open Graph — for when someone shares the tools URL on Discord, Twitter, anywhere
  // "NFT Tools | NeXus" — clear, specific, worth clicking
  openGraph: {
    title: pageTitle(title),      // "NFT Tools | NeXus"
    description,
    url: absoluteUrl('/tools'),
  },

  // Twitter Card — same card content formatted for Twitter/X
  // Some creators tweet about tools they find useful. We want to show up nicely when they do.
  twitter: {
    title: pageTitle(title),
    description,
  },
}

// ── Layout Component ──────────────────────────────────────────────────────────

/**
 * ToolsLayout - The pass-through layout for /tools routes
 * Provides metadata. Renders children. Does nothing else.
 * The most efficient layout possible — minimal DOM, maximum discoverability.
 *
 * Why does this exist if it just returns children?
 * Same reason as all the other layouts: Client Components (the tools page uses 'use client')
 * cannot export metadata in Next.js 13+. The layout is the Server Component that holds the metadata.
 * Children receive it by being rendered inside this layout's route segment.
 * Framework rules. We follow them. The tools page is indexed. Everyone wins.
 */
export default function ToolsLayout({
  children,
}: {
  // children — the tools page component and any future /tools sub-routes
  // Today: the main tools grid. Tomorrow: /tools/snapshot, /tools/airdrop, etc.?
  // The layout will be here either way, metadata ready, SEO intact.
  children: React.ReactNode
}) {
  // Direct fragment render — no wrapper element, no layout crimes
  // The tools page manages its own max-width and padding
  // We don't layer structure on top of structure. We've learned from past mistakes.
  return children
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Layout by Juan — tools wrapper, SEO enforcer, and "manual work is for peasants" layout architect.
// Snapshot. Airdrop. Burn. Inscribe. The metadata is tight. The page is discoverable.
// P.S. — If you're adding a new tool, update the description above. Juan left a reminder. Use it.
