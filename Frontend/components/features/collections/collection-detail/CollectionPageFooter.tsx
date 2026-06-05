'use client'

/**
 * CollectionPageFooter – The bottom of the collection detail page. The afterthought. The closer.
 * Four links (Docs, Terms, Privacy, Support) and a copyright line.
 * Legal requirements dressed up as a nice footer. Compliance has never looked so good.
 *
 * The copyright year is computed at render time — because hardcoding "2025" is a trap
 * you only notice in February of 2026 when a user screenshots it. (Ask me how I know.)
 *
 * @author Juan – The developer who makes sure legal doesn't yell at us
 * (Coded with care, new Date(), and the knowledge that footer links are the most-ignored UI)
 */

// Link — Next.js navigation for internal pages. noopener noreferrer for the external one.
import Link from 'next/link'
// CollectionDetail type — needed for the collection name in the copyright line
import type { CollectionDetail } from '@/types'

/** Props: just the collection. We only need the name for the copyright. Keep it simple. */
export interface CollectionPageFooterProps {
  collection: CollectionDetail
}

/**
 * CollectionPageFooter — The footer that wraps up the collection page experience.
 * Legal links, copyright, and a quiet acknowledgment that this whole thing exists.
 */
export default function CollectionPageFooter({ collection }: CollectionPageFooterProps) {
  // Compute the current year at render time — never hardcode a year. Ever. Learn from others' mistakes.
  const year = new Date().getFullYear()

  return (
    // cp-footer: full-width footer with a top border and muted text colors
    <footer className="cp-footer">
      {/* cp-container constrains the content width to match the rest of the page */}
      <div className="cp-container">

        {/* ── Footer Links ────────────────────────────────────────────────────
            Four links. The legal quartet. Every platform needs them.
            Support goes to Discord — where the answers live (eventually). */}
        <div className="cp-footer-links">
          {/* Docs — for the developers and the overachievers who actually read documentation */}
          <Link href="/docs">Docs</Link>
          {/* Terms — the contract nobody reads until something goes wrong */}
          <Link href="/terms">Terms</Link>
          {/* Privacy — the page that tells you what data we collect (spoiler: wallet addresses) */}
          <Link href="/privacy">Privacy</Link>
          {/* Support — opens Discord because that's where the real support happens */}
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            Support
          </a>
        </div>

        {/* Copyright line — dynamic year so we never embarrass ourselves with a stale date.
            Named after the collection — because this footer lives on the collection's page. */}
        <p className="cp-footer-copy">© {year} {collection.name}</p>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because every page needs a footer, and footers need love too.
// (getFullYear() is the most important call in this file. Don't delete it.)
// ─────────────────────────────────────────────────────────────────────────────
