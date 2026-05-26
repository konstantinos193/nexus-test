'use client'

/**
 * DeployForm - Step 4: The pre-flight countdown before going live on Solana.
 * Raw data dump is out; visual launch experience is in — collection preview,
 * pre-flight checklist, phase timeline, and the one button that makes it real.
 * This is where "almost done" becomes "actually done, forever, on-chain."
 *
 * The blockchain doesn't have an undo button, but at least it looks nice now.
 * (Step 4 of 4. No pressure. A little pressure. It's immutable.)
 *
 * @author Juan - The developer who made "Deploy" feel both exciting and terrifying
 * (Coded with care, humor, and probably too much coffee)
 */

// React hooks - object URL lifecycle management for banner/PFP previews
// Without useMemo/useEffect the browser will quietly leak memory (silently, spitefully)
import { useMemo, useEffect } from 'react'

// Icons - the whole visual language of this step, 16 deep
// ImageIcon (not Image) because Next.js has strong opinions about module names
import {
  Rocket, AlertCircle, CheckCircle2, Loader2, ArrowLeft,
  ImageIcon, CalendarRange, Coins, Layers,
  Shield, Package, Clock, Wallet, Zap, Globe, Lock,
} from 'lucide-react'

// Button - the component that matters most on this page
// size="lg" confirmed — the Deploy button deserves the real estate
import Button from '@/components/ui/Button'

// Type contracts from the form hook — MintPhase holds the phase timeline
// SubmitState drives the deploy button label cycle through uploading → confirming
import type { SubmitState, MintPhase, MetadataStandard } from '@/hooks/useCreateCollectionForm'

// DEPLOY_LABELS — unchanged from before, drives the button copy during the deploy flow
// Each state gets one clear message so the user knows what the chain is doing
const DEPLOY_LABELS: Record<SubmitState, string> = {
  idle:       'Deploy on Solana',
  uploading:  'Uploading images…',
  deploying:  'Building transaction…',
  signing:    'Sign in wallet…',
  confirming: 'Confirming on-chain…',
  success:    'Deployed!',
  error:      'Try Again',
}

// DeployFormProps — unchanged interface, all step data flows in as flat props
// The parent owns state; this component is pure presentation + one button click
interface DeployFormProps {
  // Step 1
  collectionName:   string
  symbol:           string
  description:      string
  metadataStandard: MetadataStandard
  royaltyPercent:   number
  royaltyWallet:    string
  walletAddress:    string | null
  imageFile:        File | null
  bannerFile:       File | null
  // Step 2
  imageFiles:       File[]
  metadataFiles:    File[]
  imagesBaseUri:    string | null
  metadataBaseUri:  string | null
  // Step 3
  totalSupply:      number | ''
  mintPrice:        number | ''
  freeMint:         boolean
  phases:           MintPhase[]
  // Deploy
  isConnected:   boolean
  submitState:   SubmitState
  isDeploying:   boolean
  error:         string | null
  onDeploy:      () => void
  onBack:        () => void
}

// formatPhaseDate - ISO date string → human-readable "Nov 15, 2024, 2:30 PM"
// Empty/undefined → "TBD" (no crashes from undefined startDateTime)
function formatPhaseDate(dateStr?: string): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// CheckCard - shape for the three pre-flight cards in section D
// ok: false shows amber warning but never blocks the Deploy button
interface CheckCard {
  icon:  React.ReactNode
  title: string
  items: string[]
  ok:    boolean
}

export default function DeployForm({
  collectionName, symbol, description, metadataStandard,
  royaltyPercent, royaltyWallet: _royaltyWallet, walletAddress: _walletAddress,
  imageFile, bannerFile,
  imageFiles, metadataFiles, imagesBaseUri: _imagesBaseUri, metadataBaseUri: _metadataBaseUri,
  totalSupply, mintPrice, freeMint, phases,
  isConnected, submitState, isDeploying, error,
  onDeploy, onBack,
}: DeployFormProps) {
  const isSuccess = submitState === 'success'

  // Object URLs for preview images — created once per file reference, revoked on unmount
  // Avoids the browser silently holding onto blob URLs after the user navigates away
  const pfpUrl    = useMemo(() => imageFile  ? URL.createObjectURL(imageFile)  : null, [imageFile])
  const bannerUrl = useMemo(() => bannerFile ? URL.createObjectURL(bannerFile) : null, [bannerFile])
  useEffect(() => () => {
    if (pfpUrl)    URL.revokeObjectURL(pfpUrl)
    if (bannerUrl) URL.revokeObjectURL(bannerUrl)
  }, [pfpUrl, bannerUrl])

  // Pre-flight cards — amber if something's missing, green if ok, never blocks deploy
  // These are advisory; the user still knows what they're doing (or should)
  const checkCards: CheckCard[] = [
    {
      icon:  <Layers className="w-5 h-5" />,
      title: 'Collection',
      items: [
        collectionName || '—',
        `${royaltyPercent}% royalty`,
        metadataStandard,
      ],
      ok: !!(collectionName && metadataStandard),
    },
    {
      icon:  <ImageIcon className="w-5 h-5" />,
      title: 'Media',
      items: [
        `${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''}`,
        `${metadataFiles.length} metadata file${metadataFiles.length !== 1 ? 's' : ''}`,
      ],
      ok: imageFiles.length > 0 || metadataFiles.length > 0,
    },
    {
      icon:  <CalendarRange className="w-5 h-5" />,
      title: 'Mint Phases',
      items: [
        `${phases.length} phase${phases.length !== 1 ? 's' : ''}`,
        phases[0]?.startDateTime
          ? `Starts ${formatPhaseDate(phases[0].startDateTime)}`
          : 'No start date set',
      ],
      ok: phases.length > 0,
    },
  ]

  return (
    <div className="space-y-7">

      {/* ── A: Error / Success Banners — same logic as before, just moved to top ── */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {isSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-accent-success/10 border border-dark-accent-success/30 text-dark-accent-success text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Collection deployed successfully! Redirecting…
        </div>
      )}

      {/* ── B: Hero Header — sets the mood before the user sees anything technical ── */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dark-accent-primary/15 text-dark-accent-primary border border-dark-accent-primary/25">
          Step 4 of 4
        </span>
        <h2 className="text-2xl font-bold text-dark-text-primary">You&apos;re almost live.</h2>
        <p className="text-sm text-dark-text-tertiary max-w-sm mx-auto">
          Review your collection below. Once deployed, the blockchain keeps it forever — so make sure everything looks right.
        </p>
      </div>

      {/* ── C: Collection Preview Card — banner + PFP overlap + name/description ── */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary overflow-hidden">
        {/* Wide banner strip — gradient fallback when no file uploaded */}
        <div className="relative w-full" style={{ aspectRatio: '16/6' }}>
          {bannerUrl
            ? <img src={bannerUrl} alt="Collection banner" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-linear-to-r from-dark-accent-primary/30 via-dark-accent-secondary/20 to-dark-accent-primary/10" />
          }
          {/* PFP bleeds over the bottom edge of the banner — absolute positioning does the overlap */}
          <div className="absolute -bottom-8 left-5">
            <div className="w-16 h-16 rounded-full border-4 border-dark-bg-secondary bg-dark-bg-tertiary overflow-hidden flex items-center justify-center">
              {pfpUrl
                ? <img src={pfpUrl} alt="Collection PFP" className="w-full h-full object-cover" />
                : <Layers className="w-7 h-7 text-dark-text-tertiary" />
              }
            </div>
          </div>
        </div>
        {/* pt-10 clears the PFP overlap so content doesn't collide */}
        <div className="pt-10 px-5 pb-5 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-dark-text-primary">
              {collectionName || 'Unnamed Collection'}
            </span>
            {symbol && (
              <span className="text-sm text-dark-text-tertiary font-mono">${symbol}</span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-dark-accent-primary/10 text-dark-accent-primary">
              {metadataStandard}
            </span>
          </div>
          {description && (
            <p className="text-sm text-dark-text-secondary leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      {/* ── D: Pre-flight Checklist — 3 cards, 1-col mobile / 3-col desktop ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {checkCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border p-4 space-y-2 ${
              card.ok
                ? 'border-dark-border-primary bg-dark-bg-secondary'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${card.ok ? 'text-dark-text-primary' : 'text-amber-400'}`}>
                {card.icon}
                <span className="text-sm font-semibold">{card.title}</span>
              </div>
              {card.ok
                ? <CheckCircle2 className="w-4 h-4 text-dark-accent-success shrink-0" />
                : <AlertCircle  className="w-4 h-4 text-amber-400 shrink-0" />
              }
            </div>
            <ul className="space-y-0.5">
              {card.items.map((item) => (
                <li key={item} className="text-xs text-dark-text-tertiary">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── E: Key Numbers Strip — 2-col mobile / 4-col desktop ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Package className="w-4 h-4" />, label: 'Supply',  value: totalSupply !== '' ? totalSupply.toLocaleString() : '∞' },
          { icon: <Coins   className="w-4 h-4" />, label: 'Price',   value: freeMint ? 'Free' : mintPrice !== '' ? `${mintPrice} SOL` : '—' },
          { icon: <Shield  className="w-4 h-4" />, label: 'Royalty', value: `${royaltyPercent}%` },
          { icon: <Clock   className="w-4 h-4" />, label: 'Phases',  value: String(phases.length) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-dark-text-tertiary text-xs">
              {icon}
              {label}
            </div>
            <div className="text-xl font-bold text-dark-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* ── F: Mint Phase Timeline — phase cards or empty-state dashed box ───────── */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark-text-primary flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-dark-accent-primary" />
          Mint Phase Timeline
        </h3>
        {phases.length === 0 ? (
          // Dashed empty-state — no phases is valid, just tell the user what it means
          <div className="rounded-xl border border-dashed border-dark-border-primary bg-dark-bg-secondary p-6 flex flex-col items-center gap-2 text-center">
            <CalendarRange className="w-6 h-6 text-dark-text-tertiary" />
            <p className="text-sm text-dark-text-tertiary">
              No phases defined. The collection will deploy without mint phases.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {phases.map((phase, i) => (
              <div
                key={i}
                className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary px-4 py-3 flex flex-wrap items-center gap-3"
              >
                {/* Phase number bubble */}
                <div className="w-7 h-7 rounded-full bg-dark-accent-primary/15 text-dark-accent-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-dark-text-primary">
                  {phase.name || `Phase ${i + 1}`}
                </span>
                {/* public = purple, allowlist = amber — same palette as the old table */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  phase.phaseType === 'public'
                    ? 'bg-dark-accent-primary/10 text-dark-accent-primary'
                    : 'bg-amber-400/10 text-amber-400'
                }`}>
                  {phase.phaseType}
                </span>
                <div className="ml-auto flex flex-wrap gap-3 text-xs text-dark-text-tertiary">
                  {phase.startDateTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatPhaseDate(phase.startDateTime)}
                    </span>
                  )}
                  {phase.priceOverride && (
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {phase.priceOverride} SOL
                    </span>
                  )}
                  {phase.maxPerWallet && (
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      Max {phase.maxPerWallet}/wallet
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── G: What Happens When You Deploy — 4-step explainer grid ──────────────── */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-5 space-y-3">
        <h3 className="text-sm font-semibold text-dark-text-primary">What happens when you deploy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <ImageIcon className="w-5 h-5 text-dark-accent-primary" />,        step: '1', label: 'Images pinned',     desc: 'Files uploaded to IPFS'   },
            { icon: <Zap       className="w-5 h-5 text-dark-accent-secondary" />,      step: '2', label: 'Transaction built', desc: 'Solana tx constructed'     },
            { icon: <Lock      className="w-5 h-5 text-amber-400" />,                  step: '3', label: 'You sign',          desc: 'Wallet approval'           },
            { icon: <Globe     className="w-5 h-5 text-dark-accent-success" />,        step: '4', label: 'Collection live',   desc: 'On-chain forever'          },
          ].map(({ icon, step, label, desc }) => (
            <div key={step} className="flex flex-col items-center text-center gap-2 p-3 rounded-lg bg-dark-bg-tertiary">
              {icon}
              <div>
                <div className="text-xs font-semibold text-dark-text-primary">{label}</div>
                <div className="text-xs text-dark-text-tertiary">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────────────── */}
      <div className="border-t border-dark-border-primary" />

      {/* ── H: Deploy CTA — fee estimate, back button, the big launch button ─────── */}
      <div className="space-y-4">
        {/* Info row — fee estimate + permanence warning side by side */}
        <div className="flex flex-wrap gap-4 text-xs text-dark-text-tertiary">
          <span className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Estimated fee: ~0.01–0.05 SOL
          </span>
          <span className="flex items-center gap-1.5 text-amber-400/80">
            <AlertCircle className="w-3.5 h-3.5" />
            This action is permanent
          </span>
        </div>

        {/* Back + Deploy */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isDeploying || isSuccess}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onDeploy}
            disabled={!isConnected || isDeploying || isSuccess}
            isLoading={isDeploying}
          >
            {isDeploying
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{DEPLOY_LABELS[submitState]}</>
              : <><Rocket  className="w-4 h-4 mr-2" />{DEPLOY_LABELS[submitState]}</>
            }
          </Button>
        </div>

        {/* Wallet not connected — gentle nudge, not a blocker banner */}
        {!isConnected && (
          <p className="text-xs text-dark-text-tertiary text-right flex items-center justify-end gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Connect your wallet to deploy
          </p>
        )}
      </div>

    </div>
  )
}

// Coded by Juan - one button, one transaction, one collection on Solana forever.
// P.S. - No pressure. (There's a little pressure. It's on-chain.)
