'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Minus, Plus, Clock, ChevronDown, Wallet, Loader2, ExternalLink } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { mapWalletErrorToMessage } from '@/lib/solana/errors'
import { getExplorerTxUrl } from '@/lib/solana/explorer'
import { getCurrentNetwork } from '@/lib/solana/config'
import { useNetworkCheck } from '@/hooks/useNetworkCheck'
import styles from './MintWidget.module.css'

/** SOL buffer for tx fee (lamports). ~0.01 SOL */
const FEE_BUFFER_LAMPORTS = 10_000_000

/**
 * MintWidget Component - The minting machine
 * Because minting NFTs is serious business (and we're not going to make it complicated)
 * (And this widget is like a vending machine, but for NFTs - just insert SOL and get art)
 *
 * Features:
 * - Quantity selector (because sometimes you want more than one)
 * - Price display (because transparency is key, unlike my dating life)
 * - Progress bar (because seeing progress is satisfying)
 * - Mint button placeholder (mint / wallet integration TBD)
 *
 * @author Juan - The developer who built this minting masterpiece
 * (Coded with care, humor, and probably too much coffee)
 */

/**
 * Phase option for selection - because users need choices
 */
export interface PhaseOption {
  stage: number
  name: string
  price: number
  maxPerWallet: number
  supply: number
  minted: number
  isEligible: boolean
  description?: string
}

interface MintWidgetProps {
  price: number
  maxPerWallet: number
  supply: number
  minted: number
  status: 'live' | 'upcoming' | 'ended'
  mintDate?: string // Formatted date string for display
  mintStart?: string // ISO date string for countdown calculation
  activePhasesCount?: number
  hasMultipleActivePhases?: boolean
  phases?: PhaseOption[] // All available phases for selection
  selectedPhaseStage?: number // Currently selected phase stage
  onPhaseChange?: (stage: number) => void // Callback when phase changes
}

/**
 * Countdown timer interface - because time is money (and we need to track it)
 */
interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

/**
 * Calculates time remaining until a target date
 * Because countdowns are exciting (and we want users to know exactly when they can mint)
 */
function useCountdown(targetDate: string | undefined): CountdownTime | null {
  const [timeLeft, setTimeLeft] = useState<CountdownTime | null>(null)

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null)
      return
    }

    const target = new Date(targetDate).getTime()

    const updateCountdown = () => {
      const now = new Date().getTime()
      const difference = target - now

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      })
    }

    // Update immediately
    updateCountdown()

    // Update every second (because countdowns need to be precise)
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

/**
 * Formats price to show proper decimals
 * Because 0.08 should look like 0.08, not 0.0800000 (we're not monsters)
 */
function formatPrice(price: number): string {
  if (price === 0) return '0'
  // If price is less than 1, show 2 decimals, otherwise show 1-2 decimals as needed
  if (price < 1) {
    return price.toFixed(2)
  }
  // For prices >= 1, remove trailing zeros
  return price.toFixed(2).replace(/\.?0+$/, '')
}

export function MintWidget({
  price,
  maxPerWallet,
  supply,
  minted,
  status,
  mintDate,
  mintStart,
  activePhasesCount = 1,
  hasMultipleActivePhases = false,
  phases = [],
  selectedPhaseStage,
  onPhaseChange,
}: MintWidgetProps) {
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const { isCorrectNetwork, isChecking: isNetworkChecking } = useNetworkCheck()
  const [quantity, setQuantity] = useState(1)
  const [showPhaseSelector, setShowPhaseSelector] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [lastTxSig, setLastTxSig] = useState<string | null>(null)
  const countdown = useCountdown(mintStart)

  // Balance check (debounced / when connected or quantity/price changes)
  useEffect(() => {
    if (!connected || !publicKey) {
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
  }, [connected, publicKey, connection])

  const handleMint = async () => {
    if (!connected || !publicKey) return
    setMintError(null)
    setLastTxSig(null)
    setIsMinting(true)
    try {
      // TODO: wire to actual mint instruction; set lastTxSig on success
      console.log('mint for', publicKey.toBase58(), quantity)
      // setLastTxSig(signature) when you have it
    } catch (e) {
      console.error('Mint failed:', e)
      setMintError(mapWalletErrorToMessage(e))
    } finally {
      setIsMinting(false)
    }
  }

  // Close phase selector when clicking outside
  useEffect(() => {
    if (!showPhaseSelector) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`.${styles.phaseSelectorContainer}`)) {
        setShowPhaseSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPhaseSelector])

  // Determine which phase to use - either selected or default to first phase
  const selectedPhase = phases.find(p => p.stage === selectedPhaseStage) || phases[0]
  const currentPrice = selectedPhase?.price ?? price
  const currentMaxPerWallet = selectedPhase?.maxPerWallet ?? maxPerWallet
  const currentSupply = selectedPhase?.supply ?? supply
  const currentMinted = selectedPhase?.minted ?? minted

  const remaining = currentSupply - currentMinted
  const mintProgress = currentSupply > 0 ? (currentMinted / currentSupply) * 100 : 0
  const totalPrice = currentPrice * quantity
  const totalLamports = Math.ceil(totalPrice * 1e9) + FEE_BUFFER_LAMPORTS
  const hasEnoughBalance = balanceLamports !== null && balanceLamports >= totalLamports
  const canMint = connected && isCorrectNetwork && hasEnoughBalance && !isMinting && remaining > 0

  const handlePhaseSelect = (stage: number) => {
    onPhaseChange?.(stage)
    setShowPhaseSelector(false)
    // Reset quantity when switching phases (might have different limits)
    setQuantity(1)
  }

  const incrementQuantity = () => {
    if (quantity < maxPerWallet && quantity < remaining) {
      setQuantity(quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.headerLabel}>
            {status === 'live'
              ? hasMultipleActivePhases
                ? `Multiple Phases Active (${activePhasesCount})`
                : 'Public Mint'
              : status === 'upcoming'
                ? 'Upcoming Mint'
                : 'Mint Ended'}
          </span>
          {status === 'live' && (
            <span className={styles.liveIndicator}>
              <span className={styles.liveDot}>
                <span className={styles.liveDotPing} />
                <span className={styles.liveDotSolid} />
              </span>
              {hasMultipleActivePhases ? `${activePhasesCount} Active` : 'Live Now'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Phase Selector - Show when multiple phases are active */}
        {hasMultipleActivePhases && phases.length > 0 && status === 'live' && (
          <div className={styles.phaseSelectorSection}>
            <div className={styles.phaseSelectorHeader}>
              <span className={styles.phaseSelectorLabel}>Mint Phase</span>
              {selectedPhase && (
                <span className={styles.phaseSelectorBadge}>
                  {selectedPhase.name}
                </span>
              )}
            </div>
            <div className={styles.phaseSelectorContainer}>
              <button
                type="button"
                onClick={() => setShowPhaseSelector(!showPhaseSelector)}
                className={styles.phaseSelectorButton}
              >
                <span className={styles.phaseSelectorButtonText}>
                  {selectedPhase ? `${selectedPhase.name} - ${formatPrice(selectedPhase.price)} SOL` : 'Select Phase'}
                </span>
                <ChevronDown className={cn(styles.phaseSelectorChevron, showPhaseSelector && styles.phaseSelectorChevronOpen)} />
              </button>
              {showPhaseSelector && (
                <div className={styles.phaseSelectorDropdown}>
                  {phases.map((phase) => (
                    <button
                      key={phase.stage}
                      type="button"
                      onClick={() => handlePhaseSelect(phase.stage)}
                      className={cn(
                        styles.phaseOption,
                        selectedPhaseStage === phase.stage && styles.phaseOptionSelected,
                        !phase.isEligible && styles.phaseOptionDisabled
                      )}
                      disabled={!phase.isEligible}
                    >
                      <div className={styles.phaseOptionHeader}>
                        <span className={styles.phaseOptionName}>{phase.name}</span>
                        <span className={styles.phaseOptionPrice}>{formatPrice(phase.price)} SOL</span>
                      </div>
                      {phase.description && (
                        <span className={styles.phaseOptionDescription}>{phase.description}</span>
                      )}
                      {!phase.isEligible && (
                        <span className={styles.phaseOptionNotEligible}>Not eligible</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price */}
        <div className={styles.priceSection}>
          <span className={styles.priceLabel}>Price</span>
          <div className={styles.priceValue}>
            <span className={styles.priceAmount}>{formatPrice(currentPrice)}</span>
            {currentPrice > 0 && (
              <Image
                src="/svg/solana-sol-logo.svg"
                alt="SOL"
                width={16}
                height={16}
                className={styles.priceSolanaIcon}
              />
            )}
          </div>
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Minted</span>
            <span className={styles.progressValue}>
              {currentMinted.toLocaleString()} / {currentSupply.toLocaleString()}
            </span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${Math.min(100, mintProgress)}%` }}
            />
          </div>
          <div className={styles.progressFooter}>
            <span>{mintProgress.toFixed(1)}% minted</span>
            <span>{remaining.toLocaleString()} remaining</span>
          </div>
        </div>

        {status === 'live' && (
          <>
            {/* Quantity Selector */}
            <div className={styles.quantitySection}>
              <div className={styles.quantityHeader}>
                <span className={styles.quantityLabel}>Quantity</span>
                <span className={styles.quantityMax}>Max {currentMaxPerWallet} per wallet</span>
              </div>
              <div className={styles.quantitySelector}>
                <div className={styles.quantityControls}>
                  <button
                    type="button"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className={styles.quantityButton}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button
                    type="button"
                    onClick={incrementQuantity}
                    disabled={quantity >= currentMaxPerWallet || quantity >= remaining}
                    className={styles.quantityButton}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total</span>
              <div className={styles.totalValue}>
                <span className={styles.totalAmount}>{formatPrice(totalPrice)}</span>
                {totalPrice > 0 && (
                  <Image
                    src="/svg/solana-sol-logo.svg"
                    alt="SOL"
                    width={16}
                    height={16}
                    className={styles.totalSolanaIcon}
                  />
                )}
              </div>
            </div>

            {mintError && (
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  color: '#fca5a5',
                  fontSize: 13,
                }}
              >
                {mintError}
              </div>
            )}
            {lastTxSig && (
              <a
                href={getExplorerTxUrl(lastTxSig, getCurrentNetwork())}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 12,
                  fontSize: 13,
                  color: '#00d4ff',
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View transaction
              </a>
            )}
            {!connected ? (
              <div className={styles.connectWalletPrompt}>
                <Wallet className={styles.connectWalletIcon} aria-hidden />
                <span>Please connect wallet</span>
              </div>
            ) : (
              <Button
                onClick={handleMint}
                disabled={!canMint}
                className={cn(styles.mintButton, !canMint && styles.mintButtonDisabled)}
              >
                {isMinting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Minting...
                  </>
                ) : !isCorrectNetwork && !isNetworkChecking ? (
                  'Wrong network'
                ) : connected && balanceLamports !== null && !hasEnoughBalance ? (
                  'Not enough SOL'
                ) : (
                  `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`
                )}
              </Button>
            )}
          </>
        )}

        {status === 'upcoming' && (
          <div className={styles.upcomingContainer}>
            {countdown && !countdown.isExpired ? (
              <>
                {/* Countdown Timer */}
                <div className={styles.countdownSection}>
                  <div className={styles.countdownHeader}>
                    <Clock className={styles.countdownIcon} />
                    <span className={styles.countdownLabel}>Mint starts in</span>
                  </div>
                  <div className={styles.countdownGrid}>
                    <div className={styles.countdownItem}>
                      <span className={styles.countdownValue}>{String(countdown.days).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>Days</span>
                    </div>
                    <div className={styles.countdownSeparator}>:</div>
                    <div className={styles.countdownItem}>
                      <span className={styles.countdownValue}>{String(countdown.hours).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>Hours</span>
                    </div>
                    <div className={styles.countdownSeparator}>:</div>
                    <div className={styles.countdownItem}>
                      <span className={styles.countdownValue}>{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>Minutes</span>
                    </div>
                    <div className={styles.countdownSeparator}>:</div>
                    <div className={styles.countdownItem}>
                      <span className={styles.countdownValue}>{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>Seconds</span>
                    </div>
                  </div>
                  {mintDate && (
                    <p className={styles.countdownDate}>
                      On <span className={styles.countdownDateValue}>{mintDate}</span>
                    </p>
                  )}
                </div>
                <button disabled className={styles.upcomingButton}>
                  Coming Soon
                </button>
              </>
            ) : (
              <>
                <div className={styles.upcomingNotice}>
                  <p className={styles.upcomingText}>
                    {mintDate ? (
                      <>Mint starts on <span className={styles.upcomingDate}>{mintDate}</span></>
                    ) : (
                      'Mint starting soon'
                    )}
                  </p>
                </div>
                <button disabled className={styles.upcomingButton}>
                  Coming Soon
                </button>
              </>
            )}
          </div>
        )}

        {status === 'ended' && (
          <div className={styles.endedContainer}>
            <div className={styles.endedNotice}>
              <p className={styles.endedText}>This mint has ended</p>
            </div>
            <button disabled className={styles.endedButton}>
              Sold Out
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerContent}>
          <span>Powered by Solana</span>
          <span className={styles.footerDivider} />
          <span>Fast & Low Fees</span>
        </div>
      </div>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Minting: making NFTs accessible since... always. 🎨
