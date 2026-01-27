'use client'

/**
 * CollectionPageFooter – Docs, Terms, Privacy, Support.
 * © 2026 Collection Name.
 */

import Link from 'next/link'
import type { CollectionDetail } from '@/types'

export interface CollectionPageFooterProps {
  collection: CollectionDetail
}

export default function CollectionPageFooter({ collection }: CollectionPageFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer className="cp-footer">
      <div className="cp-container">
        <div className="cp-footer-links">
          <Link href="/docs">Docs</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            Support
          </a>
        </div>
        <p className="cp-footer-copy">© {year} {collection.name}</p>
      </div>
    </footer>
  )
}
