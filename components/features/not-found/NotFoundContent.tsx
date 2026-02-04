'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import styles from './NotFoundContent.module.css'

/**
 * 404 Not Found Content Component
 * The page you see when someone wanders into a URL that doesn't exist
 * Because not every path leads somewhere (unlike this one – it leads to disappointment)
 *
 * Features:
 * - Big friendly 404 (because small 404s are sad)
 * - Short, honest copy (no corporate fluff)
 * - One clear escape hatch: Back to home
 *
 * @author Juan – The developer who built this digital dead end
 * (Coded with care, humor, and probably too much coffee)
 */

export default function NotFoundContent() {
  return (
    <section className={styles.section} aria-labelledby="not-found-heading">
      <div className={styles.content}>
        <h1 id="not-found-heading" className={styles.code}>
          404
        </h1>
        <p className={styles.headline}>Page not found</p>
        <p className={styles.subtext}>
          This page doesn&apos;t exist or may have been moved.
        </p>
        <Link href="/" className={styles.cta}>
          <ArrowLeft size={18} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </section>
  )
}

// Coded by Juan – because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. – If you're reading this, you found the 404. Congrats, I guess. 🎯
