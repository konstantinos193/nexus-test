'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import type { WalletName } from '@solana/wallet-adapter-base'
import { mapWalletErrorToMessage } from '@/lib/solana/errors'
import { clearWalletSession } from '@/lib/wallet/session'
import { getWalletInstallUrl, isNotInstalledError } from '@/lib/wallet/installUrls'
import { getWalletIconPath } from '@/lib/wallet/iconPaths'
import { getExplorerAddressUrl } from '@/lib/solana/explorer'
import { getCurrentNetwork, getNetworkDisplayName } from '@/lib/solana/config'
import { WALLET_STORAGE_KEY } from '@/lib/wallet/constants'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useNetworkCheck } from '@/hooks/useNetworkCheck'
import styles from './ConnectWallet.module.css'
import './ConnectWalletDropdown.css'

const LAMPORTS_PER_SOL = 1e9

function shortKey(k: string) {
  return k.slice(0, 4) + '...' + k.slice(-4)
}

/** Wallet we recommend in the connect modal (badge + subtle highlight) */
const SUGGESTED_WALLET = 'Solflare'

/** Always shown at top: these 3 + any other installed wallets (no long list). */
const TOP_3_NAMES = ['Solflare', 'Phantom', 'Backpack'] as const

/** Full list of Solana wallet apps (used for ordering; only top 3 + installed are rendered). */
const PRO_WALLET_ORDER = [
  'Phantom',
  'Solflare',
  'Backpack',
  'Glow',
  'Trust Wallet',
  'Exodus',
  'MetaMask',
  'Magic Eden',
  'Coinbase Wallet',
  'Brave Wallet',
  'Bitget Wallet',
  'Coin98 Wallet',
  'MathWallet',
  'SafePal Wallet',
  'Atomic Wallet',
  'Guarda Wallet',
  'OKX Wallet',
  'Binance Web3 Wallet',
  'TokenPocket',
  'Zelcore',
  'Torus Wallet',
  'Nightly Wallet',
  'FoxWallet',
  'iToken Wallet',
  'Infinity Wallet',
  'Coinomi',
  'Wombat Wallet',
  'Nufi Wallet',
  'HyperPay Wallet',
  'Safeheron Wallet',
  'ImToken',
  'Ledger',
  'WalletConnect',
] as const

/** Fallback when context not ready — same order */
const FALLBACK_WALLET_NAMES = PRO_WALLET_ORDER

/** Inline display label for wallet name (avoids dynamic lookup in bundle). Handles rebrands/aliases. */
function toLabel(n: string): string {
  if (n === 'Trust') return 'Trust Wallet'
  if (n === 'Binance Web3 Wallet') return 'Binance Wallet'
  if (n === 'ImToken') return 'imToken'
  if (n === 'MetaMask') return 'MetaMask Solana'
  if (n === 'Magic Eden') return 'Magic Eden Wallet'
  return n
}

type WalletRow = {
  name: string
  displayName: string
  icon?: string
  readyState: string
  adapterName: WalletName
}

function getAvailabilityLabel(readyState: string): string {
  if (readyState === 'Installed') return 'Installed'
  if (readyState === 'NotDetected' || readyState === 'Loadable') return 'Not Installed'
  return readyState
}

/**
 * Sort: installed first, then last connected, then by PRO_WALLET_ORDER.
 */
function sortWallets(wallets: WalletRow[], lastConnectedName: string | null): WalletRow[] {
  const order = PRO_WALLET_ORDER as readonly string[]
  const index = (name: string) => {
    const i = order.indexOf(name)
    return i === -1 ? 999 : i
  }
  const list = [...wallets]
  list.sort((a, b) => {
    if (a.readyState === 'Installed' && b.readyState !== 'Installed') return -1
    if (a.readyState !== 'Installed' && b.readyState === 'Installed') return 1
    if (a.name === lastConnectedName) return -1
    if (b.name === lastConnectedName) return 1
    return index(a.name) - index(b.name)
  })
  return list
}

export interface ConnectWalletProps {
  /** When true, disconnect is disabled (e.g. mint tx in progress). */
  isMinting?: boolean
}

export default function ConnectWallet({ isMinting = false }: ConnectWalletProps) {
  const {
    wallets: walletsFromContext,
    select,
    connect,
    disconnect,
    connected,
    connecting,
    publicKey,
    wallet,
  } = useWallet()
  const { connection } = useConnection()
  const networkCheck = useNetworkCheck()

  const isMobile = useIsMobile()
  const [popupOpen, setPopupOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [disconnectConfirm, setDisconnectConfirm] = useState(false)
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null)
  const [airdroping, setAirdroping] = useState(false)
  const [airdropError, setAirdropError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectingWalletName, setConnectingWalletName] = useState<string | null>(null)
  const [installWalletName, setInstallWalletName] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disconnectConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Prevents multiple simultaneous connect flows (e.g. double-click); one wallet at a time. */
  const connectInProgressRef = useRef(false)

  const adapterRows: WalletRow[] = useMemo(() => {
    const raw = walletsFromContext ?? []
    const rows: WalletRow[] = []
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i]
      const name = w.adapter.name
      rows.push({
        name,
        displayName: toLabel(name),
        icon: w.adapter.icon,
        readyState: w.readyState,
        adapterName: w.adapter.name,
      })
    }
    return rows
  }, [walletsFromContext])

  /** Adapter name → row (Trust adapter reports "Trust", we treat as Trust Wallet) */
  const adapterByName = useMemo(() => {
    const map = new Map<string, WalletRow>()
    for (const row of adapterRows) {
      map.set(row.name, row)
      if (row.name === 'Trust') map.set('Trust Wallet', row)
    }
    return map
  }, [adapterRows])

  /** Full list: every PRO wallet on all devices (mobile and desktop). Uses adapter when present in context, else stub with "Not Installed". Never filtered by device so mobile shows the same options as desktop. */
  const fullWalletList: WalletRow[] = useMemo(() => {
    const list: WalletRow[] = []
    for (const name of PRO_WALLET_ORDER) {
      const existing = adapterByName.get(name)
      if (existing) {
        list.push(existing)
      } else {
        list.push({
          name,
          displayName: toLabel(name),
          icon: getWalletIconPath(name),
          readyState: 'NotDetected',
          adapterName: name as WalletName,
        })
      }
    }
    return list
  }, [adapterByName])

  const lastConnectedName = typeof window !== 'undefined' ? localStorage.getItem(WALLET_STORAGE_KEY) : null
  /** Same sorted list on mobile and desktop; no device-based slice */
  const sortedWallets = sortWallets(fullWalletList, lastConnectedName)
  const hasAdapter = (name: string) => adapterByName.has(name) || (name === 'Trust Wallet' && adapterByName.has('Trust'))

  /** Only top 3 (Solflare, Phantom, Backpack) + any other installed wallets. */
  const displayWallets: WalletRow[] = useMemo(() => {
    const byName = new Map(sortedWallets.map((w) => [w.name, w]))
    const top3: WalletRow[] = []
    for (const name of TOP_3_NAMES) {
      const w = byName.get(name)
      if (w) top3.push(w)
    }
    top3.sort((a, b) => {
      if (a.readyState === 'Installed' && b.readyState !== 'Installed') return -1
      if (a.readyState !== 'Installed' && b.readyState === 'Installed') return 1
      return TOP_3_NAMES.indexOf(a.name as (typeof TOP_3_NAMES)[number]) - TOP_3_NAMES.indexOf(b.name as (typeof TOP_3_NAMES)[number])
    })
    const top3Names = new Set(TOP_3_NAMES)
    const otherInstalled = sortedWallets.filter((w) => w.readyState === 'Installed' && !top3Names.has(w.name as (typeof TOP_3_NAMES)[number]))
    return [...top3, ...otherInstalled]
  }, [sortedWallets])

  // Scroll lock when popup open (on mobile use position:fixed so iOS actually locks background scroll)
  useEffect(() => {
    if (!popupOpen) return
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevLeft = document.body.style.left
    const prevRight = document.body.style.right
    const prevWidth = document.body.style.width
    const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 768
    if (isNarrow) {
      const scrollY = window.scrollY ?? window.pageYOffset
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      document.body.setAttribute('data-connect-modal-scroll-y', String(scrollY))
    } else {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = prevOverflow
      if (isNarrow) {
        document.body.style.position = prevPosition
        document.body.style.top = prevTop
        document.body.style.left = prevLeft
        document.body.style.right = prevRight
        document.body.style.width = prevWidth
        const scrollY = document.body.getAttribute('data-connect-modal-scroll-y')
        document.body.removeAttribute('data-connect-modal-scroll-y')
        if (scrollY !== null) window.scrollTo(0, parseInt(scrollY, 10))
      }
    }
  }, [popupOpen])

  // Focus trap + ESC close
  const closePopup = useCallback(() => {
    if (connecting) return
    setPopupOpen(false)
    setErrorMessage(null)
    setConnectingWalletName(null)
    setInstallWalletName(null)
  }, [connecting])

  useFocusTrap(popupOpen && !connected, panelRef, {
    onEscape: closePopup,
    initialFocus: !isMobile,
  })

  // Close popup on successful connect
  useEffect(() => {
    if (connected && popupOpen) {
      setPopupOpen(false)
      setErrorMessage(null)
      setConnectingWalletName(null)
    }
  }, [connected, popupOpen])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (dropdownRef.current?.contains(target)) return
      const btn = document.querySelector('[data-connect-wallet-trigger]')
      if (btn?.contains(target)) return
      setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  // Close dropdown on ESC
  useEffect(() => {
    if (!dropdownOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setDisconnectConfirm(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dropdownOpen])

  // Reset disconnect-confirm and airdrop error when dropdown closes
  useEffect(() => {
    if (!dropdownOpen) {
      setDisconnectConfirm(false)
      setAirdropError(null)
      if (disconnectConfirmTimeoutRef.current) {
        clearTimeout(disconnectConfirmTimeoutRef.current)
        disconnectConfirmTimeoutRef.current = null
      }
    }
  }, [dropdownOpen])

  // Fetch SOL balance when dropdown is open (for display)
  useEffect(() => {
    if (!dropdownOpen || !publicKey) {
      setBalanceLamports(null)
      return
    }
    let cancelled = false
    connection.getBalance(publicKey).then((lamports) => {
      if (!cancelled) setBalanceLamports(lamports)
    }).catch(() => {
      if (!cancelled) setBalanceLamports(null)
    })
    return () => { cancelled = true }
  }, [dropdownOpen, publicKey, connection])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current)
      if (disconnectConfirmTimeoutRef.current) clearTimeout(disconnectConfirmTimeoutRef.current)
    }
  }, [])

  const btnLabel = useMemo(() => {
    if (connecting) return 'Connecting...'
    if (connected && publicKey) return shortKey(publicKey.toBase58())
    return 'Connect Wallet'
  }, [connecting, connected, publicKey])

  async function onTriggerClick() {
    if (connected) {
      setDropdownOpen((o) => !o)
      return
    }
    setErrorMessage(null)
    setInstallWalletName(null)
    setPopupOpen(true)
  }

  async function pickWallet(name: WalletName | (typeof FALLBACK_WALLET_NAMES)[number]) {
    if (connecting || connected || connectInProgressRef.current) return
    setErrorMessage(null)
    setInstallWalletName(null)
    const nameStr = String(name)
    if (!hasAdapter(nameStr)) {
      const url = getWalletInstallUrl(nameStr)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    connectInProgressRef.current = true
    setConnectingWalletName(nameStr)
    try {
      // Select this wallet only (Wallet Standard gives each extension its own adapter).
      select(name as WalletName)
      // Wait for WalletProvider to commit the selected adapter before connect().
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      await connect()
      setPopupOpen(false)
    } catch (e) {
      console.error('Wallet connect failed:', e)
      setErrorMessage(mapWalletErrorToMessage(e))
      if (isNotInstalledError(e)) setInstallWalletName(nameStr)
    } finally {
      connectInProgressRef.current = false
      setConnectingWalletName(null)
    }
  }

  function handleDisconnectClick() {
    if (isMinting) return
    if (disconnectConfirm) {
      setDropdownOpen(false)
      setDisconnectConfirm(false)
      if (disconnectConfirmTimeoutRef.current) {
        clearTimeout(disconnectConfirmTimeoutRef.current)
        disconnectConfirmTimeoutRef.current = null
      }
      clearWalletSession()
      void disconnect()
      return
    }
    setDisconnectConfirm(true)
    if (disconnectConfirmTimeoutRef.current) clearTimeout(disconnectConfirmTimeoutRef.current)
    disconnectConfirmTimeoutRef.current = setTimeout(() => {
      setDisconnectConfirm(false)
      disconnectConfirmTimeoutRef.current = null
    }, 5000)
  }

  function copyAddress() {
    if (!publicKey) return
    void navigator.clipboard.writeText(publicKey.toBase58()).then(() => {
      setCopied(true)
      if (copyFeedbackTimeoutRef.current) clearTimeout(copyFeedbackTimeoutRef.current)
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopied(false)
        copyFeedbackTimeoutRef.current = null
      }, 2000)
    })
  }

  const explorerUrl = publicKey ? getExplorerAddressUrl(publicKey.toBase58(), getCurrentNetwork()) : null
  const isLocalnet = getCurrentNetwork() === 'localnet'

  async function handleAirdrop() {
    if (!publicKey || airdroping) return
    setAirdropError(null)
    setAirdroping(true)
    try {
      const sig = await connection.requestAirdrop(publicKey, 100 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(sig, 'confirmed')
      const lamports = await connection.getBalance(publicKey)
      setBalanceLamports(lamports)
    } catch (e) {
      console.error('Airdrop failed:', e)
      setAirdropError(e instanceof Error ? e.message : 'Airdrop failed')
    } finally {
      setAirdroping(false)
    }
  }

  // --- Connected: trigger + dropdown ---
  if (connected && publicKey) {
    return (
      <div className={styles.connectedWrap} ref={dropdownRef}>
        <button
          type="button"
          data-connect-wallet-trigger
          onClick={onTriggerClick}
          className={styles.trigger}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          aria-label="Wallet connected"
        >
          {wallet?.adapter.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallet.adapter.icon} alt="" className={styles.walletIcon} aria-hidden />
          )}
          <span>{btnLabel}</span>
        </button>
        {dropdownOpen && (
          <div className="cw-dropdown-root" role="menu" aria-label="Wallet account panel">
            {/* 1. Wallet Identity Block */}
            <div className="cw-header">
              {wallet?.adapter.icon && (
                <img src={wallet.adapter.icon} alt="" className="cw-wallet-icon" aria-hidden />
              )}
              <div className="cw-wallet-info">
                <span className="cw-wallet-name">
                  {wallet?.adapter.name ? toLabel(wallet.adapter.name) : 'Wallet'}
                </span>
                <button
                  type="button"
                  className="cw-address-button"
                  onClick={copyAddress}
                  aria-label={copied ? 'Address copied' : 'Copy full address'}
                  title="Copy address"
                >
                  <span className="cw-address">{btnLabel}</span>
                  <span className="cw-copy-hint" aria-hidden>
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
                <span className="cw-badge">Connected</span>
              </div>
            </div>

            <div className="cw-divider" aria-hidden />

            {/* 2. Network Status */}
            <div className="cw-section">
              <div className="cw-network-row" aria-live="polite">
                <span
                  className={`cw-network-dot ${networkCheck.isChecking ? 'cw-network-dot-checking' : networkCheck.isCorrectNetwork ? 'cw-network-dot-ok' : 'cw-network-dot-wrong'}`}
                  aria-hidden
                />
                <span className="cw-network-label">
                  {networkCheck.isChecking
                    ? 'Checking…'
                    : getNetworkDisplayName()}
                  {networkCheck.isWrongNetwork && networkCheck.error && (
                    <span className="cw-network-label-muted">
                      {' '}(Connection unstable)
                    </span>
                  )}
                </span>
              </div>
              {networkCheck.isWrongNetwork && networkCheck.error && (
                <p className="cw-network-warning" role="alert">
                  Switch wallet or RPC to {networkCheck.expectedNetworkName}.
                </p>
              )}
            </div>

            <div className="cw-divider" aria-hidden />

            {/* 3. Actions */}
            <div className="cw-section">
              <button
                type="button"
                className="cw-item cw-item-primary"
                onClick={copyAddress}
                disabled={copied}
                role="menuitem"
                aria-label={copied ? 'Address copied' : 'Copy address'}
              >
                <span className="cw-item-icon" aria-hidden>
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span>{copied ? 'Copied' : 'Copy Address'}</span>
              </button>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cw-item"
                  role="menuitem"
                  aria-label="View on Solana Explorer"
                >
                  <span className="cw-item-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 3H3v10h10v-3M13 2L8 7M13 2v4M13 2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>View on Explorer</span>
                </a>
              )}
            </div>

            <div className="cw-divider" aria-hidden />

            {/* 4. My Mints + Balance */}
            <div className="cw-section">
              <Link
                href="/dashboard"
                className="cw-item"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                aria-label="My mints and mint history"
              >
                <span className="cw-item-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4h12v8H2V4zM4 7h8M6 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <span>My Mints</span>
              </Link>
              <div className="cw-balance-row" aria-label="SOL balance">
                <span className="cw-balance-label">Balance</span>
                <span className="cw-balance-value">
                  {balanceLamports !== null
                    ? `${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`
                    : '—'}
                </span>
              </div>
              {isLocalnet && (
                <>
                  <button
                    type="button"
                    className="cw-item cw-item-primary"
                    onClick={handleAirdrop}
                    disabled={airdroping}
                    role="menuitem"
                    aria-label={airdroping ? 'Airdropping…' : 'Airdrop 100 SOL (localnet)'}
                  >
                    <span className="cw-item-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2v12M4 6l4-4 4 4M4 10l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{airdroping ? 'Airdropping…' : 'Airdrop 100 SOL'}</span>
                  </button>
                  {airdropError && (
                    <p className="cw-network-warning" role="alert">
                      {airdropError}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="cw-divider" aria-hidden />

            {/* 5. Disconnect */}
            <div className="cw-section-danger">
              <button
                type="button"
                className="cw-item cw-item-danger"
                onClick={handleDisconnectClick}
                disabled={isMinting}
                role="menuitem"
                aria-label={disconnectConfirm ? 'Click again to disconnect' : 'Disconnect wallet'}
                title={isMinting ? 'Cannot disconnect while minting' : undefined}
              >
                <span className="cw-item-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 10l3-3-3-3M14 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  {isMinting
                    ? 'Disconnect (disabled)'
                    : disconnectConfirm
                      ? 'Click again to disconnect'
                      : 'Disconnect Wallet'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Disconnected: trigger + popup ---
  const currentError = errorMessage
  return (
    <>
      <button
        type="button"
        data-connect-wallet-trigger
        onClick={onTriggerClick}
        disabled={connecting}
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={popupOpen}
        aria-label="Connect wallet"
      >
        {btnLabel}
      </button>

      {popupOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          /* Overlay/panel layout (incl. mobile bottom-sheet) is CSS-only via @media (max-width: 768px) to avoid duplicate mobile logic and hydration flash. */
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-wallet-title"
            aria-describedby="connect-wallet-desc"
          >
            <div
              className={styles.backdrop}
              style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
              onClick={closePopup}
              aria-hidden
            />
            <div
              ref={panelRef}
              className={styles.panel}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Connecting overlay: prevent accidental close */}
              {connecting && (
                <div className={styles.connectingOverlay} aria-live="polite">
                  <div className={styles.connectingSpinner} aria-hidden />
                  <span>Waiting for approval</span>
                </div>
              )}

              <header className={styles.header}>
                <div className={styles.headerRow}>
                  <div>
                    <h2 id="connect-wallet-title" className={styles.headerTitle}>
                      Connect Wallet
                    </h2>
                    <p id="connect-wallet-desc" className={styles.headerSecondary}>
                      Select a wallet to continue
                    </p>
                    <p className={styles.headerSecondary} aria-label="Network">
                      {getNetworkDisplayName()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePopup}
                    disabled={connecting}
                    className={styles.closeBtn}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </header>

              {currentError ? (
                <div className={styles.errorBlock} role="alert">
                  <p>{currentError}</p>
                  {installWalletName && getWalletInstallUrl(installWalletName) && (
                    <a
                      href={getWalletInstallUrl(installWalletName)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginTop: 8, display: 'inline-block' }}
                    >
                      Install {installWalletName}
                    </a>
                  )}
                </div>
              ) : null}

              <div className={styles.walletList} role="list">
                {displayWallets.map((w) => {
                  const isConnecting = connectingWalletName === w.name
                  const canConnect = hasAdapter(w.name)
                  const iconSrc = getWalletIconPath(w.name) || w.icon
                  const label = w.displayName
                  const isSuggested = w.name === SUGGESTED_WALLET
                  return (
                    <button
                      key={w.name}
                      type="button"
                      className={`${styles.walletRow} ${isConnecting ? styles.walletRowLoading : ''} ${isSuggested ? styles.walletRowSuggested : ''}`}
                      onClick={() => pickWallet(w.adapterName)}
                      disabled={!!connectingWalletName}
                      role="listitem"
                      aria-busy={isConnecting}
                    >
                      {iconSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={iconSrc} alt="" className={styles.walletIcon} />
                      )}
                      <span className={styles.walletName}>
                        {label}
                        {isSuggested && (
                          <span className={styles.suggestedBadge} aria-label="Recommended wallet">
                            Suggested
                          </span>
                        )}
                      </span>
                      <span
                        className={`${styles.walletStatus} ${
                          isConnecting ? '' : canConnect && w.readyState === 'Installed' ? styles.walletStatusInstalled : styles.walletStatusNotInstalled
                        }`}
                      >
                        {isConnecting ? 'Connecting...' : canConnect ? getAvailabilityLabel(w.readyState) : 'Not Installed'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
