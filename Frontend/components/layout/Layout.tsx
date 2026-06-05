'use client'

/**
 * Layout - The skeleton of the entire application.
 * Header on top. Main content in the middle. Footer at the bottom.
 * Skip link for keyboard users who don't want to tab through 47 nav items.
 * Suspense boundary around the Header so wallet hydration doesn't block paint.
 *
 * This is the wrapper of all wrappers. The box that contains all other boxes.
 * Without it, the page is just floating divs and a broken footer.
 * (DRY — Don't Repeat Yourself. If you copy-paste Layout instead of using it,
 * Juan will haunt your pull requests. We've been warned. Now you have been too.)
 *
 * @author Juan - The developer who built this layout and wrapped the whole app in it.
 * (Coded with care, minimal drama, and the specific satisfaction of a closing tag
 * that lines up with its opening tag.)
 */

// Suspense — wraps Header because WalletConnect causes a client-only render cycle.
// Without Suspense, the Header hydration mismatch throws a warning in dev.
// With Suspense, the header renders null during SSR and fills in client-side.
// fallback={null} because we don't want a flash of empty space during that cycle.
import { Suspense } from 'react'

// Layout.module.css — the CSS module that defines layout, main padding, and overflow behavior.
// Changing this file affects every page simultaneously. Step carefully.
import styles from './Layout.module.css'

// Header — the navigation bar. Logo, links, search, wallet button.
// Static import (not dynamic) because dynamic({ ssr: false }) was causing
// Next.js 16 to inject a streaming Suspense boundary around the whole Header.
// Static import + Suspense wrapping = same SSR protection, better control.
import Header from './Header'

// ── Props interface ────────────────────────────────────────────────────────────
// children — the page content. Required. Without children, why are we here?
// footer — passed as a prop so the footer can be swapped out per-page if needed.
//          (It hasn't been swapped out yet. But the option exists. Options are nice.)
interface LayoutProps {
  children: React.ReactNode
  footer: React.ReactNode
}

/**
 * Layout — wraps every page in the standard Header + Main + Footer structure.
 * The skip link goes first in DOM order so keyboard users reach it first.
 * The Header is wrapped in Suspense for wallet hydration safety.
 * Children get the main element with role="main" for landmark navigation.
 */
export default function Layout({ children, footer }: LayoutProps) {
  return (
    // The outermost div — full layout container.
    // styles.layout handles min-height, flex column, background.
    <div className={styles.layout}>

      {/* Skip link — "#main" is the id on the <main> element below.
          Keyboard users press Tab once and can jump straight to content.
          Visually hidden until focused. Standard a11y pattern. Not optional.
          Screen readers and power-keyboard users depend on this. Ship it. */}
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Header — navigation, search, wallet. The thing at the top.
          Suspense with null fallback: during SSR and initial hydration,
          nothing renders here. After hydration, the Header appears.
          Users notice a ~50ms flash at most. We've made peace with that. */}
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      {/* Main — the page content. id="main" is the skip link target.
          role="main" for AT landmark navigation. styles.main handles
          padding, flex-grow, and any scroll behavior. */}
      <main id="main" className={styles.main} role="main">
        {children}
      </main>

      {/* Footer — passed as a prop. Standard Footer component in most layouts.
          Sits at the bottom of the flex column. No sticky behavior.
          If the page is short, the footer is at the bottom. If tall, it scrolls to.
          That's just how footers work. We're not reinventing physics. */}
      {footer}
    </div>
  )
}

// Coded by Juan — the layout. Skip link for accessibility. Suspense for wallet safety.
// Header, main, footer. In that order. Every time.
// Wrappers gonna wrap. That's their job. They're good at it.
