'use client'

/**
 * Header - The navigation bar. The thing at the top of every page.
 * Without it, users are lost. With it, they know where they are and where they can go.
 * (This is more than most of us can say about ourselves at 2am.)
 *
 * Two header systems in one component:
 *
 * DESKTOP: Traditional horizontal nav bar. Logo left, links center, search + wallet right.
 * Hamburger menus on desktop are a crime. We don't do that here. We have standards.
 *
 * MOBILE: Collapsible top bar + always-visible bottom nav.
 * Top bar hides when scrolling down (screen real estate > brand presence while reading).
 * Top bar reappears when scrolling up (you probably want to navigate).
 * Bottom nav is always visible because thumb reach matters and top-of-screen navigation
 * on mobile is an ergonomic nightmare. We care about ergonomics.
 *
 * Scroll detection: direction-aware. Down past 100px → collapse.
 * Up at any point → expand. At very top (< 10px) → always expanded.
 * scrolled flag at 20px changes the visual appearance (background opacity, etc).
 *
 * Static imports for WalletConnect and HeaderSearch — not dynamic({ ssr: false }).
 * Next.js 16's dynamic() injects a streaming Suspense boundary around the whole Header.
 * We wrap individual components in Suspense instead. More surgical. Better behavior.
 *
 * @author Juan - The developer who built this navigation masterpiece and
 * counted every pixel in the bottom nav thumb-reach zone.
 * This header is smarter than a GPS. It actually knows where you are.
 * (Coded with care, mobile-first empathy, and a strong opinion about hamburger menus.)
 */

// Next.js Link — client-side navigation without full page reload.
// Every nav link uses this. We don't use <a> tags for internal links.
import Link from 'next/link'

// Next.js Image — optimized image loading with lazy loading, blur placeholders, and sizing.
// The logo lives here. Priority={true} because the logo is above the fold. Always.
import Image from 'next/image'

// React hooks — useState for scroll/UI state, useEffect for event listeners,
// Suspense for wrapping client-only components.
import { useState, useEffect, Suspense } from 'react'

// useSelectedLayoutSegment — returns the active URL segment without needing usePathname.
// In Next.js 16, usePathname requires its own Suspense boundary. useSelectedLayoutSegment does not.
// We use this to highlight the active nav item. The smarter choice.
import { useSelectedLayoutSegment } from 'next/navigation'

// Icons — one per nav item. Consistent visual language across desktop and mobile.
// FolderKanban = Collections. Plus = Create. LayoutDashboard = Portfolio. Wrench = Tools.
// Search = the search trigger on mobile.
import { FolderKanban, Plus, LayoutDashboard, Wrench, Search } from 'lucide-react'

// cn — classnames. Used for active/inactive nav link states throughout.
import { cn } from '@/lib/utils'

// Header.module.css — all header-scoped styles. Desktop layout. Mobile layout.
// Collapsible states. Logo sizing. Nav link hover states. Bottom nav active states.
import styles from './Header.module.css'

// WalletConnect — the wallet connection button and dropdown.
// Static import (not dynamic) to avoid Next.js 16 streaming Suspense wrapping.
// WalletConnect handles its own SSR safety via WalletReadyContext.
import WalletConnect from '@/components/wallet/WalletConnect'

// HeaderSearch — the search pill that lives in the header.
// Desktop: inline pill. Mobile: opens the MobileSearchOverlay.
import HeaderSearch from '@/components/layout/HeaderSearch'

// MobileSearchOverlay — full-screen search sheet for mobile users.
// Conditionally rendered. Controlled by mobileSearchOpen state.
import MobileSearchOverlay from '@/components/layout/MobileSearchOverlay'

// ComponentSkeleton — a simple pulse animation while dynamic components load.
// Used as Suspense fallback so header-level components don't cause layout shift.
const ComponentSkeleton = () => <div className="w-8 h-8 bg-dark-bg-secondary animate-pulse rounded" />

/**
 * Header — the exported component. One component, two layouts.
 * Desktop header and mobile header+bottom-nav render simultaneously.
 * CSS handles which is visible at which breakpoint.
 */
export default function Header() {

  // scrolled — true when page has scrolled past 20px.
  // Changes the header's visual appearance (background opacity, shadow, etc).
  const [scrolled, setScrolled] = useState(false)

  // headerCollapsed — true when the mobile top bar is hidden (scrolling down).
  // The top bar slides up and out of view. The bottom nav stays. Always.
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  // lastScrollY — tracks the previous scroll position.
  // Required to detect scroll direction (are we going up or down?).
  const [lastScrollY, setLastScrollY] = useState(0)

  // segment — the active URL segment. 'collections', 'create', 'dashboard', 'tools', or null (home).
  // Used to highlight the active nav link/bottom-nav item.
  const segment = useSelectedLayoutSegment()

  // Scroll handler — the brain behind the collapsible mobile header.
  // Passive: true so we don't block the browser's scroll rendering pipeline.
  // We're listening to scroll, not preventing it. Passive is safe here.
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // scrolled flag — cosmetic state change after 20px of scroll.
      // Affects background opacity and border visibility in CSS.
      setScrolled(currentScrollY > 20)

      // Direction detection — are we scrolling down or up?
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling DOWN past 100px — collapse the top bar.
        // 100px threshold so quick micro-scrolls don't trigger collapse.
        setHeaderCollapsed(true)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling UP — expand the top bar.
        // Any upward scroll reveals the header. User intent to navigate.
        setHeaderCollapsed(false)
      }

      // At the very top of the page — always show the header.
      // No matter what state we were in, being at top means full header.
      if (currentScrollY < 10) {
        setHeaderCollapsed(false)
      }

      setLastScrollY(currentScrollY)
    }

    // Passive event listener — non-blocking scroll detection.
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // navigation — the four main destinations. Each has a name, href, icon, and color.
  // Colors used on mobile bottom nav icons. Dark mode accent colors. Chosen deliberately.
  const navigation = [
    { name: 'Explore',    href: '/collections', icon: FolderKanban,   color: '#00d4ff' },
    { name: 'Launch',     href: '/create',      icon: Plus,           color: '#7c3aed' },
    { name: 'Portfolio',  href: '/dashboard',   icon: LayoutDashboard,color: '#00d4ff' },
    { name: 'Tools',      href: '/tools',       icon: Wrench,         color: '#7c3aed' },
  ]

  // mobileSearchOpen — controls the full-screen mobile search overlay.
  // Opened by tapping the Search icon in the mobile top bar.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // isActive — checks if a nav href matches the current segment.
  // Home (/) is active when segment is null. Others match by segment name.
  const isActive = (href: string) => href === '/' ? segment === null : segment === href.slice(1)

  return (
    <>

      {/* ── Desktop Header ────────────────────────────────────────────────── */}
      {/* Traditional horizontal bar: logo | nav links | search | wallet.
          role="banner" for AT landmark navigation.
          top accent bar is a subtle design detail — a thin gradient line above the nav. */}
      <header className={styles.desktopHeader} role="banner">
        <div className={styles.topAccentBar} aria-hidden="true" />
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <div className={styles.desktopNavContainer}>

            {/* Logo — clicking it goes home. Next.js Image for optimization.
                priority={true} because the logo is above the fold. Load it first. */}
            <div className={styles.desktopLogoContainer}>
              <Link href="/" className={styles.desktopLogoLink}>
                <Image
                  src="/nexuslogo_nobg.png"
                  alt="NeXus Launchpad"
                  width={280}
                  height={93}
                  className={styles.desktopLogoImage}
                  priority
                />
              </Link>
            </div>

            {/* Navigation links — mapped from the navigation array above.
                Active link gets the desktopNavLinkActive style. Inactive gets inactive.
                Hover changes color. Active has a visible indicator. Standard. */}
            <div className={styles.desktopNavLinks}>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    styles.desktopNavLink,
                    isActive(item.href) ? styles.desktopNavLinkActive : styles.desktopNavLinkInactive
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* HeaderSearch — the inline search pill. Desktop only position.
                Suspense with ComponentSkeleton fallback for the initial render cycle. */}
            <Suspense fallback={<ComponentSkeleton />}>
              <HeaderSearch />
            </Suspense>

            {/* WalletConnect — the blockchain gateway. The most important button in the app.
                Suspense wraps it so SSR doesn't crash on wallet SDK initialization. */}
            <div className={styles.desktopWalletContainer}>
              <Suspense fallback={<ComponentSkeleton />}>
                <WalletConnect />
              </Suspense>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Mobile Header ─────────────────────────────────────────────────── */}
      {/* Two parts: collapsible top bar + always-visible bottom nav.
          The top bar shows the logo + search icon + wallet button.
          The bottom nav shows the four main destinations as icon+label items. */}
      <div className={styles.mobileHeaderWrapper}>

        {/* Mobile top bar — collapses on scroll down, expands on scroll up.
            Three CSS modifier classes: scrolled (visual), collapsed (transform/opacity). */}
        <div className={cn(
          styles.mobileTopBar,
          scrolled && styles.mobileTopBarScrolled,
          headerCollapsed && styles.mobileTopBarCollapsed
        )}>
          <div className={styles.mobileTopBarInner}>
            {/* Mobile logo — smaller than desktop. priority={true} still applies. */}
            <Link href="/" className={styles.mobileLogoLink}>
              <Image
                src="/nexuslogo_nobg.png"
                alt="NeXus"
                width={120}
                height={40}
                className={styles.mobileLogo}
                priority
              />
            </Link>
            <div className={styles.mobileTopActions}>
              {/* Search icon button — opens the MobileSearchOverlay.
                  Opens the full-screen sheet, auto-focuses input, shows results. */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className={styles.mobileSearchButton}
                aria-label="Search"
                title="Search"
              >
                <Search className={styles.mobileSearchIcon} aria-hidden />
              </button>
              {/* Wallet button — compact version of WalletConnect for mobile top bar. */}
              <div className={styles.mobileWalletButton}>
                <Suspense fallback={<ComponentSkeleton />}>
                  <WalletConnect />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile search overlay — conditionally rendered, controlled by mobileSearchOpen. */}
        <Suspense fallback={null}>
          <MobileSearchOverlay
            open={mobileSearchOpen}
            onClose={() => setMobileSearchOpen(false)}
          />
        </Suspense>

        {/* Bottom navigation bar — always visible, even when top bar is collapsed.
            Icon + label per item. Active state shows a top border indicator.
            Four items covering the four main destinations. Consistent with desktop nav. */}
        <nav className={styles.mobileBottomNav}>

          {/* Collections — browse drops. The explorer. */}
          <Link
            href="/collections"
            className={cn(
              styles.mobileBottomNavItem,
              isActive('/collections') && styles.mobileBottomNavItemActive
            )}
          >
            <FolderKanban className={styles.mobileBottomNavItemIcon} />
            <span className={styles.mobileBottomNavItemLabel}>Collections</span>
          </Link>

          {/* Create — launch a new collection. The creator's entry point. */}
          <Link
            href="/create"
            className={cn(
              styles.mobileBottomNavItem,
              isActive('/create') && styles.mobileBottomNavItemActive
            )}
          >
            <Plus className={styles.mobileBottomNavItemIcon} />
            <span className={styles.mobileBottomNavItemLabel}>Create</span>
          </Link>

          {/* Dashboard — the collector's portfolio. "What do I own?" */}
          <Link
            href="/dashboard"
            className={cn(
              styles.mobileBottomNavItem,
              isActive('/dashboard') && styles.mobileBottomNavItemActive
            )}
          >
            <LayoutDashboard className={styles.mobileBottomNavItemIcon} />
            <span className={styles.mobileBottomNavItemLabel}>Dashboard</span>
          </Link>

          {/* Tools — utilities for the power user. Converters, validators, whatever's next. */}
          <Link
            href="/tools"
            className={cn(
              styles.mobileBottomNavItem,
              isActive('/tools') && styles.mobileBottomNavItemActive
            )}
          >
            <Wrench className={styles.mobileBottomNavItemIcon} />
            <span className={styles.mobileBottomNavItemLabel}>Tools</span>
          </Link>
        </nav>
      </div>
    </>
  )
}

// Coded by Juan — desktop nav, mobile top bar, bottom nav, collapsible scroll behavior,
// mobile search overlay trigger, and a logo that's never late to the party.
// This header is smarter than my GPS. It actually knows where you are.
// And it hides when you're reading, which is more than most headers do.
