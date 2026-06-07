'use client'

/**
 * WalletConnect - The gateway between the user and the Solana blockchain.
 * Two states: disconnected (a "Connect Wallet" button) and connected (an address chip
 * with a dropdown showing balance, network, copy, explorer link, and disconnect).
 *
 * Architecture:
 * - WalletConnect (exported): guards on WalletReadyContext before rendering.
 * - WalletConnectInner: the real component. Calls useWallet, useConnection.
 *   Only rendered when WalletReadyContext is true. Safe from SSR wallet SDK crashes.
 * - WalletErrorBoundary: catches SDK throws in WalletConnectInner.
 *   Falls back to Placeholder so the header doesn't break if the SDK misbehaves.
 * - WalletModal: the wallet selection sheet. Solflare featured, others listed.
 *   Rendered via createPortal so z-index wins unconditionally.
 * - AddressAvatar: a gradient circle derived from the wallet address.
 *   No external image, no API call. Two hsl() values from the address hash.
 *   Deterministic: same address always gets the same gradient.
 *
 * Security note: we never store private keys. We're a UI. We use the wallet adapter.
 * The private key never leaves the wallet extension. We just display what the chain tells us.
 *
 * @author Juan - The developer who wired Phantom + Solflare to a dark-mode dropdown
 * and made the balance display K/M/B/Q abbreviations because "500000000.000 SOL"
 * is technically correct and spiritually wrong.
 * (Coded with care, an error boundary for the SDK surprises, and the knowledge that
 * wallet connect UX either feels native or feels like a broken drawer. Ours feels native.)
 */

// React imports — Component for the error boundary class, hooks for state/effects/refs,
// context for WalletReadyContext, ReactNode for children typing.
import { Component, useState, useRef, useEffect, useContext, type ReactNode } from 'react'

// createPortal — renders the wallet modal at document.body to escape z-index issues.
// The modal needs to be above everything. Portal ensures it.
import { createPortal } from 'react-dom'

// Solana wallet adapter hooks — the SDK that makes all of this possible.
// useWallet: connected, publicKey, connecting, disconnect, connect, select, wallet.
// useConnection: connection object for on-chain queries (balance).
import { useWallet, useConnection } from '@solana/wallet-adapter-react'

// WalletReadyState + WalletName — for checking if a wallet extension is installed.
// LAMPORTS_PER_SOL — the conversion constant. 1 SOL = 1,000,000,000 lamports.
// The chain reports everything in lamports. We show SOL. We do the math.
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

// Icons — the dropdown's visual vocabulary.
// Wallet: connect button. Copy: copy address. LogOut: disconnect.
// ChevronDown/Up: dropdown toggle. Check: copied confirmation. X: modal close.
// ExternalLink: view on Solscan link.
import { Wallet, Copy, LogOut, ChevronDown, Check, X, ExternalLink } from 'lucide-react'

// cn — classnames. Used for conditional button states.
import { cn } from '@/lib/utils'

// WalletReadyContext — becomes true after wallet adapters initialize on the client.
// Guards the inner component from running before the SDK is ready.
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'

// getChainConfigSync — synchronous chain config read. Safe to call only after walletReady.
// Returns network (mainnet-beta | devnet | testnet) and RPC endpoint.
import { getChainConfigSync } from '@/lib/solana/chain-config'

// WalletConnect.module.css — all component-scoped styles.
// Dropdown, avatar, address button, modal overlay, wallet list, etc.
import styles from './WalletConnect.module.css'

// ── Helper functions ──────────────────────────────────────────────────────────

// truncateAddress — base58 addresses are 32-44 chars. Showing all of them is not useful.
// First 5 + "..." + last 4. "7xKoT...abcd". Recognizable. Not overwhelming.
function truncateAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-4)}`
}

// formatSol — pretty-prints a SOL amount for the balance display.
// Scales to K/M/B/Q for large numbers. Drops trailing zeros. Respects dignity.
// Because "500000000.000 SOL" looks like a database dump, not a balance.
// Under a million: up to 3 decimal places, trailing zeros removed.
function formatSol(amount: number): string {
  const tiers: [number, string][] = [
    [1e15, 'Q'],
    [1e12, 'B'],
    [1e9,  'M'],
    [1e6,  'K'],
  ]
  for (const [threshold, suffix] of tiers) {
    if (amount >= threshold) {
      const scaled = amount / threshold
      return `${+scaled.toFixed(2)}${suffix}`
    }
  }
  // Under 1M — show up to 3 decimals, strip trailing zeros with the + prefix operator.
  return `${+amount.toFixed(3)}`
}

// AddressAvatar — a gradient circle derived deterministically from the wallet address.
// The gradient shifts through two hue angles derived from the first 4 and last 4 chars.
// Same address = same colors. Always. No API. No image. Just math and hsl().
// It's subtle. It makes the dropdown feel personal. Worth it.
function AddressAvatar({ address }: { address: string }) {
  // h1: hue from first 4 chars. Multiply by 31 for distribution. Modulo 360 for hue range.
  const h1 = Array.from(address.slice(0, 4)).reduce((n, c) => (n + c.charCodeAt(0)) * 31, 0) % 360
  // h2: hue from last 4 chars. Different section of the address = different color.
  const h2 = Array.from(address.slice(-4)).reduce((n, c) => (n + c.charCodeAt(0)) * 31, 0) % 360
  return (
    <div
      className={styles.avatar}
      style={{ background: `linear-gradient(135deg, hsl(${h1},70%,55%), hsl(${h2},70%,55%))` }}
    />
  )
}

// ── Placeholder ───────────────────────────────────────────────────────────────

// Placeholder — a disabled "Connect Wallet" button shown before the SDK is ready.
// Also the error boundary fallback. Users see this instead of a crash.
// Disabled so nobody clicks it before adapters are initialized.
const Placeholder = () => (
  <button disabled className={styles.connectBtn} aria-label="Connect Wallet">
    <Wallet className={styles.icon} aria-hidden />
    <span className={styles.btnText}>Connect Wallet</span>
  </button>
)

// ── Error boundary ────────────────────────────────────────────────────────────

// WalletErrorBoundary — catches any error thrown by the wallet SDK.
// Renders Placeholder on error so the header doesn't turn into a white screen of death.
// Class component because error boundaries must be class components. That's React's rule.
// We're not happy about it. We follow it anyway.
class WalletErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    // hasError: show the disabled placeholder instead of the crashed component
    if (this.state.hasError) return <Placeholder />
    return this.props.children
  }
}

// ── Wallet selection modal ────────────────────────────────────────────────────

// WalletModalProps — what the modal needs to function.
export interface WalletModalProps {
  // onSelect — called with the chosen wallet's name. We select + connect from there.
  onSelect: (name: WalletName) => void
  // onClose — called when the user closes the modal (X button or backdrop click).
  onClose: () => void
}

/**
 * WalletModal — the wallet selection sheet. Portal-rendered at document.body.
 * Solflare gets the "Recommended" featured slot because it's excellent.
 * Other installed wallets appear in a secondary list.
 * If Solflare isn't installed, the Solflare button opens solflare.com instead.
 * "New to Solana wallets?" footnote provides a gentle on-ramp.
 */
export function WalletModal({ onSelect, onClose }: WalletModalProps) {
  // wallets — all available wallet adapters from the SDK.
  const { wallets } = useWallet()

  // Solflare gets special treatment — it's the featured wallet.
  // We check readyState to know if it's installed or if we should send them to download it.
  const solflare = wallets.find(w => w.adapter.name === 'Solflare')
  const solflareInstalled = solflare?.readyState === WalletReadyState.Installed

  // others — all installed or loadable wallets except Solflare.
  // Solflare has its own featured section. Others share the secondary list.
  const others = wallets.filter(w =>
    w.adapter.name !== 'Solflare' &&
    (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
  )

  // handleSolflare — if installed: connect directly. If not: open installation page.
  // The button copy says "Get it →" when not installed.
  function handleSolflare() {
    if (solflareInstalled && solflare) {
      onSelect(solflare.adapter.name as WalletName)
    } else {
      window.open('https://solflare.com', '_blank', 'noopener,noreferrer')
    }
  }

  // Portal — renders at document.body so z-index fights are preemptively won.
  // role="dialog" + aria-modal for AT. aria-label describes the dialog's purpose.
  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Connect Wallet"
    >
      {/* Modal card — stopPropagation so clicking inside doesn't close the overlay */}
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Modal header — title + close button */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Connect Wallet</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {/* Subtitle — "Choose your Solana wallet to get started". Welcoming. Not intimidating. */}
        <p className={styles.modalSubtitle}>Choose your Solana wallet to get started</p>

        {/* Solflare featured section — always shows, installed or not.
            If installed: connects on click. If not: opens download page.
            "Recommended" badge when installed. "Get it →" when not. */}
        <div className={styles.walletSection}>
          <span className={styles.sectionLabel}>Recommended</span>
          <button
            className={cn(styles.walletBtn, styles.walletBtnFeatured)}
            onClick={handleSolflare}
          >
            {/* Wallet icon — from the adapter's metadata. Falls back to a placeholder div. */}
            {solflare ? (
              <img src={solflare.adapter.icon} alt="Solflare" className={styles.walletIcon} />
            ) : (
              <div className={styles.walletIconPlaceholder} />
            )}
            <span className={styles.walletName}>Solflare</span>
            {/* Badge: "Recommended" if installed, "Get it →" if not. */}
            {solflareInstalled
              ? <span className={styles.walletBadge}>Recommended</span>
              : <span className={styles.walletInstallHint}>Get it →</span>
            }
          </button>
        </div>

        {/* Other wallets — only shown if any other installed/loadable wallets exist.
            Phantom, Backpack, etc. Whatever the user has installed. */}
        {others.length > 0 && (
          <div className={styles.walletSection}>
            <span className={styles.sectionLabel}>Other Wallets</span>
            <div className={styles.walletList}>
              {others.map(w => (
                <button
                  key={w.adapter.name}
                  className={styles.walletBtn}
                  onClick={() => onSelect(w.adapter.name as WalletName)}
                >
                  <img src={w.adapter.icon} alt={w.adapter.name} className={styles.walletIcon} />
                  <span className={styles.walletName}>{w.adapter.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer note — links newcomers to Solflare.
            "New to Solana wallets?" — non-judgmental. Helpful. */}
        <p className={styles.modalFootnote}>
          New to Solana wallets?{' '}
          <a
            href="https://solflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.modalLink}
          >
            Start with Solflare →
          </a>
        </p>
      </div>
    </div>,
    document.body
  )
}

// ── WalletConnectInner ────────────────────────────────────────────────────────

/**
 * WalletConnectInner — the real component. Only rendered when WalletReadyContext is true.
 * Reads wallet state from useWallet and useConnection.
 * Two render branches: disconnected (connect button + modal) and connected (address chip + dropdown).
 */
// eslint-disable-next-line complexity
function WalletConnectInner() {
  // Wallet adapter state — connected, publicKey (null when disconnected), connecting,
  // disconnect, wallet (the adapter object), connect, select.
  const { connected, publicKey, connecting, disconnect, wallet, connect, select, wallets } = useWallet()

  // connection — for fetching the SOL balance. Queries the chain directly.
  const { connection } = useConnection()

  // modalOpen — controls the wallet selection modal visibility.
  const [modalOpen, setModalOpen] = useState(false)

  // dropdownOpen — controls the connected state dropdown visibility.
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // copied — true for 2 seconds after copying the address. Shows a checkmark.
  const [copied, setCopied] = useState(false)

  // balance — SOL balance fetched from the chain. Null while loading or disconnected.
  const [balance, setBalance] = useState<number | null>(null)

  // pendingConnect — true after wallet selection, before connect() resolves.
  // The effect below fires connect() once the wallet adapter is ready.
  

  // containerRef — for click-outside detection on the dropdown.
  const containerRef = useRef<HTMLDivElement>(null)

  // address — base58 public key string, or null when disconnected.
  const address = publicKey?.toBase58() ?? null

  // pendingConnect effect — fires connect() after select() has set the wallet.
  // select() is async-ish — the wallet might not be ready immediately after calling it.
  // We watch for wallet being set + not yet connected + not connecting → fire connect().
  

  // Balance fetch effect — queries on-chain balance when publicKey is available.
  // Cancellation flag prevents stale setState on slow networks or rapid re-renders.
  // We don't retry on failure. One attempt per render cycle. Quiet failures are fine.
  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    let cancelled = false
    connection.getBalance(publicKey)
      .then(lamports => { if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [publicKey, connection])

  // Click-outside effect for the dropdown.
  // When the dropdown is open, clicks outside containerRef close it.
  useEffect(() => {
    if (!dropdownOpen) return
    function onClickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [dropdownOpen])

  // ESC key closes the modal.
  useEffect(() => {
    if (!modalOpen) return
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [modalOpen])

  // Chain config — safe to call because walletReady=true guarantees config is loaded.
  // network: 'mainnet-beta' | 'devnet' | 'testnet'
  // clusterParam: query string for explorer URLs (?cluster=devnet for non-mainnet)
  const cfg = getChainConfigSync()
  const networkLabel = cfg.network === 'mainnet-beta' ? 'Mainnet' : cfg.network.charAt(0).toUpperCase() + cfg.network.slice(1)
  const clusterParam = cfg.network === 'mainnet-beta' ? '' : `?cluster=${cfg.network}`
  // Solscan explorer link — shows the user's account on the correct cluster.
  const explorerUrl = address ? `https://solscan.io/account/${address}${clusterParam}` : '#'

  // handleWalletSelect — called when the user picks a wallet in the modal.
  // Selects the adapter, closes the modal, sets pendingConnect.
  function handleWalletSelect(name: WalletName) {
    // Try to connect the adapter directly during the user's click so the
    // browser treats it as a user gesture and shows the wallet popup.
    const entry = wallets.find(w => w.adapter.name === name)
    // Close modal and select in provider state regardless.
    setModalOpen(false)
    select(name)

    if (entry && typeof entry.adapter.connect === 'function') {
      // Call the adapter's connect method directly. If it fails, fall back
      // to the provider's connect() which may wait until the adapter is ready.
      entry.adapter.connect().catch(err => {
        console.error('[Wallet adapter connect]', err)
        connect().catch(err2 => console.error('[Wallet connect]', err2))
      })
    } else {
      connect().catch(err => console.error('[Wallet connect]', err))
    }
  }

  // handleCopy — copies the address to clipboard, shows a check for 2 seconds.
  // Clipboard API might be unavailable in some contexts. We swallow that error.
  function handleCopy() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // handleDisconnect — disconnects the wallet and closes the dropdown.
  function handleDisconnect() {
    disconnect()
    setDropdownOpen(false)
  }

  // ── Disconnected state ─────────────────────────────────────────────────────
  // Connect button + modal. The entry point to the blockchain.
  // "Connecting..." during the connection process. Button disabled while connecting.
  if (!connected || !address) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          disabled={connecting}
          className={styles.connectBtn}
        >
          <Wallet className={styles.icon} aria-hidden />
          <span className={styles.btnText}>
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </span>
        </button>
        {/* Modal — only renders when modalOpen. createPortal inside WalletModal. */}
        {modalOpen && (
          <WalletModal
            onSelect={handleWalletSelect}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  // ── Connected state ────────────────────────────────────────────────────────
  // Address chip button → opens dropdown.
  // Dropdown: gradient avatar, address + copy/explorer, wallet name, balance, network, disconnect.
  return (
    <div ref={containerRef} className={styles.wrapper}>
      {/* Address chip — truncated address, green status dot, chevron that flips on open.
          aria-expanded for AT so they know the dropdown state. */}
      <button
        onClick={() => setDropdownOpen(v => !v)}
        className={cn(styles.addressBtn, dropdownOpen && styles.addressBtnActive)}
        aria-expanded={dropdownOpen}
      >
        {/* Status dot — green pulsing indicator. "Connected". Important signal. */}
        <span className={styles.statusDot} aria-hidden />
        <span>{truncateAddress(address)}</span>
        {/* Chevron — flips 180° when dropdown is open. ChevronDown → ChevronUp. */}
        <ChevronDown
          className={cn(styles.chevron, dropdownOpen && styles.chevronUp)}
          aria-hidden
        />
      </button>

      {/* Dropdown — visible when dropdownOpen is true. */}
      {dropdownOpen && (
        <div className={styles.dropdown} role="menu">

          {/* Identity section — gradient avatar + address row + wallet name row */}
          <div className={styles.dropdownIdentity}>
            {/* Gradient avatar — derived from address. Deterministic. Personal. */}
            <AddressAvatar address={address} />
            <div className={styles.identityInfo}>
              <div className={styles.identityAddressRow}>
                <span className={styles.addressText}>{truncateAddress(address)}</span>
                <div className={styles.dropdownActions}>
                  {/* Copy button — checkmark for 2s after clicking. Small delight. */}
                  <button onClick={handleCopy} className={styles.actionBtn} title="Copy address">
                    {copied
                      ? <Check className={styles.copyIcon} aria-hidden />
                      : <Copy className={styles.copyIcon} aria-hidden />
                    }
                  </button>
                  {/* Solscan link — opens the account page in a new tab. */}
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionBtn}
                    title="View on Solscan"
                  >
                    <ExternalLink className={styles.copyIcon} aria-hidden />
                  </a>
                </div>
              </div>
              {/* Wallet adapter name + icon — shows which wallet is connected. */}
              {wallet?.adapter && (
                <div className={styles.walletRow}>
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} className={styles.walletRowIcon} />
                  <span className={styles.walletRowName}>{wallet.adapter.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* SOL balance section — fetched on-chain. "—" while loading. */}
          <div className={styles.balanceSection}>
            <span className={styles.sectionMeta}>Balance</span>
            <span className={styles.balanceSol}>
              {balance !== null ? (
                <>
                  {formatSol(balance)}
                  {/* Solana logo — inline with the balance number */}
                  <img src="/svg/solana-sol-logo.svg" alt="SOL" className={styles.solIcon} />
                </>
              ) : '—'}
            </span>
          </div>

          <div className={styles.divider} />

          {/* Network indicator — Mainnet in green, devnet/testnet in orange.
              The CSS handles the color via data-network attribute styling. */}
          <div className={styles.networkSection}>
            <span data-network={cfg.network} className={styles.networkPill}>● {networkLabel}</span>
            <span className={styles.sectionMeta}>Network</span>
          </div>

          <div className={styles.divider} />

          {/* Disconnect button — the exit. Calls disconnect() + closes dropdown. */}
          <button onClick={handleDisconnect} className={styles.disconnectBtn} role="menuitem">
            <LogOut className={styles.disconnectIcon} aria-hidden />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

// ── WalletConnect (exported) ──────────────────────────────────────────────────

/**
 * WalletConnect — the exported component. The only one callers need.
 * Checks WalletReadyContext before rendering WalletConnectInner.
 * WalletErrorBoundary catches any SDK throws and shows Placeholder.
 * If walletReady is false, Placeholder renders — no hooks called, no crashes.
 */
export default function WalletConnect() {
  // WalletReadyContext — false until wallet adapters have initialized.
  // We don't render the inner component before this is true. Full stop.
  const walletReady = useContext(WalletReadyContext)

  // Not ready — show the disabled placeholder.
  // No hooks. No SDK calls. Nothing. Just a quiet "Connect Wallet" button that does nothing.
  if (!walletReady) return <Placeholder />

  // Ready — render inside the error boundary.
  // If the SDK throws, WalletErrorBoundary catches it and shows Placeholder.
  return (
    <WalletErrorBoundary>
      <WalletConnectInner />
    </WalletErrorBoundary>
  )
}

// Coded by Juan — Phantom, Solflare, and whatever other wallet the user has installed.
// Gradient avatar. Balance in K/M/B. Solscan link. Network badge. Copy with checkmark.
// The wallet dropdown is the most-clicked component in the app that nobody thinks about.
// We thought about it. Every detail is intentional. You're welcome.
