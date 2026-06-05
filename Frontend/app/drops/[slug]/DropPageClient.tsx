'use client'

/**
 * DropPageClient - The Interactive Heart of Every Drop Detail Page
 * The client-side component that handles fetching, state, loading, errors, and the full layout
 * Server component page.tsx handles SEO metadata; this file handles everything else
 *
 * "98% of the work" is not an exaggeration. This component:
 * - Reads the slug from URL params via useParams()
 * - Fetches the collection via the frontend API proxy (/api/collections/[slug])
 * - Manages loading, error, and success states
 * - Maps the flat API response to the richer CollectionDetail type
 * - Renders the full drop detail page layout (hero, two-column, gallery, activity)
 * - Handles the mint button interaction stub (TECH-002: the real tx comes later)
 *
 * The layout uses CSS class names from collection-page.css:
 * cp-page, cp-container, cp-layout, cp-layout-main, cp-layout-side
 * grid-template-areas at its finest. Not Tailwind. Custom CSS. We're comfortable with that.
 *
 * @author Juan - The developer who turned a boring detail page into an NFT mint destination
 * (Coded with care, grid-template-areas, and an amount of CSS that would concern a therapist)
 */

// useParams — reads dynamic route params from the URL on the client side
// Gives us slug without needing to pass it as a prop from the server component
// Because prop drilling through a server→client boundary is awkward and we have tools
import { useParams, useRouter } from 'next/navigation'

// useEffect — the lifecycle hook. Fetches data when slug changes.
// useState — manages collection, loading, and error state
// Three hooks. One component. Many possible states to handle.
import { useEffect, useState } from 'react'

// ── Section Components ────────────────────────────────────────────────────────
// Each section of the drop detail page is a self-contained component
// They receive the collection object and render their slice of the UI
// No inner cp-container — they're placed inside the outer layout, not wrapped again

// CollectionHero — the full-bleed banner image + floating PFP at the top
// The first visual impression. The most important section. Makes or breaks the vibe.
import CollectionHero        from '@/components/features/collections/collection-detail/CollectionHero'

// MintInteractionModule — the sticky right-column mint card
// Phase selector, price display, quantity picker, "Mint" button — the core action
// This is why people are here. Everything else is context. This is the call to action.
import MintInteractionModule from '@/components/features/collections/collection-detail/MintInteractionModule'

// CollectionStatsBar — the stats row: supply, minted, price, holders, etc.
// Numbers. Credibility. "Look how many people minted already." Social proof.
import CollectionStatsBar    from '@/components/features/collections/collection-detail/CollectionStatsBar'

// AboutSection — the collection's description, story, vision
// The "why does this collection exist?" section. Narrative matters in NFTs.
import AboutSection          from '@/components/features/collections/collection-detail/AboutSection'

// UtilityRoadmapSection — the utility and roadmap content
// "What do you get?" and "Where is this going?" — the two questions every buyer asks
import UtilityRoadmapSection from '@/components/features/collections/collection-detail/UtilityRoadmapSection'

// TraitsSection — the trait distribution breakdown for the collection
// Rarity breakdown, trait categories, percentage distributions
// The data that trait-hunters and rarity-maximalists scroll straight to
import TraitsSection         from '@/components/features/collections/collection-detail/TraitsSection'

// NFTGalleryGrid — the gallery of individual NFTs in the collection
// Thumbnail grid. Visual. Browsable. Shows what people are actually minting.
import NFTGalleryGrid        from '@/components/features/collections/collection-detail/NFTGalleryGrid'

// ActivityFeed — the recent activity/transaction feed
// Recent mints, transfers, and events. "Other people are doing this" — FOMO generator.
import ActivityFeed          from '@/components/features/collections/collection-detail/ActivityFeed'

// Types — CollectionDetail is the richer client-side shape; NFTCollection is the API shape
// toCollectionDetail() maps between them (see below)
import type { CollectionDetail, NFTCollection } from '@/types'

// collection-page.css — the custom CSS for the drop detail page layout
// cp-page, cp-container, cp-layout — the grid structure that makes this page work
// Not Tailwind here — complex grid-template-areas, not worth converting
import '@/app/collections/collection-page.css'

// ── Utility Functions ─────────────────────────────────────────────────────────

/**
 * toCollectionDetail - Maps NFTCollection (API shape) to CollectionDetail (page shape)
 * The API returns a flat object; CollectionDetail adds computed/augmented fields
 * Phases and fundReceivers come back as JSON from Prisma — the cast is safe
 * Traits get augmented with a count field (set to 1 — real counts come from analytics)
 *
 * Think of this as the translator between "what the API says" and "what the UI needs"
 * Two dialects of the same language. We speak both.
 */
function toCollectionDetail(c: NFTCollection): CollectionDetail {
  return {
    ...c,                 // Spread all flat fields — name, slug, status, prices, all of it
    slug:   c.slug,       // Explicit reassign for clarity (the spread covers it but this is clearer)
    // Traits: map API trait objects to page trait objects with added count field
    // count: 1 is a placeholder — real rarity counts require analytics data we don't have yet
    // (TECH-003: implement rarity calculation — it's on the list, below TECH-002)
    traits: c.traits?.map((t) => ({ name: t.name, value: t.value, count: 1 })) ?? [],
  }
}

/**
 * fmtDate - Formats an ISO date string for display in the mint phases list
 * Returns a localized date string like "Jun 15, 10:00 AM"
 * Falls back to the raw ISO string if parsing fails
 * (Bad ISO strings happen. We handle them without crashing.)
 */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',   // "Jun" not "June" — brevity in data-dense UI
      day: 'numeric',   // "15" not "15th" — also brevity
      hour: '2-digit',  // "10" — two digits for consistent alignment
      minute: '2-digit', // "00" — always two digits, always aligned
    })
  } catch {
    // Date parsing failed — return the raw string rather than crash
    // An ugly date string is better than an error page
    return iso
  }
}

/**
 * phaseIsActive - Determines if a mint phase is currently active
 * A phase is active if the current time is >= startDateTime and < endDateTime
 * Phases with no endDateTime are active until the collection closes manually
 *
 * Used to apply the 'active' CSS class to the phase list item in the left column
 * Active phases get highlighted styling. Past and future phases get the normal treatment.
 */
function phaseIsActive(start: string, end?: string) {
  const now = Date.now()
  // Active = started + not yet ended (or no end date = open-ended)
  return now >= new Date(start).getTime() && now < (end ? new Date(end).getTime() : Infinity)
}

// ── DropPageClient Component ──────────────────────────────────────────────────

/**
 * DropPageClient - The full interactive drop detail page component
 * Fetches collection data from /api/collections/[slug] (the frontend proxy)
 * Renders the complete drop detail layout with all sections
 *
 * State machine:
 * - loading: true → show cp-loading spinner
 * - error: string → show cp-error with message + "Back to home" button
 * - collection: null + !loading → same as error (shouldn't happen, but handled)
 * - collection: CollectionDetail → render the full page
 *
 * Layout structure:
 * cp-page
 *   CollectionHero (full-bleed, outside container)
 *   cp-container
 *     cp-layout (two columns)
 *       cp-layout-main (left: stats, about, phases, traits)
 *       cp-layout-side (right: sticky MintInteractionModule)
 *     NFTGalleryGrid (full-width below two-col)
 *     ActivityFeed (full-width below gallery)
 */
export default function DropPageClient() {
  // useParams — reads { slug } from the /drops/[slug] URL
  // Client-side alternative to props.params from the server component
  const params = useParams()
  const router = useRouter()

  // slug — the collection identifier from the URL path
  // Cast to string | undefined because useParams values can theoretically be undefined
  const slug = params?.slug as string | undefined

  // ── State ───────────────────────────────────────────────────────────────
  // collection — the fetched and mapped CollectionDetail, or null before fetch completes
  const [collection, setCollection] = useState<CollectionDetail | null>(null)

  // loading — true while the fetch is in-flight
  // Controls the loading state render (the cp-loading element)
  const [loading, setLoading]       = useState(true)

  // error — error message string if the fetch failed, null otherwise
  // Controls the error state render with message and navigation button
  const [error, setError]           = useState<string | null>(null)

  // ── Data Fetch ──────────────────────────────────────────────────────────
  // Fetches the collection when slug is available (and re-fetches if slug changes)
  // Uses the frontend API proxy route (/api/collections/[slug]) not the backend directly
  // The proxy handles CORS and authentication concerns — we trust it
  useEffect(() => {
    // No slug = something is very wrong with the routing
    // Set an error and bail — don't attempt the fetch
    if (!slug) { setLoading(false); setError('Missing slug'); return }

    // Begin fetch — reset error state, set loading true
    setLoading(true)
    setError(null)

    // Fetch from the frontend API proxy route
    // The proxy at /api/collections/[slug] forwards to the backend and returns the same shape
    fetch(`/api/collections/${encodeURIComponent(slug)}`)
      .then((res) => {
        // Handle HTTP error responses — 404 gets a specific message; others get statusText
        if (!res.ok) throw new Error(res.status === 404 ? 'Collection not found' : res.statusText)
        return res.json()
      })
      .then((data: { success: boolean; data?: NFTCollection }) => {
        // Validate the response shape — API must return success:true with a data object
        if (!data.success || !data.data) throw new Error('Invalid response')
        // Map API shape to CollectionDetail shape and update state
        setCollection(toCollectionDetail(data.data))
      })
      .catch((e) => {
        // Any error (network, HTTP, parse, validation) lands here
        // Extract the message if it's an Error, otherwise use a generic string
        setError(e instanceof Error ? e.message : 'Unknown error')
      })
      .finally(() => {
        // Always stop loading — success or failure, the spinner should stop
        setLoading(false)
      })
  }, [slug]) // Re-run if slug changes (navigating between drop pages)

  // handleMint — the mint button callback passed to MintInteractionModule
  // Currently a stub — the real transaction logic is TECH-002
  // (_qty is prefixed with underscore to signal intentional non-use to TypeScript)
  const handleMint = (_qty: number) => {
    // TECH-002: construct and send the Solana mint transaction
    // For now: button exists, interaction is tracked, backend receives nothing
    // The blockchain receives nothing. Users understand. We told them it's coming.
  }

  // ── Loading State ───────────────────────────────────────────────────────
  // Show while the API request is in-flight
  // cp-loading is styled as a centered spinner or loading message
  if (loading) {
    return (
      <div className="cp-page">
        {/* cp-loading — the loading indicator. Simple. Honest. "We're working on it." */}
        <div className="cp-loading">Loading drop…</div>
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────────────────
  // Show when the fetch failed or the collection wasn't found
  // Provides an error message and a "Back to home" escape hatch
  // Because stranding users on an error page with no navigation is cruel
  if (error || !collection) {
    return (
      <div className="cp-page">
        <div className="cp-error">
          {/* Error message — either our specific error or "Collection not found" fallback */}
          <p>{error ?? 'Collection not found'}</p>
          {/* Back to home button — router.push for SPA navigation, not a full reload
              cp-btn-ghost is the ghost/outline button style from the collection page CSS */}
          <button type="button" className="cp-btn-ghost" onClick={() => router.push('/')}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  // ── Phase Data ──────────────────────────────────────────────────────────
  // Extract phases from the collection — defaults to empty array if not present
  // Used in the left-column phases list below (if phases.length > 0)
  const phases = collection.phases ?? []

  // ── Full Page Render ────────────────────────────────────────────────────
  // The complete drop detail page layout
  // Three layout levels: cp-page (outermost), cp-container (max-width), cp-layout (two-col)
  return (
    <div className="cp-page">

      {/* CollectionHero — the full-bleed banner + floating PFP
          NOT inside cp-container — it's intentionally full-width
          The hero breaks out of the container grid to span the full viewport
          This is a design decision. The banner should be immersive. Trust it. */}
      <CollectionHero collection={collection} />

      {/* cp-container — the max-width wrapper for all content below the hero
          Everything inside here is constrained to a comfortable reading/browsing width */}
      <div className="cp-container">

        {/* cp-layout — the two-column grid
            Left (cp-layout-main): all the info content
            Right (cp-layout-side): the sticky mint card
            grid-template-areas handles the responsive collapse to single column on mobile */}
        <div className="cp-layout">

          {/* LEFT COLUMN — information, stats, about, phases, traits ────────
              All the content that gives context and builds conviction to mint
              Stats first (numbers), then narrative (about), then specifics (phases, traits) */}
          <div className="cp-layout-main">

            {/* CollectionStatsBar — supply, minted, price, status
                The quick numbers row. Credibility in a glance.
                "5000 total / 2847 minted / 1.5 SOL" — that's the story */}
            <CollectionStatsBar collection={collection} />

            {/* AboutSection — the collection's description and narrative
                Why does this collection exist? What's the story? Who made it?
                This is where the emotional sell happens. Data sells logic; story sells heart. */}
            <AboutSection collection={collection} />

            {/* UtilityRoadmapSection — utility benefits and roadmap milestones
                "What do I get beyond the JPEG?" — answered here
                Token gating, community access, physical merch, game assets — whatever the creator promised */}
            <UtilityRoadmapSection collection={collection} />

            {/* Mint Phases List — the left-column detail view of all phases
                Only rendered when the collection actually has phases configured
                Shows phase type (Allowlist/Public), name, price, and start/end dates
                The active phase gets highlighted with the 'active' CSS class */}
            {phases.length > 0 && (
              <section className="cp-section">
                <h2 className="cp-section-title">Mint Phases</h2>
                <div className="cp-phase-list">
                  {phases.map((phase, i) => {
                    // Determine if this phase is currently active based on timestamps
                    const active = phaseIsActive(phase.startDateTime, phase.endDateTime)
                    return (
                      // cp-phase-item — one row per phase, highlighted if active
                      <div key={i} className={`cp-phase-item ${active ? 'active' : ''}`}>
                        {/* Phase badge — "Allowlist" or "Public" pill
                            CSS class matches the phaseType for color coding */}
                        <span className={`cp-phase-badge ${phase.phaseType}`}>
                          {phase.phaseType === 'allowlist' ? 'Allowlist' : 'Public'}
                        </span>
                        {/* Phase name — custom name or sensible default by type */}
                        <span className="cp-phase-name">
                          {phase.name || (phase.phaseType === 'allowlist' ? 'Allowlist Mint' : 'Public Mint')}
                        </span>
                        {/* Phase details — price and date range
                            Price: phase override → collection default → "Free"
                            Date: start → end (if set) formatted via fmtDate() */}
                        <div className="cp-phase-detail">
                          {phase.priceOverride
                            ? `◎ ${phase.priceOverride}`         // Phase has its own price
                            : collection.price != null
                              ? `◎ ${collection.price}`          // Use collection default price
                              : 'Free'}                          // No price = free mint
                          <br />
                          {/* Start date — always shown */}
                          {fmtDate(phase.startDateTime)}
                          {/* End date — only shown if set (open-ended phases have no end) */}
                          {phase.endDateTime && ` → ${fmtDate(phase.endDateTime)}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* TraitsSection — trait distribution breakdown
                Rarity percentages, trait categories, value counts
                The section that NFT collectors and rarity hunters scroll straight to */}
            <TraitsSection collection={collection} />
          </div>

          {/* RIGHT COLUMN — sticky mint card ─────────────────────────────
              The MintInteractionModule stays visible while users scroll through the left column
              Sticky positioning in CSS — users can always see and access the mint action
              maxPerTx: 10 — reasonable per-transaction limit to prevent supply hoarding */}
          <aside className="cp-layout-side">
            <MintInteractionModule
              collection={collection}
              maxPerTx={10}     // Max NFTs per transaction — configurable, currently hardcoded
              onMint={handleMint} // The mint callback stub (TECH-002: real tx goes here)
            />
          </aside>
        </div>

        {/* Full-width below the two-column section ─────────────────────────
            These sections span the full container width
            NFT gallery first (visual, immersive), then activity feed (social proof, recency) */}

        {/* NFTGalleryGrid — thumbnail grid of individual NFTs in the collection
            Visual browsing: "let me see what I might be minting"
            The gallery that closes the deal when the stats don't */}
        <NFTGalleryGrid collection={collection} />

        {/* ActivityFeed — recent mint events and transactions
            "37 people minted in the last hour" is the most powerful sales copy we have
            FOMO is a feature. The activity feed enables it. */}
        <ActivityFeed collection={collection} />
      </div>

    </div>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// DropPageClient — doing 98% of the work so page.tsx can look clean and professional.
// Every hero needs a sidekick. Every server component needs a client component.
// This is that sidekick. It deserves recognition. It handles everything interactive.
// P.S. — TECH-002 is the mint transaction. It's on the list. It's coming. We promise.
