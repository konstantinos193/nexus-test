'use client'

/**
 * DeployForm - Step 4 of 4: The pre-flight countdown before going live on Solana.
 * This is it. The last form. The point of no return. The line between "draft" and "on-chain".
 *
 * Visual launch experience:
 * A. Error/success banners at the top.
 * B. Hero header — "You're almost live." Sets the mood. Raises the stakes slightly.
 * C. Collection preview card — banner + overlapping PFP + name + description.
 * D. Pre-flight checklist — three cards: Collection, Media, Mint Phases.
 * E. Key numbers strip — Supply, Price, Royalty, Phases at a glance.
 * F. Mint Phase Timeline — phase cards or an empty-state dashed box.
 * G. What happens when you deploy — 4-step explainer grid.
 * H. Deploy CTA — fee estimate, Back button, the big Rocket button.
 *
 * The blockchain doesn't have an undo button. This form makes that extremely clear
 * while still being nice to look at. Because looking good while screaming into the void
 * is a skill and we've got it.
 *
 * Object URLs for banner/PFP are created and revoked in separate useEffect calls.
 * useMemo + shared cleanup caused Strict Mode double-revoke. Separate effects = solved.
 * (React's double-invocation in dev mode is a feature. The URL-revoke bug it exposed is not.)
 *
 * @author Juan - The developer who made "Deploy" feel both exciting and terrifying.
 * The Rocket button has a gradient. The permanence warning is amber. Both are intentional.
 * (Coded with care, existential clarity, and the specific kind of humor that comes from
 * having shipped to mainnet once without reading the confirmation dialog.)
 */

// React hooks — useState for object URLs, useEffect for their lifecycle.
// Two separate effects for PFP and banner. Strict Mode requires this. See JSDoc above.
import { useState, useEffect } from 'react'

// Icons — the visual language of this entire step.
// Rocket (deploy CTA), AlertCircle (error/warning), CheckCircle2 (success/check),
// Loader2 (deploying spinner), ArrowLeft (back),
// ImageIcon not Image — Next.js reserves the name Image for its component.
// CalendarRange (phases), Coins (price/fee), Layers (collection),
// Shield (royalty), Package (supply), Clock (start date),
// Wallet (connect nudge), Zap (transaction built), Globe (live),
// Lock (wallet approval step in the explainer).
import {
  Rocket, AlertCircle, CheckCircle2, Loader2, ArrowLeft,
  ImageIcon, CalendarRange, Coins, Layers,
  Shield, Package, Clock, Wallet, Zap, Globe, Lock,
} from 'lucide-react'

// Button — shared component. size="lg" on the Deploy button because it earns the real estate.
// This is the most important button on the page. We give it the space it deserves.
import Button from '@/components/ui/Button'

// Type contracts from the creation hook.
// SubmitState drives the deploy button label cycle through each phase.
// MintPhase holds per-phase config (type, start, price, allowlist...).
// MetadataStandard is the four options from Step 1.
import type { SubmitState, MintPhase, MetadataStandard } from '@/hooks/useCreateCollectionForm'

// DEPLOY_LABELS — maps each SubmitState to button copy.
// The label changes as the deploy progresses through upload → sign → confirm.
// Users need to know what the chain is doing. Silence during a transaction is terrifying.
const DEPLOY_LABELS: Record<SubmitState, string> = {
  idle:       'Deploy on Solana',
  uploading:  'Uploading images…',
  deploying:  'Building transaction…',
  signing:    'Sign in wallet…',
  confirming: 'Confirming on-chain…',
  success:    'Deployed!',
  error:      'Try Again',
}

// ── Props interface ────────────────────────────────────────────────────────────
// Flat props pattern — the parent hook owns all state, this component is pure display.
// Everything flows down, nothing flows up except onDeploy and onBack.
interface DeployFormProps {
  // Step 1 data — collection identity
  collectionName:   string
  symbol:           string
  description:      string
  metadataStandard: MetadataStandard
  royaltyPercent:   number
  // These are prefixed with _ in the component body — they're in the interface for
  // potential future use but not directly rendered. We keep them to avoid breaking callers.
  royaltyWallet:    string
  walletAddress:    string | null
  // PFP + banner files — converted to object URLs for the preview card
  imageFile:        File | null
  bannerFile:       File | null
  // Step 2 data — uploaded media
  imageFiles:       File[]
  metadataFiles:    File[]
  // IPFS URIs — also prefixed with _ in the body, kept for future use
  imagesBaseUri:    string | null
  metadataBaseUri:  string | null
  // Step 3 data — supply, pricing, phases
  totalSupply:      number | ''
  mintPrice:        number | ''
  freeMint:         boolean
  phases:           MintPhase[]
  // Deploy state
  estimatedFee:  number | null
  isConnected:   boolean
  submitState:   SubmitState
  isDeploying:   boolean
  error:         string | null
  onDeploy:      () => void
  onBack:        () => void
}

// ── formatPhaseDate ───────────────────────────────────────────────────────────
// ISO date string → human-readable "Nov 15, 2024, 2:30 PM".
// Undefined/empty → "TBD". Because "undefined" in a UI is not a date format.
// We do not crash on bad input. The deploy step has enough anxiety without that.
function formatPhaseDate(dateStr?: string): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ── getEffectivePrice ─────────────────────────────────────────────────────────
// Derives the display price from phase overrides and the global mint price.
// Rules:
// - freeMint → 'free' (overrides everything)
// - no phases → use global mintPrice
// - all phases agree on price → use that price
// - phases disagree → 'varies'
// This logic prevents the "1.5 SOL but also maybe 0.5 SOL" ambiguity in the CTA.
function getEffectivePrice(
  phases: MintPhase[],
  mintPrice: number | '',
  freeMint: boolean,
): number | '' | 'varies' | 'free' {
  if (freeMint) return 'free'
  if (phases.length === 0) return mintPrice
  // Collect all per-phase prices, falling back to the global mintPrice
  const prices = phases.map(p =>
    p.priceOverride !== undefined && p.priceOverride !== '' ? p.priceOverride : String(mintPrice)
  )
  const allSame = prices.every(p => p === prices[0])
  if (allSame) return prices[0] === '' ? '' : Number(prices[0])
  return 'varies'
}

// ── CheckCard ─────────────────────────────────────────────────────────────────
// Data shape for the three pre-flight check cards in section D.
// ok: false → amber warning badge + amber border. Never blocks the Deploy button.
// These are advisory. The user still knows what they're doing.
// (We hope. We pray. We show the warning anyway.)
interface CheckCard {
  icon:  React.ReactNode
  title: string
  items: string[]
  ok:    boolean
}

/**
 * DeployForm — the final boss form. Section A through H.
 * Pure display component. All state lives in the parent.
 * The only user-interactive elements are Back and Deploy.
 * Everything else is information, confirmation, and mood-setting.
 */
export default function DeployForm({
  collectionName, symbol, description, metadataStandard,
  royaltyPercent, royaltyWallet: _royaltyWallet, walletAddress: _walletAddress,
  imageFile, bannerFile,
  imageFiles, metadataFiles, imagesBaseUri: _imagesBaseUri, metadataBaseUri: _metadataBaseUri,
  totalSupply, mintPrice, freeMint, phases,
  estimatedFee,
  isConnected, submitState, isDeploying, error,
  onDeploy, onBack,
}: DeployFormProps) {
  // isSuccess — deploy completed successfully. Redirect is handled by the parent.
  // We show a success banner here while the redirect processes.
  const isSuccess = submitState === 'success'

  // effectivePrice — derived from phases + global price. Used in both the numbers strip
  // and the fee information row in section H.
  const effectivePrice = getEffectivePrice(phases, mintPrice, freeMint)

  // pfpUrl + bannerUrl — object URLs for preview images.
  // Two separate effects because Strict Mode's double-invoke would revoke a shared URL
  // before the other memo reference could use it. Separate effects = separate revoke cycles.
  const [pfpUrl,    setPfpUrl]    = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  // PFP URL effect — create on imageFile, revoke on cleanup. No leaks. No crashes.
  useEffect(() => {
    const url = imageFile ? URL.createObjectURL(imageFile) : null
    setPfpUrl(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [imageFile])

  // Banner URL effect — same pattern. Two effects, two clean lifecycles.
  // Strict Mode double-fires effects in dev. These survive it.
  useEffect(() => {
    const url = bannerFile ? URL.createObjectURL(bannerFile) : null
    setBannerUrl(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [bannerFile])

  // Pre-flight check cards — three cards built from the collected form data.
  // Collection: name + royalty + standard. Media: image/metadata file counts. Phases: count + start.
  // ok = false shows amber warning, never disables deploy. Advisory, not blocking.
  const checkCards: CheckCard[] = [
    {
      icon:  <Layers className="w-5 h-5" />,
      title: 'Collection',
      items: [
        collectionName || '—',
        `${royaltyPercent}% royalty`,
        metadataStandard,
      ],
      // ok = both name and standard are set. Name empty = user skipped Step 1 somehow.
      // This should not happen. We check it anyway. Belt and suspenders.
      ok: !!(collectionName && metadataStandard),
    },
    {
      icon:  <ImageIcon className="w-5 h-5" />,
      title: 'Media',
      items: [
        `${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''}`,
        `${metadataFiles.length} metadata file${metadataFiles.length !== 1 ? 's' : ''}`,
      ],
      // ok = at least one file. Zero files on Step 4 is technically possible if Step 2 was skipped.
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
      // ok = at least one phase. No phases is valid but we warn — minting without phases
      // is possible but unusual. We surface it so the user makes an intentional choice.
      ok: phases.length > 0,
    },
  ]

  return (
    <div className="space-y-7">

      {/* ── A: Error / Success Banners ────────────────────────────────────── */}
      {/* Error banner — red, dismissable-looking (but not actually dismissable).
          Shows the deploy error message from the hook. Not our fault (probably). */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* Success banner — green, shows "Redirecting…" while the parent handles navigation.
          Brief. Joyful. Then gone. Like all good success states. */}
      {isSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-accent-success/10 border border-dark-accent-success/30 text-dark-accent-success text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Collection deployed successfully! Redirecting…
        </div>
      )}

      {/* ── B: Hero Header ────────────────────────────────────────────────── */}
      {/* "You're almost live." Sets the mood. The "Step 4 of 4" badge makes it concrete.
          The subtitle reminds you that once this goes on-chain, it lives there forever.
          Light pressure. Not panic-inducing. Just honest. */}
      <div className="text-center space-y-2">
        {/* Step badge — top of the hero. Small. Confirms position in the wizard. */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dark-accent-primary/15 text-dark-accent-primary border border-dark-accent-primary/25">
          Step 4 of 4
        </span>
        {/* Hero title — "You're almost live." The apostrophe is rendered as &apos; in JSX. */}
        <h2 className="text-2xl font-bold text-dark-text-primary">You&apos;re almost live.</h2>
        {/* Subtitle — permanence reminder wrapped in reasonable prose. Not terrifying. Just true. */}
        <p className="text-sm text-dark-text-tertiary max-w-sm mx-auto">
          Review your collection below. Once deployed, the blockchain keeps it forever — so make sure everything looks right.
        </p>
      </div>

      {/* ── C: Collection Preview Card ────────────────────────────────────── */}
      {/* Banner strip (16:6 aspect ratio) + PFP floating above it (-top-8).
          The PFP overlaps the banner by 8 units. It's a classic social media pattern.
          pt-10 on the content below clears the PFP overlap so text doesn't collide.
          Gradient fallback on banner when no file was uploaded — looks intentional. */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary">
        {/* Banner strip — 16:6, rounded top corners */}
        <div className="w-full overflow-hidden rounded-t-xl" style={{ aspectRatio: '16/6' }}>
          {bannerUrl
            ? <img src={bannerUrl} alt="Collection banner" className="w-full h-full object-cover" />
            // Gradient fallback — purple-to-transparent. Looks designed. Nobody will know.
            : <div className="w-full h-full bg-linear-to-r from-dark-accent-primary/30 via-dark-accent-secondary/20 to-dark-accent-primary/10" />
          }
        </div>
        {/* Zero-height row — the PFP floats up into the banner via negative top offset.
            This is a trick. It works. We're comfortable with it. */}
        <div className="relative h-0">
          <div className="absolute -top-8 left-5">
            <div className="w-16 h-16 rounded-full border-4 border-dark-bg-secondary bg-dark-bg-tertiary overflow-hidden flex items-center justify-center">
              {pfpUrl
                ? <img src={pfpUrl} alt="Collection PFP" className="w-full h-full object-cover" />
                // Fallback — Layers icon in a circle. Neutral. Professional.
                : <Layers className="w-7 h-7 text-dark-text-tertiary" />
              }
            </div>
          </div>
        </div>
        {/* Content area — pt-10 clears the PFP overlap. Not px-5 pb-5 more. */}
        <div className="pt-10 px-5 pb-5 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Collection name — bold, large. "Unnamed Collection" fallback.
                We don't want users deploying unnamed collections. Step 1 should have caught it. */}
            <span className="text-lg font-bold text-dark-text-primary">
              {collectionName || 'Unnamed Collection'}
            </span>
            {/* Symbol — monospace, dollar-prefixed like a ticker. Small. Clean. */}
            {symbol && (
              <span className="text-sm text-dark-text-tertiary font-mono">${symbol}</span>
            )}
            {/* Metadata standard badge — accent pill */}
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-dark-accent-primary/10 text-dark-accent-primary">
              {metadataStandard}
            </span>
          </div>
          {/* Description — 2-line clamp. If it's longer, "..." at the end. */}
          {description && (
            <p className="text-sm text-dark-text-secondary leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      {/* ── D: Pre-flight Checklist ───────────────────────────────────────── */}
      {/* Three cards: Collection, Media, Mint Phases.
          Green check + normal border = ok. Amber alert + amber border = warning.
          Neither state blocks the Deploy button. These are advisory. Consult your conscience. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {checkCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border p-4 space-y-2 ${
              // ok = default styling. Not ok = amber tint. Gentle nudge.
              card.ok
                ? 'border-dark-border-primary bg-dark-bg-secondary'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Card icon + title — colored amber if warning, primary text if ok */}
              <div className={`flex items-center gap-2 ${card.ok ? 'text-dark-text-primary' : 'text-amber-400'}`}>
                {card.icon}
                <span className="text-sm font-semibold">{card.title}</span>
              </div>
              {/* Status icon — green check if ok, amber alert if warning. */}
              {card.ok
                ? <CheckCircle2 className="w-4 h-4 text-dark-accent-success shrink-0" />
                : <AlertCircle  className="w-4 h-4 text-amber-400 shrink-0" />
              }
            </div>
            {/* Card items — small detail list */}
            <ul className="space-y-0.5">
              {card.items.map((item) => (
                <li key={item} className="text-xs text-dark-text-tertiary">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── E: Key Numbers Strip ─────────────────────────────────────────── */}
      {/* Four tiles: Supply, Price, Royalty, Phases. The TLDR of the whole collection config.
          2 columns on mobile, 4 on desktop. Each tile has an icon + label + big number. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          // Supply — toLocaleString for thousands separators. ∞ when supply is empty.
          { icon: <Package className="w-4 h-4" />, label: 'Supply',  value: totalSupply !== '' ? totalSupply.toLocaleString() : '∞' },
          // Price — "Free", "Varies by phase", "X SOL", or "—" when unset.
          { icon: <Coins   className="w-4 h-4" />, label: 'Price',   value: effectivePrice === 'free' ? 'Free' : effectivePrice === 'varies' ? 'Varies by phase' : effectivePrice !== '' ? `${effectivePrice} SOL` : '—' },
          // Royalty — always shows the % symbol because context matters.
          { icon: <Shield  className="w-4 h-4" />, label: 'Royalty', value: `${royaltyPercent}%` },
          // Phases — raw count. Zero is valid but will show as "0" which is honest.
          { icon: <Clock   className="w-4 h-4" />, label: 'Phases',  value: String(phases.length) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-4 text-center space-y-1">
            {/* Icon + label row — muted, small, informative */}
            <div className="flex items-center justify-center gap-1.5 text-dark-text-tertiary text-xs">
              {icon}
              {label}
            </div>
            {/* Value — big, bold, the number that matters */}
            <div className="text-xl font-bold text-dark-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* ── F: Mint Phase Timeline ────────────────────────────────────────── */}
      {/* Phase cards in a vertical list, or a dashed empty-state if no phases.
          Each phase card shows: number bubble, name, type badge, start time, price, max/wallet.
          No phases = valid but noted. The collection will deploy without phase restrictions. */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dark-text-primary flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-dark-accent-primary" />
          Mint Phase Timeline
        </h3>
        {phases.length === 0 ? (
          // Empty state — dashed border, CalendarRange icon, explanatory text.
          // "No phases defined" is informative, not alarming. No phases is a valid choice.
          <div className="rounded-xl border border-dashed border-dark-border-primary bg-dark-bg-secondary p-6 flex flex-col items-center gap-2 text-center">
            <CalendarRange className="w-6 h-6 text-dark-text-tertiary" />
            <p className="text-sm text-dark-text-tertiary">
              No phases defined. The collection will deploy without mint phases.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {phases.map((phase, i) => (
              // Phase row — number bubble, name, type badge, metadata details on the right.
              // flex-wrap so details don't break on small screens.
              <div
                key={i}
                className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary px-4 py-3 flex flex-wrap items-center gap-3"
              >
                {/* Phase number bubble — accent tint background */}
                <div className="w-7 h-7 rounded-full bg-dark-accent-primary/15 text-dark-accent-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                {/* Phase name — "Phase N" fallback if no name was provided. */}
                <span className="text-sm font-medium text-dark-text-primary">
                  {phase.name || `Phase ${i + 1}`}
                </span>
                {/* Type badge — purple for public, amber for allowlist.
                    Same palette as MintPhasesForm's left-border colors for visual consistency. */}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  phase.phaseType === 'public'
                    ? 'bg-dark-accent-primary/10 text-dark-accent-primary'
                    : 'bg-amber-400/10 text-amber-400'
                }`}>
                  {phase.phaseType}
                </span>
                {/* Details — start time, price override, max per wallet.
                    All conditional — only renders if the data exists.
                    ml-auto pushes these to the right. Mobile wraps them below. */}
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

      {/* ── G: What Happens When You Deploy ──────────────────────────────── */}
      {/* A four-step explainer grid. No surprises during the actual deploy.
          1. Images pinned to IPFS. 2. Transaction built. 3. You sign. 4. Collection live.
          Each tile has an icon, a step number, a label, and a one-line description.
          This is how you make a scary, irreversible action feel manageable. */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-5 space-y-3">
        <h3 className="text-sm font-semibold text-dark-text-primary">What happens when you deploy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            // Step 1 — IPFS upload. The images go first.
            { icon: <ImageIcon className="w-5 h-5 text-dark-accent-primary" />,        step: '1', label: 'Images pinned',     desc: 'Files uploaded to IPFS'   },
            // Step 2 — Transaction construction. The program builds the instruction set.
            { icon: <Zap       className="w-5 h-5 text-dark-accent-secondary" />,      step: '2', label: 'Transaction built', desc: 'Solana tx constructed'     },
            // Step 3 — Wallet approval. The user signs. The one human step in the chain.
            { icon: <Lock      className="w-5 h-5 text-amber-400" />,                  step: '3', label: 'You sign',          desc: 'Wallet approval'           },
            // Step 4 — Confirmed on-chain. It's real. It's permanent. Congratulations.
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

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      {/* The visual break before the deploy CTA. After this line, it gets real. */}
      <div className="border-t border-dark-border-primary" />

      {/* ── H: Deploy CTA ────────────────────────────────────────────────── */}
      {/* Fee estimate + permanence warning on one row.
          Then Back + Deploy on the second row.
          Then the wallet connect nudge if not connected.
          Three pieces of information. One decision. Make it count. */}
      <div className="space-y-4">
        {/* Info row — network fee + 1% NeXus fee note + permanence warning. */}
        <div className="flex flex-wrap gap-4 text-xs text-dark-text-tertiary">
          {/* Network fee — fetching or shows the estimated SOL amount. */}
          <span className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            {estimatedFee !== null
              ? `Network fee: ~${estimatedFee.toFixed(4)} SOL`
              : 'Fetching network fee…'}
          </span>
          {/* NeXus fee note — only shows for non-free, non-varies, non-empty prices.
              1% goes to NeXus. We're transparent about it. We think that's fair. */}
          {effectivePrice !== 'free' && effectivePrice !== 'varies' && effectivePrice !== '' && (
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-purple-400" />
              Buyers pay {(Number(effectivePrice) * 1.01).toFixed(4)} SOL — you receive {effectivePrice} SOL (1% goes to NeXus)
            </span>
          )}
          {/* Varies note — shown when phases have different prices. */}
          {effectivePrice === 'varies' && (
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-purple-400" />
              Price varies by phase — see timeline below
            </span>
          )}
          {/* Permanence warning — amber, AlertCircle, always visible.
              "This action is permanent" — six words that carry a lot of weight. */}
          <span className="flex items-center gap-1.5 text-amber-400/80">
            <AlertCircle className="w-3.5 h-3.5" />
            This action is permanent
          </span>
        </div>

        {/* Back + Deploy buttons — opposing corners.
            Back: outline, left. Disabled during deploy or after success.
            Deploy: primary, large, right. The main event. Rocket icon or spinner. */}
        <div className="flex items-center justify-between">
          {/* Back button — disabled during deploy so you can't go back mid-transaction. */}
          <Button type="button" variant="outline" onClick={onBack} disabled={isDeploying || isSuccess}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          {/* Deploy button — THE button. size="lg" because it matters.
              Disabled when: not connected, deploying, or already succeeded.
              isLoading prop triggers the loading visual from the Button component. */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={onDeploy}
            disabled={!isConnected || isDeploying || isSuccess}
            isLoading={isDeploying}
          >
            {/* Label changes based on deploy state. Spinner during deploy, Rocket otherwise.
                DEPLOY_LABELS maps each SubmitState to copy. The user always knows what's happening. */}
            {isDeploying
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{DEPLOY_LABELS[submitState]}</>
              : <><Rocket  className="w-4 h-4 mr-2" />{DEPLOY_LABELS[submitState]}</>
            }
          </Button>
        </div>

        {/* Wallet not connected nudge — small text, bottom-right, Wallet icon.
            Not a banner. Not a modal. Just a quiet note: "Connect your wallet to deploy." */}
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

// Coded by Juan — one button, one transaction, one collection on Solana forever.
// The banner gradient is a fallback. The fee estimate is approximate.
// The permanence is not.
// P.S. - No pressure. (There's a little pressure. It's on-chain. It always will be.)
