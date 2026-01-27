'use client'

/**
 * Header Component - The Navigation Master
 * The thing that sits at the top and tells you where you are (and where you can go)
 * Because without navigation, users are just lost souls wandering the internet
 * (And we're not running a digital maze, we're running a launchpad)
 * 
 * Desktop: Traditional header with navigation links and wallet button
 * Because desktop users deserve a proper navigation bar
 * (And hamburger menus on desktop are a crime against humanity)
 * 
 * Mobile: Clean and simple - just a top bar and bottom nav
 * Because we removed all that fancy bottom sheet nonsense
 * (And sometimes simple is better - who knew?)
 * 
 * Features:
 * - Collapsible mobile header (hides when scrolling down, shows when scrolling up)
 *   Because when you're reading, you don't need the header in your face
 *   (And when you scroll up, you probably want to navigate somewhere)
 * - Bottom navigation bar (always visible, because thumb reach matters)
 *   Because reaching for the top of the screen on mobile is like doing yoga
 *   (And we're not trying to give users carpal tunnel)
 * - Wallet button in header (compact and mobile-optimized)
 *   Because wallets are important, even on mobile
 *   (And we made it look good, because we care)
 * 
 * @author Juan - The developer who built this navigation masterpiece
 * (Coded with care, humor, and probably too much coffee)
 * P.S. - This header is smarter than my GPS. It actually knows where you are.
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, Suspense, lazy } from 'react'
import { usePathname } from 'next/navigation'
import { FolderKanban, Plus, LayoutDashboard, Wrench, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './Header.module.css'

// Lazy load heavy components to reduce initial bundle size
// These are not critical for first paint
const WalletConnect = lazy(() => import('@/components/wallet/WalletConnect'))
const HeaderSearch = lazy(() => import('@/components/layout/HeaderSearch'))
const MobileSearchOverlay = lazy(() => import('@/components/layout/MobileSearchOverlay'))

// Loading fallback for lazy components
const ComponentSkeleton = () => <div className="w-8 h-8 bg-dark-bg-secondary animate-pulse rounded" />

export default function Header() {
  // Scroll state - tracks if user has scrolled past threshold
  // Because we want to change the header appearance when scrolling
  // (It's like putting on a different outfit when you go out - but for headers)
  const [scrolled, setScrolled] = useState(false)
  
  // Header collapse state - tracks if header should be hidden
  // Because hiding the header when scrolling down gives more screen space
  // (And showing it when scrolling up makes navigation easier)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  
  // Last scroll position - needed to detect scroll direction
  // Because we need to know if user is scrolling up or down
  // (Unlike my GPS, this actually works)
  const [lastScrollY, setLastScrollY] = useState(0)
  
  // Current pathname - for active route highlighting
  // Because users need to know where they are
  const pathname = usePathname()

  // Scroll handler - makes the header smart about when to show/hide
  // Because a header that doesn't respond to scrolling is like a door that doesn't open
  // (And nobody wants that)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Check if scrolled past threshold (20px)
      // Because we want to change appearance slightly when user starts scrolling
      setScrolled(currentScrollY > 20)
      
      // Collapse header when scrolling down past 100px
      // Expand header when scrolling up
      // Because hiding the header when scrolling down gives more screen space
      // And showing it when scrolling up makes navigation easier
      // (It's like a smart door that opens when you approach - but for headers)
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - collapse header
        // Because when you're reading, you don't need the header in your face
        setHeaderCollapsed(true)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - expand header
        // Because when you scroll up, you probably want to navigate somewhere
        setHeaderCollapsed(false)
      }
      
      // Always show header at the very top
      // Because at the top of the page, the header should always be visible
      // (Unlike my motivation, which is never visible)
      if (currentScrollY < 10) {
        setHeaderCollapsed(false)
      }
      
      setLastScrollY(currentScrollY)
    }
    
    // Add scroll listener with passive flag for better performance
    // Because we're not preventing default, so passive is safe
    // (And performance matters, unlike my sleep schedule)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])


  // Navigation items - the links users can click
  // Because navigation without links is like a map without destinations
  // Each item has an icon and color for the mobile quick actions
  const navigation = [
    { name: 'Collections', href: '/collections', icon: FolderKanban, color: '#00d4ff' },
    { name: 'Create', href: '/create', icon: Plus, color: '#7c3aed' },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: '#00d4ff' },
    { name: 'Tools', href: '/tools', icon: Wrench, color: '#7c3aed' },
  ]

  // Mobile search overlay - tap search icon to open
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // Check if a route is active - for highlighting current page
  // Because users need to know where they are
  // (And active states are like breadcrumbs, but for navigation)
  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Desktop Header - The Traditional Approach
          Because desktop users deserve a proper navigation bar
          (And hamburger menus on desktop are a crime against humanity) */}
      <header className={styles.desktopHeader} role="banner">
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <div className={styles.desktopNavContainer}>
            {/* Logo - the brand identity
                Because every site needs a logo (or it looks unprofessional)
                And clicking it takes you home (because that's how logos work) */}
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

            {/* Navigation Links - the main menu
                Because users need to know where they can go
                (And navigation without links is like a map without destinations)
                Each link gets highlighted when active (because knowing where you are is important)
                And they change color on hover (because interactivity is fun, unlike my social life) */}
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

            {/* Search - pill bar + live dropdown (LMNFTs-style, our design) */}
            <Suspense fallback={<ComponentSkeleton />}>
              <HeaderSearch />
            </Suspense>

            {/* Wallet Connect - the Web3 gateway
                Because we're a Web3 launchpad (and Web3 needs wallets)
                (And wallets are like keys, but for the blockchain)
                This is where users connect their digital wallets
                Because you can't buy NFTs without a wallet (obviously)
                (And trying to buy NFTs without a wallet is like trying to drive without a car) */}
            <div className={styles.desktopWalletContainer}>
              <Suspense fallback={<ComponentSkeleton />}>
                <WalletConnect />
              </Suspense>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Header - Simple and Clean
          Because mobile users deserve a clean interface
          Features: collapsible header and bottom nav */}
      <div className={styles.mobileHeaderWrapper}>
        {/* Top Bar - Minimal and Clean
            Shows logo and wallet button
            Collapses when scrolling down (because screen space matters)
            Expands when scrolling up (because navigation matters) */}
        <div className={cn(
          styles.mobileTopBar, 
          scrolled && styles.mobileTopBarScrolled,
          headerCollapsed && styles.mobileTopBarCollapsed
        )}>
          {/* Mobile Logo - smaller version for mobile
              Because mobile screens are small (obviously)
              And we don't want the logo taking up the whole header */}
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
          
          {/* Mobile Top Actions - search + wallet
              Tap search → overlay with pill + live results (same UX as desktop) */}
          <div className={styles.mobileTopActions}>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className={styles.mobileSearchButton}
              aria-label="Search collections"
              title="Search"
            >
              <Search className={styles.mobileSearchIcon} aria-hidden />
            </button>
            <div className={styles.mobileWalletButton}>
              <Suspense fallback={<ComponentSkeleton />}>
                <WalletConnect />
              </Suspense>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <MobileSearchOverlay
            open={mobileSearchOpen}
            onClose={() => setMobileSearchOpen(false)}
          />
        </Suspense>

        {/* Bottom Navigation Bar - Always Visible
            Because thumb reach matters (and bottom nav is thumb-friendly)
            Shows the same 4 items as desktop nav for consistency
            (Because consistency is key, unlike my sleep schedule)
            Each item has an icon and label (because icons alone can be confusing)
            Active state shows with a top border indicator (because visual feedback is important)
            And the icons scale up when active (because we're fancy like that) */}
        <nav className={styles.mobileBottomNav}>
          {/* Collections Link - Browse all the collections
              Because browsing is half the fun (the other half is buying)
              (And we're not judging if you just browse and never buy) */}
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
          
          {/* Create Link - Make your own collection
              Because everyone thinks they can make an NFT collection
              (And we're here to help them try, even if they fail) */}
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
          
          {/* Dashboard Link - See your stuff
              Because users need to see what they own (or what they wish they owned)
              (And dashboards are like mirrors, but for your digital assets) */}
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
          
          {/* Tools Link - Useful utilities
              Because sometimes you need tools (and not just the ones in your garage)
              (And these tools are way cooler than a hammer, trust me) */}
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

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - This header is smarter than my GPS. It actually knows where you are. 🧭
