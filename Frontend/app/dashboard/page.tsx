'use client'

/**
 * Dashboard Page - The Creator Command Center
 * Where wallet-connected creators see their collections, stats, and management links
 * If you're here without a wallet connected, you'll see a very polite "please connect" screen
 * (We could have made it rude. We chose not to. You're welcome.)
 *
 * Two-component architecture:
 * - DashboardContent: the real dashboard, only rendered when wallet is connected
 * - DashboardPage: the outer guard that checks walletReady before rendering anything
 *
 * Why split them?
 * Because WalletReadyContext tells us whether the wallet provider has finished hydrating
 * Rendering DashboardContent before the provider is ready = wallet hooks return undefined
 * Wallet hooks returning undefined = wrong state flashed to the user
 * Wrong state = confused users = bad experience = Juan gets blamed
 * (Juan does not want to be blamed. Hence, the guard pattern.)
 *
 * @author Juan - Dashboard builder, wallet guard architect, and "connect your wallet" narrator
 * (Coded with care, React patterns, and a genuine appreciation for clean loading states)
 */

// React hooks — useState for local state, useEffect for the fetch lifecycle, useContext for wallet guard
// Three hooks, one file, infinite wallet states to handle
import { useState, useEffect, useContext } from 'react'

// useRouter — programmatic navigation, used to send users to the edit page on "Manage" click
// router.push() is the polite way to redirect. History.pushState is the chaotic way.
import { useRouter } from 'next/navigation'

// useWallet — the Solana wallet adapter hook
// Gives us publicKey (the connected wallet's address) and connection state
// publicKey is null when no wallet is connected. The source of all conditional rendering below.
import { useWallet } from '@solana/wallet-adapter-react'

// Card, CardContent — the UI boxes that hold stat blocks and the empty-state message
// Without these the dashboard would be floating text. Floating text is sad.
import { Card, CardContent } from '@/components/ui/Card'

// Button — the "Create Collection" CTA and any action buttons
// Because <button> tags without styling are a crime against UI
import Button from '@/components/ui/Button'

// CollectionCard — the card component for individual collection display
// Renders the collection's image, name, status badge, and mint progress
// The main visual unit of the collections grid
import CollectionCard from '@/components/features/collections/CollectionCard'

// NFTCollection — the TypeScript type for a collection object from the API
// Without this type, collections would be `any[]` and TypeScript would grieve
import { NFTCollection } from '@/types'

// collectionsApi — the API client for fetching collections by creator wallet
// Talks to the backend, returns data (or an error, which we handle gracefully)
import { collectionsApi } from '@/lib/api/client'

// WalletReadyContext — the context that tells us the wallet provider has finished hydrating
// False = provider still loading, don't render wallet-dependent components yet
// True = ready, wallet hooks are safe to call
// This is the SSR safety net. Without it we get hydration mismatches on load.
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'

// Lucide icons — the visual language of the stats row and empty states
// Plus = create, TrendingUp = minted/active stats, Users = supply, Image = collection icon
// Settings = the "Manage" button icon on each collection card
import { Plus, TrendingUp, Users, Image as ImageIcon, Settings } from 'lucide-react'

// Link — Next.js's router-aware anchor. Prefetches on hover. Better than <a> for internal nav.
// Used for the "Create Collection" button that goes to /create
import Link from 'next/link'

// ── DashboardContent ─────────────────────────────────────────────────────────
// The inner component — only rendered after WalletReadyContext confirms the provider is live
// Contains all the wallet-dependent logic: fetching collections, computing stats, rendering grid

/**
 * DashboardContent - The real dashboard UI
 * Rendered only when walletReady is true (see DashboardPage below)
 * Uses useWallet() to get the connected address, then fetches that creator's collections
 *
 * States handled:
 * - No wallet connected: connect prompt UI
 * - Loading: "Loading your collections…" text (skeleton would be nicer, but later)
 * - Has collections: stats row + collection grid with Manage buttons
 * - No collections yet: empty state card with "Create Collection" CTA
 */
function DashboardContent() {
  // publicKey — the connected wallet's Solana public key object, or null if not connected
  // We convert it to a base58 string for API calls and display
  const { publicKey } = useWallet()

  // walletAddress — the base58 string version of the wallet address
  // Null when no wallet is connected. All data fetching gates on this value.
  const walletAddress = publicKey?.toBase58() ?? null

  // router — for programmatic navigation to the edit page
  // Uses mintAddress when available (deployed collections); falls back to UUID for drafts
  const router = useRouter()

  // collections — the creator's NFT collections fetched from the API
  // Starts empty, populated by the useEffect below once walletAddress is available
  const [collections, setCollections] = useState<NFTCollection[]>([])

  // loading — true while the API request is in flight
  // Controls the loading state text in the collections section
  const [loading, setLoading] = useState(false)

  // ── Data Fetch ──────────────────────────────────────────────────────────
  // Fetches collections whenever walletAddress changes (connect, disconnect, switch wallet)
  // On disconnect (walletAddress becomes null): clears the list immediately
  // On connect: fires the API request, shows loading, populates on success
  useEffect(() => {
    // No wallet? No data. Clear any existing collections and bail.
    if (!walletAddress) { setCollections([]); return }

    // Wallet connected — fetch their collections from the backend
    setLoading(true)
    collectionsApi.getAll({ creator: walletAddress })
      .then(res => {
        // Only update state if the response was successful and has data
        // If it failed or returned empty, we just end up with an empty array
        if (res.success && res.data) setCollections(res.data)
      })
      // Always clear loading, even if the request failed
      // Because a stuck loader is worse than an empty state
      .finally(() => setLoading(false))
  }, [walletAddress])

  // ── Derived Stats ───────────────────────────────────────────────────────
  // Computed from the collections array — these power the stats cards at the top

  // totalMinted — sum of all minted NFTs across all collections
  // The big number creators want to see grow over time
  const totalMinted = collections.reduce((s, c) => s + c.minted, 0)

  // totalSupply — sum of all planned supply across all collections
  // "You've minted X out of Y total" — the completion context
  const totalSupply = collections.reduce((s, c) => s + c.totalSupply, 0)

  // activeCount — how many collections are currently in "minting" status
  // The "live right now" indicator — the number creators refresh the page to see change
  const activeCount = collections.filter(c => c.status === 'minting').length

  // ── No Wallet State ─────────────────────────────────────────────────────
  // User hit /dashboard without a connected wallet
  // Show a friendly prompt instead of a broken dashboard
  // An ImageIcon because we need something to fill the space visually
  if (!walletAddress) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* ImageIcon — placeholder visual for the empty/disconnected state */}
        <ImageIcon className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-text-primary mb-2">Connect your wallet</h2>
        <p className="text-dark-text-secondary">Connect your Solana wallet to manage your collections.</p>
      </div>
    )
  }

  // ── Connected Dashboard ─────────────────────────────────────────────────
  // Wallet is connected and wallet address is available
  // Render the full dashboard: header, stats, collections grid
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ── Dashboard Header ──────────────────────────────────────────────
          Title + subtitle on the left, "Create Collection" CTA on the right
          The Create button is always visible — even if they have collections,
          maybe they want another one. We encourage ambition. */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {/* H1 — "Dashboard" — big, bold, creator-facing */}
          <h1 className="text-4xl font-bold text-dark-text-primary mb-2">Dashboard</h1>
          {/* Subtitle — sets context for what the dashboard is for */}
          <p className="text-dark-text-secondary">Manage your collections and track your NFT journey</p>
        </div>
        {/* Create Collection CTA — top-right, always visible
            Links to /create so the creator can start a new collection at any time
            Plus icon + "Create Collection" text — clear, actionable, not subtle */}
        <Link href="/create">
          <Button variant="primary" className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Create Collection</span>
          </Button>
        </Link>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────────
          Four stat cards: Total Collections, Total Minted, Total Supply, Active
          Rendered from an array of objects so we don't write four identical Card blocks
          Each card has a label, a value, and an icon for visual hierarchy
          The numbers update as collections are fetched. If they're all zero, you're new here. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          // Total Collections — how many distinct drops this creator has launched
          { label: 'Total Collections', value: collections.length, icon: <ImageIcon className="w-6 h-6 text-dark-accent-primary" /> },
          // Total Minted — the cumulative NFTs minted across all their collections
          { label: 'Total Minted',      value: totalMinted,        icon: <TrendingUp className="w-6 h-6 text-dark-accent-success" /> },
          // Total Supply — the planned total across all collections
          { label: 'Total Supply',      value: totalSupply,        icon: <Users className="w-6 h-6 text-dark-accent-secondary" /> },
          // Active — how many collections are currently in "minting" status
          { label: 'Active',            value: activeCount,        icon: <TrendingUp className="w-6 h-6 text-dark-accent-warning" /> },
        ].map(({ label, value, icon }) => (
          // One Card per stat — elevated variant for depth, p-6 padding for breathing room
          <Card key={label} variant="elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  {/* Stat label — small, tertiary color, below the number */}
                  <p className="text-sm text-dark-text-tertiary mb-1">{label}</p>
                  {/* Stat value — big, bold, primary color, the number that matters */}
                  <p className="text-3xl font-bold text-dark-text-primary">{value.toLocaleString()}</p>
                </div>
                {/* Icon — visually identifies the stat. Rounded tertiary background. */}
                <div className="p-3 bg-dark-bg-tertiary rounded-lg">{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Collections Section ───────────────────────────────────────────
          The actual collections grid. This is what creators come here to see.
          Three states: loading, has-collections, no-collections-yet */}
      <div>
        <h2 className="text-2xl font-bold text-dark-text-primary mb-6">Your Collections</h2>

        {/* Loading state — simple text while the API request is in-flight
            A skeleton loader would be nicer but text is honest and fast to ship */}
        {loading ? (
          <p className="text-dark-text-secondary py-12 text-center">Loading your collections…</p>

        ) : collections.length > 0 ? (
          // Has collections — render the grid of collection cards with Manage buttons
          // 1 col mobile → 2 col tablet → 3 col desktop → 4 col wide desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map(c => (
              // Each collection gets a card + a Manage button below it
              // The card shows the visual; the button leads to the edit page
              <div key={c.id} className="flex flex-col gap-2">
                {/* CollectionCard — the visual tile for this collection */}
                <CollectionCard collection={c} />
                {/* Manage button — navigates to the edit/management page for this collection
                    Settings icon + "Manage" text — clear, actionable, consistent
                    border variant because it's secondary to the card above it */}
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/collections/${c.mintAddress ?? c.id}/edit`)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dark-border-primary bg-dark-bg-secondary text-dark-text-secondary text-sm hover:bg-dark-bg-tertiary hover:text-dark-text-primary transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </button>
              </div>
            ))}
          </div>

        ) : (
          // No collections yet — empty state card with a "Create Collection" CTA
          // Encouraging, not judgy. Everyone starts with zero collections. Even the big ones.
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              {/* ImageIcon — the visual centerpiece of the empty state */}
              <ImageIcon className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-text-primary mb-2">No Collections Yet</h3>
              <p className="text-dark-text-secondary mb-6">Start your NFT journey by creating your first collection</p>
              {/* Create Collection CTA — the big invitation to start
                  Links to /create. This is where the journey begins. */}
              <Link href="/create"><Button variant="primary">Create Collection</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── DashboardPage (Exported Default) ─────────────────────────────────────────

/**
 * DashboardPage - The outer guard component
 * Checks WalletReadyContext before rendering DashboardContent
 *
 * Why this guard exists:
 * Solana wallet providers are browser-only. During SSR and initial hydration,
 * the wallet context doesn't exist yet. If we render DashboardContent immediately,
 * useWallet() returns a stub state that doesn't match what the browser will hydrate to.
 * Result: hydration mismatch, React warnings, potentially wrong UI flashed to the user.
 *
 * WalletReadyContext flips to true once PhantomProviderClient confirms the provider is live.
 * Before that: we show the same "connect wallet" UI as DashboardContent's disconnected state.
 * After that: we render DashboardContent which can safely call useWallet().
 *
 * It looks like duplication. It's actually correctness.
 */
export default function DashboardPage() {
  // walletReady — false during SSR and initial hydration, true once the provider is mounted
  // This is the entire purpose of WalletReadyContext — one boolean that unlocks wallet UI
  const walletReady = useContext(WalletReadyContext)

  // Not ready yet — show the connect prompt during hydration
  // Same visual as DashboardContent's "no wallet" state, for consistency
  if (!walletReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* ImageIcon — consistent with the connected/loading empty state visual */}
        <ImageIcon className="w-16 h-16 text-dark-text-tertiary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-text-primary mb-2">Connect your wallet</h2>
        <p className="text-dark-text-secondary">Connect your Solana wallet to manage your collections.</p>
      </div>
    )
  }

  // Wallet provider is ready — safe to render the full dashboard with wallet hooks
  return <DashboardContent />
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — dashboard builder, wallet-guard architect, and stats-row enthusiast.
// Connect your wallet. See your collections. Hit "Manage." Build your empire.
// P.S. — All those stats start at zero. Doesn't mean they stay there.
