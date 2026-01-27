/**
 * Layout Component - The wrapper of all wrappers
 * This is where we put the header and footer so we don't repeat ourselves
 * Because DRY (Don't Repeat Yourself) is a thing, unlike my social life
 *
 * Structure:
 * - Skip link (a11y - because keyboard users matter)
 * - Header (nav + wallet - because users need to get around)
 * - Main (page content - the actual meat)
 * - Footer (links + social + copyright - because we're not animals)
 *
 * @author Juan - The developer who built this layout
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

import { Suspense, lazy } from 'react'
import styles from './Layout.module.css'

// Lazy load Header and Footer to reduce initial bundle size
// These components are not critical for first paint, so we can load them after the main content
const Header = lazy(() => import('./Header'))
const Footer = lazy(() => import('./Footer'))

// Loading fallback for header/footer
const HeaderFooterSkeleton = () => (
  <div className="h-16 bg-dark-bg-secondary animate-pulse" />
)

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Suspense fallback={<HeaderFooterSkeleton />}>
        <Header />
      </Suspense>
      <main id="main" className={styles.main} role="main">
        {children}
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Wrappers gonna wrap. 📦
