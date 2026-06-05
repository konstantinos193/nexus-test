/**
 * Tools Page - The Creator's Arsenal. The Swiss Army Knife. The Toolbelt.
 * Where NFT creators come to manage, distribute, and fine-tune their collections
 * Because a launchpad without post-launch tools is just a one-night stand
 * (We're here for the long-term relationship. That requires tools.)
 *
 * Current tool roster:
 * Solana:
 * - Holder Export: snapshot all current holders — useful for airdrops, allowlists, analytics
 * - NFT Exchange: swap/trade NFTs directly through the platform
 * - Batch Distribute (Coming Soon): airdrop to multiple wallets in one tx
 * - Edit Metadata (Coming Soon): modify on-chain metadata for your collection
 * - Incinerator (Coming Soon): permanently destroy NFTs — the nuclear option
 * - Quick Mint (Coming Soon): mint a one-off without a full collection launch
 *
 * Bitcoin:
 * - Inscriptions Studio (Coming Soon): inscribe files onto Bitcoin as Ordinals
 *
 * "Coming Soon" tools are present but disabled — Button is grayed, disabled, and honest about it
 * We show them because roadmap transparency is a feature, not a liability
 * (Also: showing "Coming Soon" makes the platform look ambitious. Because it is.)
 *
 * @author Juan - Tools curator, "manual work is for peasants" believer, and Incinerator enthusiast
 * (Coded with care, humor, and genuine excitement about burning NFTs programmatically)
 */

'use client'
// 'use client' — tool buttons will need onClick handlers when the tools are live
// Even for "Coming Soon" state, the disabled buttons need to be interactive DOM elements
// Server rendering interactive buttons would break hydration. So: client component.
// (Also: the wallet context will be needed for tool execution. We're ready for that.)

// Card components — the UI boxes that contain each individual tool
// CardContent provides the padding; Card provides the elevation and border treatment
// Each tool lives in its own Card. Organization. Structure. Professional.
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

// Button — the "Use Tool" / "Coming Soon" call-to-action for each tool
// variant="primary" for available tools (clickable, branded)
// variant="outline" for coming-soon tools (visually present, clearly disabled)
// disabled prop + the "Coming Soon" label = honest UX
import Button from '@/components/ui/Button'

// Lucide icons — the visual identifier for each tool in its card header
// Camera = snapshot (capture the state), RefreshCw = exchange (cycle/swap)
// Gift = airdrop (giving things away), Edit = metadata editing
// Flame = incinerator (because burning), Plus = quick mint (adding a new thing)
// Bitcoin = Bitcoin tools (obvious but correct)
import {
  Camera,     // Holder Export — capture a snapshot of current state
  RefreshCw,  // NFT Exchange — swap and refresh, cyclical
  Gift,       // Batch Distribute — it's a gift. You're giving NFTs. A gift icon.
  Edit,       // Edit Metadata — you're editing things. An edit icon.
  Flame,      // Incinerator — you're burning things. A flame icon. Perfect.
  Plus,       // Quick Mint — adding one new NFT. A plus. Simple.
  Bitcoin     // Bitcoin/Ordinals — the OG chain gets the OG icon
} from 'lucide-react'

// ── Tool Definitions ──────────────────────────────────────────────────────────
// Static data arrays for the tool cards
// Defined outside the component so they don't get recreated on every render
// (They never change. No state dependency. Module-level constants are faster than useState.)

// solanaTools — the Solana creator toolkit
// Ordered by readiness: available tools first, coming-soon tools after
// (Because showing available tools first is good UX. The stuff you can actually use. Today.)
const solanaTools = [
  {
    id: 'snapshot',
    name: 'Holder Export',
    description: 'Export a snapshot of all current collection holders',
    icon: Camera,       // Capture a moment in time. The camera is honest.
    comingSoon: false,  // This one is LIVE. You can use it. Right now. For real.
  },
  {
    id: 'trade',
    name: 'NFT Exchange',
    description: 'Swap and trade NFTs directly through the platform',
    icon: RefreshCw,    // Exchange = cycling items. RefreshCw communicates that.
    comingSoon: false,  // Also live. Also usable. Two working tools. We're proud.
  },
  {
    id: 'airdrop',
    name: 'Batch Distribute',
    description: 'Drop NFTs to multiple wallets in a single transaction',
    icon: Gift,         // You're giving. Gift icon. Thematic.
    comingSoon: true,   // Coming. Building. Patience, please. It's on the roadmap.
  },
  {
    id: 'update',
    name: 'Edit Metadata',
    description: 'Modify on-chain metadata for NFTs in your collection',
    icon: Edit,         // Editing. An edit icon. Sometimes the right choice is the obvious one.
    comingSoon: true,   // On-chain metadata editing is technically complex. We're doing it right.
  },
  {
    id: 'burn',
    name: 'Incinerator',
    description: 'Permanently destroy selected NFTs from your supply',
    icon: Flame,        // Fire. Burning. Permanent. Dramatic. Appropriate.
    comingSoon: true,   // We're building the safeguards before the incinerator. Responsible.
  },
  {
    id: 'mint-single',
    name: 'Quick Mint',
    description: 'Mint a one-off NFT without a full collection launch',
    icon: Plus,         // Adding one thing. A plus. Clean. Correct.
    comingSoon: true,   // Quick Mint requires its own flow separate from the collection wizard.
  },
]

// bitcoinTools — the Bitcoin Ordinals toolkit
// One entry currently — the Inscriptions Studio
// Bitcoin Ordinals support is the "we're multi-chain" signal. It's important.
const bitcoinTools = [
  {
    id: 'ordinals',
    name: 'Inscriptions Studio',
    description: 'Inscribe files and data onto Bitcoin as Ordinals',
    icon: Bitcoin,      // Bitcoin tool gets the Bitcoin icon. Unambiguous. Good.
    comingSoon: true,   // Ordinals inscription is complex. We're building it properly.
  },
]

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * ToolsPage - The exported default for /tools
 * Renders the full tools directory: page header, Solana tools grid, Bitcoin tools grid
 * All tools rendered from the data arrays above — no duplicated JSX
 * Each tool card is identical in structure; only the data changes
 *
 * Future: when tools become functional, onClick handlers will be added to the Buttons
 * and the comingSoon flag will flip to false. The UI already handles both states.
 * The architecture is ready. The tools are not. Yet.
 */
export default function ToolsPage() {
  return (
    // Fragment — root layout handles nav/footer, we handle the tools grid
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Page Header ────────────────────────────────────────────────────
            Title + subtitle — sets the context for what this page is
            "Everything you need to manage, distribute, and fine-tune" — the promise
            A strong subtitle reduces "what is this for?" confusion */}
        <div className="mb-8">
          {/* H1 — "Tools" — short, clear, the name of the section */}
          <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
            Tools
          </h1>
          {/* Subtitle — one sentence of context. Covers the three main tool categories. */}
          <p className="text-dark-text-secondary">
            Everything you need to manage, distribute, and fine-tune your NFT collections — all in one place.
          </p>
        </div>

        {/* ── Solana Tools Section ───────────────────────────────────────────
            Six tools for Solana NFT creators — two live, four coming soon
            Rendered in a 3-column responsive grid
            "Solana Tools" as the section heading because Bitcoin gets its own section below */}
        <div className="mb-12">
          {/* Section heading — "Solana Tools" clearly labels which chain these are for */}
          <h2 className="text-2xl font-bold text-dark-text-primary mb-6">
            Solana Tools
          </h2>

          {/* Tools grid — 1 col on mobile, 2 on tablet, 3 on desktop
              Each card has equal visual weight — same height, same structure, same padding */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solanaTools.map((tool) => {
              // Resolve the icon component from the tool definition
              // Named Icon (capital I) so JSX treats it as a component, not an HTML tag
              const Icon = tool.icon
              return (
                // Card with hover border accent transition — subtle, satisfying
                <Card
                  key={tool.id}
                  variant="elevated"
                  className="hover:border-dark-border-accent transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Icon box — rounded bg-tertiary container, accent color icon
                          Consistent visual treatment across all tools
                          The icon tells you what the tool does at a glance */}
                      <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                        <Icon className="w-6 h-6 text-dark-accent-primary" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          {/* Tool name — the H3 of each card */}
                          <h3 className="text-lg font-semibold text-dark-text-primary">
                            {tool.name}
                          </h3>
                          {/* "Soon" badge — only shown for coming-soon tools
                              Small, subdued, honest. Not "COMING SOON!!!" Just "Soon."
                              We're not hyping vaporware. We're noting roadmap status. */}
                          {tool.comingSoon && (
                            <span className="px-2 py-1 bg-dark-bg-tertiary text-dark-text-tertiary text-xs rounded">
                              Soon
                            </span>
                          )}
                        </div>

                        {/* Tool description — one sentence explaining what it does
                            Direct. Functional. No marketing fluff. Just what it does. */}
                        <p className="text-sm text-dark-text-secondary mb-4">
                          {tool.description}
                        </p>

                        {/* CTA Button — "Use Tool" for available, "Coming Soon" for not
                            Primary variant when live (visually prominent, actionable)
                            Outline variant when coming soon (present but clearly not yet)
                            disabled prop prevents clicks on coming-soon buttons
                            w-full because the button should fill the card width */}
                        <Button
                          variant={tool.comingSoon ? 'outline' : 'primary'}
                          size="sm"
                          disabled={tool.comingSoon}
                          className="w-full"
                        >
                          {tool.comingSoon ? 'Coming Soon' : 'Use Tool'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ── Bitcoin Tools Section ──────────────────────────────────────────
            Bitcoin Ordinals tools — currently one entry (Inscriptions Studio)
            Separate section because Bitcoin ≠ Solana and creators deserve clear categorization
            The OG chain gets its own heading. We respect the hierarchy. */}
        <div>
          {/* Section heading — "Bitcoin Tools" — clear chain attribution */}
          <h2 className="text-2xl font-bold text-dark-text-primary mb-6">
            Bitcoin Tools
          </h2>

          {/* Bitcoin tools grid — same structure as Solana tools grid
              Currently one card (Ordinals). Grid is ready for more when they ship. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bitcoinTools.map((tool) => {
              // Same pattern as Solana tools — Icon resolved from tool definition
              const Icon = tool.icon
              return (
                // Same Card treatment — visual consistency between chains
                <Card
                  key={tool.id}
                  variant="elevated"
                  className="hover:border-dark-border-accent transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Icon box — same visual treatment as Solana tools
                          Bitcoin tool icon gets the primary accent color too
                          Multi-chain doesn't mean multi-design-system */}
                      <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                        <Icon className="w-6 h-6 text-dark-accent-primary" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          {/* Tool name */}
                          <h3 className="text-lg font-semibold text-dark-text-primary">
                            {tool.name}
                          </h3>
                          {/* "Soon" badge — all Bitcoin tools are currently coming soon */}
                          {tool.comingSoon && (
                            <span className="px-2 py-1 bg-dark-bg-tertiary text-dark-text-tertiary text-xs rounded">
                              Soon
                            </span>
                          )}
                        </div>

                        {/* Tool description */}
                        <p className="text-sm text-dark-text-secondary mb-4">
                          {tool.description}
                        </p>

                        {/* CTA Button — disabled for coming-soon Bitcoin tools
                            outline variant signals "not yet, but noted" */}
                        <Button
                          variant={tool.comingSoon ? 'outline' : 'primary'}
                          size="sm"
                          disabled={tool.comingSoon}
                          className="w-full"
                        >
                          {tool.comingSoon ? 'Coming Soon' : 'Use Tool'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — tools curator, "manual NFT management is for peasants" believer, and Incinerator anticipator.
// Snapshot. Exchange. Airdrop. Edit. Burn. Mint. Inscribe. The full creator arsenal.
// Coming Soon tools: they're coming. The architecture is ready. The features are building.
// P.S. — When a tool ships, flip comingSoon to false. Juan left the instructions in the data array.
