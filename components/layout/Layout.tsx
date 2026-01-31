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

// Suspense + lazy - so we can lazy-load the Footer without blocking the shell
import { Suspense, lazy } from 'react'
// Layout styles - wrapper, main area, etc.
import styles from './Layout.module.css'
// Network banner - shows when user is on wrong network (e.g. mainnet vs devnet)
import NetworkBanner from '@/components/wallet/NetworkBanner'
// Header - nav links, search, connect wallet
import Header from './Header'

// Lazy load Footer only; Header + ConnectWallet stay in layout (no dynamic wrapper)
// Because the Footer is below the fold and we're not in a hurry to load it
const Footer = lazy(() => import('./Footer'))

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      {/* Skip link - a11y. Keyboard users can jump to main without tabbing through the header */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main" className={styles.main} role="main">
        {/* Network banner - only visible when user is on wrong network */}
        <NetworkBanner />
        {children}
      </main>
      {/* Footer - lazy loaded so initial paint is faster */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Wrappers gonna wrap.
