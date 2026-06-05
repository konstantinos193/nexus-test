'use client'

/**
 * MintInteractionModule – The sticky right-column mint card. The money maker. The CTA.
 * Phase tabs, live countdown, minted progress bar, quantity stepper, price breakdown,
 * fund receivers, wallet connection, and a big green button that does the thing.
 *
 * Countdown state machine:
 *   upcoming + future mintStart  → "Starts in X" countdown
 *   minting  + future endDate    → "Ends in X" countdown
 *   minting  + no endDate        → pulsing "● LIVE" badge (the good kind of no deadline)
 *   anything else                → countdown section hidden entirely (it expired or doesn't exist)
 *
 * If you're here because the countdown is broken:
 * Check that mintStart / endDate are ISO 8601 strings. They probably aren't. They never are.
 * Someone passed a Unix timestamp, or a local datetime without a timezone, or a vibes string.
 * Fix the data. The countdown is correct.
 *
 * Platform fee is 1% additive — the buyer pays price × 1.01, creator gets price, we get 0.01.
 * This is shown transparently in the UI because hidden fees breed Discord drama.
 *
 * @author Juan – The developer who built a countdown and had to count down to shipping it
 * (Coded with care, setInterval guilt, and a deep hatred for timezone offsets)
 */

// useState — for wallet modal, pending connect, active phase tab, and quantity
// useCallback — for memoized qty controls (dec, inc) so they don't cause extra renders
// useEffect — for the wallet connection side-effect and the countdown ticker
// useRef — for storing the countdown target without causing re-renders on every tick
import { useState, useCallback, useEffect, useRef } from 'react'
// useWallet — the Solana wallet adapter hook. Gives us connected, select, connect.
// If the wallet adapter provider is missing, this explodes. WalletReadyContext guards against that.
import { useWallet } from '@solana/wallet-adapter-react'
// WalletName type — the type-safe identifier for wallet providers (Phantom, Solflare, etc.)
import type { WalletName } from '@solana/wallet-adapter-base'
// CollectionDetail and MintPhase types — the shape of the data this component consumes
import type { CollectionDetail, MintPhase } from '@/types'
// SolIcon — the gradient Solana mark. Lives next to every price display in this component.
import SolIcon from './SolIcon'
// WalletModal — the wallet selection overlay. Opens when user clicks "Connect Wallet".
import { WalletModal } from '@/components/wallet/WalletConnect'

/** Props for MintInteractionModule — the external configuration surface. */
export interface MintInteractionModuleProps {
  collection: CollectionDetail    // The full collection data — phases, prices, status, supply
  maxPerTx?: number               // Max NFTs per mint transaction. Default: 10. (Platform-defined.)
  isWalletConnected?: boolean     // Deprecated prop — actual state comes from useWallet()
  onMint?: (qty: number) => void  // Called with the quantity when user clicks Mint Now
}

// ── Countdown Hook ────────────────────────────────────────────────────────────

/**
 * Shape of the countdown time-left value.
 * days/hours/minutes/seconds: the components of the remaining time.
 * expired: true when the target is in the past, or when there's no target at all.
 */
interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

/**
 * Calculates the time remaining until a target ISO datetime string.
 * Returns { expired: true } when target is null/undefined or already passed.
 * Pure function — no side effects, no global state, no opinions about timezones.
 * (The timezone offset is baked into the ISO string. That's the spec. Use ISO 8601.)
 */
function calcTimeLeft(target: string | null | undefined): TimeLeft {
  // No target means no countdown — return the expired state immediately
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  const diff = new Date(target).getTime() - Date.now()
  // Negative diff means the target is in the past — expired
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  const s = Math.floor(diff / 1000)
  return {
    days:    Math.floor(s / 86400),          // Days (24 * 3600 = 86400 seconds per day)
    hours:   Math.floor((s % 86400) / 3600), // Hours within the current day
    minutes: Math.floor((s % 3600) / 60),    // Minutes within the current hour
    seconds: s % 60,                          // Seconds within the current minute
    expired: false,
  }
}

/**
 * useCountdown — React hook that ticks every second and returns the remaining time.
 * Sets up a setInterval when a target exists, cleans it up on unmount or target change.
 * Uses a ref to avoid the interval capturing a stale target string.
 * (The ref pattern avoids re-creating the interval every time the target changes. Correct.)
 */
function useCountdown(target: string | null | undefined): TimeLeft {
  // Initial state computed synchronously from target — no flash of "00:00:00"
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(target))

  // Ref to track the current target without triggering effect cleanup
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    // Sync immediately when target changes — don't wait a full second for first tick
    setTimeLeft(calcTimeLeft(targetRef.current))
    if (!target) return  // No target, no interval — bail early and save CPU

    // Set up the tick — fires every second, reads from ref to avoid stale closure
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetRef.current)), 1000)
    // Clean up on target change or unmount — intervals are global state, treat them with respect
    return () => clearInterval(id)
  }, [target])  // Only re-run when target changes

  return timeLeft
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Zero-pads a number to 2 digits. "09" not "9". "59" not just "59". Aesthetic consistency. */
function pad(n: number) { return String(n).padStart(2, '0') }

/**
 * Shortens a Solana address for display in the fund receivers list.
 * "Abc12…xyz89" — the user can hover the full address or check Solscan.
 */
function shorten(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`
}

/**
 * Returns true if a mint phase is currently active (started and not yet ended).
 * endDateTime being absent means the phase runs forever — Infinity as an end time.
 * (Some creators don't set end dates. We support that. Chaos is valid.)
 */
function phaseIsActive(phase: MintPhase): boolean {
  const now = Date.now()
  const start = new Date(phase.startDateTime).getTime()
  const end = phase.endDateTime ? new Date(phase.endDateTime).getTime() : Infinity
  return now >= start && now < end
}

/**
 * Returns true if a phase hasn't started yet.
 * Used to decide whether to show "Opens [date]" vs "Phase started [date]".
 */
function phaseIsUpcoming(phase: MintPhase): boolean {
  return Date.now() < new Date(phase.startDateTime).getTime()
}

/**
 * Formats an ISO date string into a human-readable locale date.
 * "Jun 5, 02:30 PM" style — short and informative.
 * Falls back to the raw ISO string if parsing fails. (It shouldn't. But it might.)
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }  // The raw string is better than nothing
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * MintInteractionModule – The entire mint experience, condensed into a sticky card.
 * Contains: phase selector, countdown, progress, quantity, pricing, and the mint button.
 * Does NOT contain: the collection name anywhere meaningful (that's CollectionHero's job).
 */
export default function MintInteractionModule({
  collection,
  maxPerTx = 10,  // Default max per transaction — the platform's safety limit
  onMint,
}: MintInteractionModuleProps) {
  // Wallet state from the Solana adapter — connected is the source of truth
  const { connected: isWalletConnected, select, connect } = useWallet()

  // Wallet modal state — controls the wallet selection overlay visibility
  const [walletModalOpen, setWalletModalOpen] = useState(false)

  // pendingConnect: true after the user selects a wallet but before the connection resolves.
  // We kick off connect() in a useEffect so it runs after select() has updated internal state.
  const [pendingConnect, setPendingConnect] = useState(false)

  // ── Wallet Connection Side-Effect ─────────────────────────────────────────
  // When a wallet is selected (pendingConnect = true) and not yet connected,
  // call connect(). Silently swallow errors — the wallet adapter handles those UX flows.
  useEffect(() => {
    if (pendingConnect && !isWalletConnected) {
      connect().catch(() => {})  // Errors here are usually "user cancelled" — fine to swallow
      setPendingConnect(false)
    }
  }, [pendingConnect, isWalletConnected, connect])

  /**
   * Called when the user selects a wallet in the WalletModal.
   * select() updates the adapter's internal wallet choice.
   * We then set pendingConnect so the useEffect above kicks off connect().
   */
  function handleWalletSelect(name: WalletName) {
    select(name)
    setWalletModalOpen(false)
    setPendingConnect(true)
  }

  // ── Phase Management ──────────────────────────────────────────────────────
  const phases = collection.phases ?? []  // Safe default — never assume phases exist

  // Default to the first currently-active phase tab, or tab 0 if none are active
  const defaultTab =
    phases.findIndex(phaseIsActive) >= 0
      ? phases.findIndex(phaseIsActive)  // Land on the live phase — most relevant to minters
      : 0                                // Fall back to first tab if no active phase

  // Active tab index — user can switch between phases even if only one is active
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Quantity — how many NFTs the user wants to mint in this transaction
  const [qty, setQty] = useState(1)  // Default to 1 — safe, sensible, not greedy

  // The phase data for the currently selected tab — null if phases array is empty
  const activePhase = phases[activeTab] ?? null

  // ── Pricing Calculations ──────────────────────────────────────────────────
  // Phase override takes precedence over collection-level price — per-phase pricing is supported
  const price =
    activePhase?.priceOverride != null
      ? parseFloat(activePhase.priceOverride) || 0  // Parse string price, fallback to 0 on parse failure
      : collection.price ?? 0                        // Collection-level price, or 0 for free mint

  const isFree        = price === 0
  const creatorTotal  = price * qty              // What the creator receives
  const platformFee   = creatorTotal * 0.01     // 1% platform fee — additive on top of creator price
  const total         = creatorTotal + platformFee  // What the buyer actually pays

  // ── Status Flags ─────────────────────────────────────────────────────────
  // These three states are mutually exclusive — only one can be true at a time
  const soldOut   = collection.status === 'completed'
  const isMinting = collection.status === 'minting'
  const isUpcoming = ['ready', 'preparing'].includes(collection.status)

  // ── Countdown Target Selection ────────────────────────────────────────────
  // We count toward different dates depending on the collection's status.
  // Live mint with end date → count to end. Upcoming → count to start. Otherwise → no countdown.
  const mintStart = activePhase?.startDateTime ?? collection.mintStart
  const countdownTarget =
    isMinting && collection.endDate
      ? collection.endDate   // Live mint with an end date — count down to the cutoff
      : isUpcoming && mintStart && new Date(mintStart).getTime() > Date.now()
        ? mintStart           // Upcoming with a future start — build the anticipation
        : null                // No meaningful future target — show LIVE badge or nothing

  // The live countdown ticker — ticks every second when countdownTarget is set
  const timeLeft = useCountdown(countdownTarget)

  // Should we show the countdown? Only if there's a target AND it hasn't expired yet
  const showCountdown  = !!countdownTarget && !timeLeft.expired

  // Should we show the pulsing LIVE badge? Only when actively minting with no end date.
  // (A live mint with no deadline is the most chaotic minting scenario. Celebrate it accordingly.)
  const showLiveBadge  = isMinting && !collection.endDate && !soldOut

  // Mint progress percentage — capped at 100 to avoid any "102% minted" horror scenarios
  const pct = collection.totalSupply > 0
    ? Math.min(100, (collection.minted / collection.totalSupply) * 100)
    : 0

  // ── Quantity Controls ─────────────────────────────────────────────────────
  // Max quantity is the lesser of: platform max per tx, or phase max per wallet (if set)
  const maxQty = Math.min(
    maxPerTx,
    activePhase?.maxPerWallet ? (parseInt(activePhase.maxPerWallet) || maxPerTx) : maxPerTx,
  )

  // Decrement quantity — never below 1 (you can't mint 0 NFTs. Or negative ones.)
  const dec = useCallback(() => setQty((n) => Math.max(1, n - 1)), [])
  // Increment quantity — never above maxQty (the platform and phase limits exist for a reason)
  const inc = useCallback(() => setQty((n) => Math.min(maxQty, n + 1)), [maxQty])

  // Can the user actually mint right now?
  // All three conditions must be true: minting is live, wallet is connected, not sold out
  const canMint = isMinting && isWalletConnected && !soldOut

  // The button label — communicates exactly one of four possible states
  const mintBtnLabel = !isWalletConnected
    ? 'Connect Wallet'  // No wallet — the user needs to connect first
    : soldOut
      ? 'Sold Out'       // All gone — the dream is over
      : !isMinting
        ? 'Not Live Yet' // Upcoming — patience is a virtue
        : 'Mint Now'     // Live and connected — the moment of truth

  return (
    // cp-mint-card: the sticky right-column card container
    <div className="cp-mint-card">

      {/* ── Card Header ─────────────────────────────────────────────────────
          "Minting" label + collection name — context for users who jump straight to this card */}
      <div className="cp-mint-card-header">
        <div className="cp-mint-card-label">Minting</div>
        <div className="cp-mint-card-name">{collection.name}</div>
      </div>

      {/* ── Phase Tabs ──────────────────────────────────────────────────────
          Only shown when there are multiple phases — single-phase collections skip this.
          Each tab button switches the active phase, resets qty to 1, and recalculates price. */}
      {phases.length > 1 && (
        <div className="cp-phase-tabs">
          {phases.map((phase, i) => (
            <button
              key={i}
              type="button"
              className={`cp-phase-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => { setActiveTab(i); setQty(1) }}  // Reset qty when switching phases
            >
              {/* Phase name falls back to type-based label — "Allowlist" or "Public" */}
              {phase.name || (phase.phaseType === 'allowlist' ? 'Allowlist' : 'Public')}
              {/* Green dot on the currently-active phase tab — visual signal for "this is happening now" */}
              {phaseIsActive(phase) && (
                <span style={{ color: 'var(--cp-green)', marginLeft: '0.3rem', fontSize: '0.55rem' }}>●</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Countdown ───────────────────────────────────────────────────────
          Shown when there's a future target date that hasn't expired.
          "Starts in" for upcoming, "Ends in" for live minting with a deadline. */}
      {showCountdown && (
        <div className="cp-countdown-wrap">
          <div className="cp-countdown-label">
            {/* Context label — tells the user what they're counting down TO */}
            {isMinting ? 'Ends in' : 'Starts in'}
          </div>
          <div className="cp-countdown-digits">
            {/* Days segment — only shown when there's at least 1 day remaining.
                No "00 days" when the countdown is under 24 hours — that's just clutter. */}
            {timeLeft.days > 0 && (
              <>
                <div className="cp-countdown-segment">
                  <span className="cp-countdown-num">{pad(timeLeft.days)}</span>
                  <div className="cp-countdown-unit">days</div>
                </div>
                <span className="cp-countdown-sep">:</span>
              </>
            )}
            {/* Hours segment — always shown */}
            <div className="cp-countdown-segment">
              <span className="cp-countdown-num">{pad(timeLeft.hours)}</span>
              <div className="cp-countdown-unit">hrs</div>
            </div>
            <span className="cp-countdown-sep">:</span>
            {/* Minutes segment — always shown */}
            <div className="cp-countdown-segment">
              <span className="cp-countdown-num">{pad(timeLeft.minutes)}</span>
              <div className="cp-countdown-unit">min</div>
            </div>
            <span className="cp-countdown-sep">:</span>
            {/* Seconds segment — the one that actually shows the ticking */}
            <div className="cp-countdown-segment">
              <span className="cp-countdown-num">{pad(timeLeft.seconds)}</span>
              <div className="cp-countdown-unit">sec</div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE Badge ──────────────────────────────────────────────────────
          Shown when minting is active but there's no end date to count toward.
          A live mint with no deadline is pure chaos. We celebrate it with a pulsing green dot. */}
      {showLiveBadge && (
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--cp-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* The pulsing dot — cp-pulse animation defined in the collection page CSS */}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cp-green)', display: 'inline-block', animation: 'cp-pulse 1.5s ease-in-out infinite' }} />
          {/* "MINT LIVE" in green caps — the battle cry */}
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cp-green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mint Live
          </span>
          {/* Show when the mint started, if we know — "since Jun 5, 2:00 PM" */}
          {mintStart && (
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>
              since {formatDate(mintStart)}
            </span>
          )}
        </div>
      )}

      {/* ── Upcoming with Stale Date ─────────────────────────────────────────
          When the status is "upcoming" but the scheduled start time has already passed.
          We don't lie and say "not started yet" — we say "previously scheduled" and move on.
          Honesty is the best policy. Even for NFT launchpads. */}
      {isUpcoming && mintStart && new Date(mintStart).getTime() <= Date.now() && (
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--cp-border)', fontSize: '0.8125rem', color: 'var(--cp-text-muted)' }}>
          Mint opens soon — previously scheduled {formatDate(mintStart)}
        </div>
      )}

      {/* ── Upcoming with Future Date (No Countdown Showing) ─────────────────
          When the start date is in the future but the countdown isn't rendering for some reason.
          Belt and suspenders — we always want to show the user when something starts. */}
      {isUpcoming && mintStart && new Date(mintStart).getTime() > Date.now() && !showCountdown && (
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--cp-border)', fontSize: '0.8125rem', color: 'var(--cp-text-muted)' }}>
          Starts {formatDate(mintStart)}
        </div>
      )}

      {/* ── Minted Progress Bar ──────────────────────────────────────────────
          Shows how much of the supply has been minted. The FOMO bar.
          Minimum fill of 0.5% so even a fresh collection doesn't look like a flat line. */}
      <div className="cp-progress-wrap">
        <div className="cp-progress-meta">
          <span>Minted</span>
          <span>
            {collection.minted.toLocaleString()} / {collection.totalSupply.toLocaleString()}
            {/* Percentage in muted text — adds context without competing for attention */}
            <span style={{ color: 'var(--cp-text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>
              ({pct.toFixed(1)}%)
            </span>
          </span>
        </div>
        <div className="cp-progress-bar">
          {/* Progress fill — minimum 0.5% width so new collections still show a sliver of progress */}
          <div className="cp-progress-fill" style={{ width: `${Math.max(pct, 0.5)}%` }} />
        </div>
      </div>

      {/* ── Price Row ────────────────────────────────────────────────────────
          The per-NFT price. Free mints get a green "Free" label.
          Paid mints show the SOL amount + Solana logo.
          Max per wallet shown here if the active phase has a limit. */}
      <div className="cp-mint-price-row">
        <span className="cp-mint-price-label">Price</span>
        {isFree ? (
          // "Free" — the best word in the NFT minter's vocabulary
          <span className="cp-mint-price-free">Free</span>
        ) : (
          <>
            <span className="cp-mint-price-value">
              {price.toFixed(2)}{' '}<SolIcon size={16} />
            </span>
            <span className="cp-mint-price-unit">SOL</span>
          </>
        )}
        {/* Max per wallet — shown when the active phase has a wallet limit */}
        {activePhase?.maxPerWallet && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>
            max {activePhase.maxPerWallet} / wallet
          </span>
        )}
      </div>

      {/* ── Quantity Stepper ─────────────────────────────────────────────────
          Hidden when sold out — there's nothing to choose a quantity for.
          Decrement button disabled at 1. Increment disabled at maxQty. Both clamped by callbacks. */}
      {!soldOut && (
        <div className="cp-mint-qty-row">
          <span className="cp-mint-qty-label">Quantity</span>
          <div className="cp-qty-controls">
            {/* Decrement — goes down to 1, never below */}
            <button type="button" className="cp-qty-btn" onClick={dec} disabled={qty <= 1} aria-label="Decrease">−</button>
            {/* Current quantity display — the number the user is actually choosing */}
            <span className="cp-qty-value">{qty}</span>
            {/* Increment — goes up to maxQty, never above */}
            <button type="button" className="cp-qty-btn" onClick={inc} disabled={qty >= maxQty} aria-label="Increase">+</button>
          </div>
        </div>
      )}

      {/* ── Total + Mint Button ──────────────────────────────────────────────
          The price breakdown (creator + fee + total) and the big mint button.
          The breakdown is only shown for paid mints on non-sold-out collections.
          Free mints skip straight to the button — no math needed. */}
      <div className="cp-mint-cta-area">
        {/* Price breakdown — only for paid mints that aren't sold out */}
        {!isFree && !soldOut && (
          <div className="cp-mint-total">
            {/* Creator price line — qty × per-NFT price, or just the per-NFT price if qty is 1 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--cp-text-muted)', marginBottom: '0.15rem' }}>
              <span>Creator price</span>
              <span>{creatorTotal.toFixed(4)} SOL{qty > 1 ? ` (${price.toFixed(2)} × ${qty})` : ''}</span>
            </div>
            {/* Platform fee — 1%, additive. Shown transparently because hidden fees breed distrust. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--cp-text-muted)', marginBottom: '0.35rem' }}>
              <span>Platform fee (1%)</span>
              <span>{platformFee.toFixed(4)} SOL</span>
            </div>
            {/* Total — the final number that leaves the user's wallet. Make it prominent. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cp-border)', paddingTop: '0.35rem' }}>
              <span>Total</span>
              <span className="cp-mint-total-value">
                {total.toFixed(4)}{' '}<SolIcon size={13} />
              </span>
            </div>
          </div>
        )}

        {/* The Mint Button — the entire reason this component exists.
            Disabled when wallet is connected but minting isn't possible (not live, sold out).
            When wallet is NOT connected, clicking opens the wallet modal instead.
            One button. Two behaviors. The label tells the user which mode they're in. */}
        <button
          type="button"
          className={`cp-mint-btn${soldOut ? ' sold-out' : ''}`}
          // Disabled when connected + can't mint. NOT disabled when disconnected — clicking connects.
          disabled={isWalletConnected ? !canMint : false}
          onClick={() => isWalletConnected ? onMint?.(qty) : setWalletModalOpen(true)}
        >
          {mintBtnLabel}
        </button>
      </div>

      {/* ── Wallet Modal ─────────────────────────────────────────────────────
          The wallet selection overlay — only mounted when walletModalOpen is true.
          Offers the user their available wallet options (Phantom, Solflare, etc.).
          On selection: calls handleWalletSelect, which selects + queues connect(). */}
      {walletModalOpen && (
        <WalletModal
          onSelect={handleWalletSelect}
          onClose={() => setWalletModalOpen(false)}
        />
      )}

      {/* ── Royalty Line ─────────────────────────────────────────────────────
          The creator's secondary royalty percentage. Informational.
          Only shown when royaltyBasisPoints is set — not all collections have royalties. */}
      {collection.royaltyBasisPoints != null && (
        <div className="cp-royalty-line">
          <span>Royalties</span>
          {/* Convert basis points to percentage: 500 basis points = 5.0% */}
          <span>{(collection.royaltyBasisPoints / 100).toFixed(1)}%</span>
        </div>
      )}

      {/* ── Revenue Split / Fund Receivers ────────────────────────────────────
          Shows how the mint revenue is split between wallets.
          Useful for collections with multiple creators or revenue-sharing arrangements.
          Only shown when fund receivers are configured on the collection. */}
      {collection.fundReceivers && collection.fundReceivers.length > 0 && (
        <div className="cp-fund-receivers">
          <div className="cp-fund-receivers-label">Revenue split</div>
          {collection.fundReceivers.map((r, i) => (
            <div key={i} className="cp-fund-row">
              {/* Shortened address with full address on hover — for the paranoid and the curious */}
              <span className="cp-fund-addr" title={r.address}>{shorten(r.address) || '—'}</span>
              {/* Share percentage — how much of each mint goes to this wallet */}
              <span className="cp-fund-share">{r.share}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Single-Phase Date Footer ─────────────────────────────────────────
          For single-phase collections, show a contextual date at the bottom.
          Active: "Phase started [date]". Upcoming: "Opens [date]". Ended: "Ended [date]".
          Multi-phase collections skip this — the tabs provide the phase context. */}
      {phases.length === 1 && activePhase && (
        <div style={{ padding: '0.6rem 1.25rem', borderTop: '1px solid var(--cp-border)', fontSize: '0.75rem', color: 'var(--cp-text-muted)' }}>
          {phaseIsActive(activePhase)
            ? `Phase started ${formatDate(activePhase.startDateTime)}`
            : phaseIsUpcoming(activePhase)
              ? `Opens ${formatDate(activePhase.startDateTime)}`
              : `Ended${activePhase.endDateTime ? ' ' + formatDate(activePhase.endDateTime) : ''}`}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because minting buttons don't wire themselves, and neither does the optimism.
// (setInterval for countdown. useRef for stale closures. 1% platform fee shown honestly.
//  This card does a lot. It earned its sticky positioning.)
// ─────────────────────────────────────────────────────────────────────────────
