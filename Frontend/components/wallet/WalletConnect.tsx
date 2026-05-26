'use client'

import { Component, useState, useRef, useEffect, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Wallet, Copy, LogOut, ChevronDown, Check, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

import { WalletReadyContext } from '@/components/providers/WalletReadyContext'
import { getChainConfigSync } from '@/lib/solana/chain-config'
import styles from './WalletConnect.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-4)}`
}

// Pretty-prints a SOL amount: strips trailing zeros, scales to K/M/B/Q.
// Because "500000000.000 SOL" is technically correct but spiritually wrong.
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
  // Under a million — show up to 3 decimals, drop trailing zeros.
  return `${+amount.toFixed(3)}`
}

function AddressAvatar({ address }: { address: string }) {
  const h1 = Array.from(address.slice(0, 4)).reduce((n, c) => (n + c.charCodeAt(0)) * 31, 0) % 360
  const h2 = Array.from(address.slice(-4)).reduce((n, c) => (n + c.charCodeAt(0)) * 31, 0) % 360
  return (
    <div
      className={styles.avatar}
      style={{ background: `linear-gradient(135deg, hsl(${h1},70%,55%), hsl(${h2},70%,55%))` }}
    />
  )
}

// ── Placeholder ───────────────────────────────────────────────────────────────

const Placeholder = () => (
  <button disabled className={styles.connectBtn} aria-label="Connect Wallet">
    <Wallet className={styles.icon} aria-hidden />
    <span className={styles.btnText}>Connect Wallet</span>
  </button>
)

// ── Error boundary ────────────────────────────────────────────────────────────

class WalletErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return <Placeholder />
    return this.props.children
  }
}

// ── Wallet selection modal ────────────────────────────────────────────────────

interface WalletModalProps {
  onSelect: (name: WalletName) => void
  onClose: () => void
}

function WalletModal({ onSelect, onClose }: WalletModalProps) {
  const { wallets } = useWallet()

  const solflare = wallets.find(w => w.adapter.name === 'Solflare')
  const solflareInstalled = solflare?.readyState === WalletReadyState.Installed

  const others = wallets.filter(w =>
    w.adapter.name !== 'Solflare' &&
    (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable)
  )

  function handleSolflare() {
    if (solflareInstalled && solflare) {
      onSelect(solflare.adapter.name as WalletName)
    } else {
      window.open('https://solflare.com', '_blank', 'noopener,noreferrer')
    }
  }

  return createPortal(
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Connect Wallet"
    >
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Connect Wallet</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <p className={styles.modalSubtitle}>Choose your Solana wallet to get started</p>

        <div className={styles.walletSection}>
          <span className={styles.sectionLabel}>Recommended</span>
          <button
            className={cn(styles.walletBtn, styles.walletBtnFeatured)}
            onClick={handleSolflare}
          >
            {solflare ? (
              <img src={solflare.adapter.icon} alt="Solflare" className={styles.walletIcon} />
            ) : (
              <div className={styles.walletIconPlaceholder} />
            )}
            <span className={styles.walletName}>Solflare</span>
            {solflareInstalled
              ? <span className={styles.walletBadge}>Recommended</span>
              : <span className={styles.walletInstallHint}>Get it →</span>
            }
          </button>
        </div>

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

function WalletConnectInner() {
  const { connected, publicKey, connecting, disconnect, wallet, connect, select } = useWallet()
  const { connection } = useConnection()
  const [modalOpen, setModalOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [pendingConnect, setPendingConnect] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const address = publicKey?.toBase58() ?? null

  useEffect(() => {
    if (pendingConnect && wallet && !connected && !connecting) {
      setPendingConnect(false)
      connect().catch(err => console.error('[Wallet connect]', err))
    }
  }, [pendingConnect, wallet, connected, connecting, connect])

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    let cancelled = false
    connection.getBalance(publicKey)
      .then(lamports => { if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [publicKey, connection])

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

  useEffect(() => {
    if (!modalOpen) return
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [modalOpen])

  // Safe because walletReady=true only after chain config is loaded
  const cfg = getChainConfigSync()
  const networkLabel = cfg.network === 'mainnet-beta' ? 'Mainnet' : cfg.network.charAt(0).toUpperCase() + cfg.network.slice(1)
  const clusterParam = cfg.network === 'mainnet-beta' ? '' : `?cluster=${cfg.network}`
  const explorerUrl = address ? `https://solscan.io/account/${address}${clusterParam}` : '#'

  function handleWalletSelect(name: WalletName) {
    select(name)
    setModalOpen(false)
    setPendingConnect(true)
  }

  function handleCopy() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDisconnect() {
    disconnect()
    setDropdownOpen(false)
  }

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
        {modalOpen && (
          <WalletModal
            onSelect={handleWalletSelect}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        onClick={() => setDropdownOpen(v => !v)}
        className={cn(styles.addressBtn, dropdownOpen && styles.addressBtnActive)}
        aria-expanded={dropdownOpen}
      >
        <span className={styles.statusDot} aria-hidden />
        <span>{truncateAddress(address)}</span>
        <ChevronDown
          className={cn(styles.chevron, dropdownOpen && styles.chevronUp)}
          aria-hidden
        />
      </button>

      {dropdownOpen && (
        <div className={styles.dropdown} role="menu">

          {/* Identity: gradient avatar + address + copy/explorer + wallet name */}
          <div className={styles.dropdownIdentity}>
            <AddressAvatar address={address} />
            <div className={styles.identityInfo}>
              <div className={styles.identityAddressRow}>
                <span className={styles.addressText}>{truncateAddress(address)}</span>
                <div className={styles.dropdownActions}>
                  <button onClick={handleCopy} className={styles.actionBtn} title="Copy address">
                    {copied
                      ? <Check className={styles.copyIcon} aria-hidden />
                      : <Copy className={styles.copyIcon} aria-hidden />
                    }
                  </button>
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
              {wallet?.adapter && (
                <div className={styles.walletRow}>
                  <img src={wallet.adapter.icon} alt={wallet.adapter.name} className={styles.walletRowIcon} />
                  <span className={styles.walletRowName}>{wallet.adapter.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* SOL balance */}
          <div className={styles.balanceSection}>
            <span className={styles.sectionMeta}>Balance</span>
            <span className={styles.balanceSol}>
              {balance !== null ? (
                <>
                  {formatSol(balance)}
                  <img src="/svg/solana-sol-logo.svg" alt="SOL" className={styles.solIcon} />
                </>
              ) : '—'}
            </span>
          </div>

          <div className={styles.divider} />

          {/* Network */}
          <div className={styles.networkSection}>
            <span data-network={cfg.network} className={styles.networkPill}>● {networkLabel}</span>
            <span className={styles.sectionMeta}>Network</span>
          </div>

          <div className={styles.divider} />

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

export default function WalletConnect() {
  const walletReady = useContext(WalletReadyContext)

  if (!walletReady) return <Placeholder />

  return (
    <WalletErrorBoundary>
      <WalletConnectInner />
    </WalletErrorBoundary>
  )
}
