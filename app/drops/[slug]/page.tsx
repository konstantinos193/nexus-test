'use client'

/**
 * Drop Detail Page – /drops/[slug]
 * The beautiful collection detail page that makes NFTs look good
 * Because every collection deserves a proper showcase (and we're not going to half-ass it)
 * 
 * Features:
 * - Beautiful banner with gradient colors (because flat colors are boring)
 * - Collection info with creator details (because creators matter)
 * - Stats grid (because numbers are fun)
 * - Mint widget (because minting is the whole point)
 * - Traits display (because rarity is everything)
 * - Social links (because community is key)
 * 
 * @author Juan - The developer who built this detail page
 * (Coded with care, humor, and probably too much coffee)
 */

import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  Users,
  Layers,
  Clock,
  Shield,
  Copy,
  Check,
  Lock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Pause,
  Info,
  Tag,
  Wallet,
  Calendar,
  Percent,
  FileText,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { MintWidget } from '@/components/mint-widget/MintWidget'
import AllowlistChecker from '@/components/allowlist/AllowlistChecker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import type { CollectionDetail, NFTCollection } from '@/types'
import { getBannerPalette, placeholderBannerUrl } from '@/lib/utils/placeholderBanners'
import { getMetadataStandardDisplayLabel } from '@/lib/metadata-standards'
import styles from './DropPage.module.css'

// Social icon components - because we need custom icons (and Lucide doesn't have everything)
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  )
}

/**
 * Maps internal CollectionStatus to display status
 * Because users think in "live/upcoming/ended" but we think in "minting/ready/completed"
 */
function getDisplayStatus(status: CollectionDetail['status']): 'live' | 'upcoming' | 'ended' {
  if (status === 'minting') return 'live'
  if (status === 'ready' || status === 'preparing') return 'upcoming'
  return 'ended'
}

/**
 * Formats wallet address for display
 * Because full addresses are too long (and we're not trying to break the layout)
 */
function formatAddress(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

/**
 * Extracts Twitter username from URL
 * Because URLs are messy, but usernames are clean
 */
function extractTwitterUsername(url?: string): string | undefined {
  if (!url) return undefined
  const match = url.match(/twitter\.com\/([^/?]+)/) || url.match(/x\.com\/([^/?]+)/)
  return match ? match[1] : undefined
}

/**
 * Extracts Discord server ID from URL
 * Because Discord URLs are weird, but we need the server ID
 */
function extractDiscordServer(url?: string): string | undefined {
  if (!url) return undefined
  const match = url.match(/discord\.(gg|com\/invite)\/([^/?]+)/)
  return match ? match[2] : undefined
}

/**
 * Determines if a collection is tradable (can be traded on secondary markets)
 * Because we only want to show royalties and fees for collections that can actually be traded
 * (Otherwise it's just confusing noise - like showing shipping costs for a digital product)
 */
function isCollectionTradable(collection: CollectionDetail): boolean {
  // If freezeTrading is not enabled, collection is tradable
  if (!collection.freezeTrading || !collection.freezeTrading.enabled) {
    return true
  }

  // If frozen until sold out, check if collection is sold out
  if (collection.freezeTrading.freezeUntilSoldOut) {
    return collection.minted >= collection.totalSupply
  }

  // If frozen until a specific date, check if that date has passed
  if (collection.freezeTrading.freezeUntilDate) {
    const freezeDate = new Date(collection.freezeTrading.freezeUntilDate)
    return new Date() >= freezeDate
  }

  // If enabled but no specific conditions, assume not tradable
  return false
}

/**
 * Mint Phase interface - because phases need structure
 * Because chaos is fun, but structured chaos is better
 * Now with more details because Magic Eden does it right (and we're copying them)
 */
interface MintPhase {
  name: string
  stage: number
  price: number
  maxPerWallet: number
  startDate: string
  endDate?: string
  isActive: boolean
  isEnded: boolean
  isEligible: boolean
  whitelistCount?: number
  minted?: number
  maxSupply?: number
  description?: string
}

/**
 * Generates mint phases based on collection data
 * Because we need to show users what phases are coming (or what they missed)
 * This creates realistic phases: Whitelist (if upcoming) -> Public
 * 
 * Logic:
 * - Upcoming: Shows both Whitelist and Public phases (both inactive)
 * - Live: Shows completed Whitelist (if applicable) and active Public phase
 * - Ended: Shows all phases as completed
 */
function generateMintPhases(
  collection: CollectionDetail,
  displayStatus: 'live' | 'upcoming' | 'ended',
  maxPerWallet: number
): MintPhase[] {
  const phases: MintPhase[] = []
  const basePrice = collection.price || 0
  
  // Handle mint start date - if not provided, create a future date for upcoming
  let mintStart: Date
  if (collection.mintStart) {
    mintStart = new Date(collection.mintStart)
  } else if (displayStatus === 'upcoming') {
    // For upcoming without a date, set it to 3 days from now
    mintStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  } else {
    // For live/ended without a date, use a past date
    mintStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
  
  const now = new Date()
  
  // ALL PHASES CAN RUN SIMULTANEOUSLY
  // Whitelist and Public phases start at the same time (mintStart)
  // This allows users to mint from either phase concurrently
  const whitelistStart = mintStart // Start at same time as public
  const whitelistEnd = undefined // No end date - runs until sold out or collection ends
  
  // Calculate public end date (7 days after start, or use collection endDate)
  let publicEnd: Date | undefined
  if (collection.endDate) {
    publicEnd = new Date(collection.endDate)
  } else {
    publicEnd = new Date(mintStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  }
  
  // Format date helper
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Calculate whitelist price (20% discount, ensure it's always different from public)
  let whitelistPrice = 0
  if (basePrice > 0) {
    const discounted = basePrice * 0.8
    // Round to 2 decimals, but ensure it's at least 0.01 less than base price
    whitelistPrice = Math.max(0.01, Math.min(discounted, basePrice - 0.01))
    // Round to 2 decimals
    whitelistPrice = Number(whitelistPrice.toFixed(2))
  }
  
  // Calculate whitelist max (60% of max, but ensure it's always different)
  // If maxPerWallet is 1, whitelist is also 1 (can't be less)
  // Otherwise, whitelist is 60% rounded down, but at least 1
  const whitelistMax = maxPerWallet <= 1 
    ? 1 
    : Math.max(1, Math.floor(maxPerWallet * 0.6))

  // Calculate whitelist supply (20% of total)
  const whitelistSupply = Math.floor(collection.totalSupply * 0.2)
  const publicSupply = collection.totalSupply - whitelistSupply

  // Check if phases are active - ALL phases can be active simultaneously
  // Both phases start at mintStart and run concurrently until collection ends
  const whitelistIsActive = whitelistStart <= now && (publicEnd ? publicEnd >= now : true)
  const publicIsActive = mintStart <= now && (publicEnd ? publicEnd >= now : true)
  
  if (displayStatus === 'upcoming') {
    // Upcoming: Show both Whitelist and Public phases
    // Both phases start at the same time (mintStart) and can run simultaneously
    phases.push({
      name: 'Whitelist',
      stage: 1,
      price: whitelistPrice,
      maxPerWallet: whitelistMax,
      startDate: formatDate(whitelistStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: whitelistIsActive,
      isEnded: false,
      isEligible: whitelistIsActive,
      whitelistCount: 20,
      minted: 0,
      maxSupply: whitelistSupply,
      description: 'Early access for whitelisted wallets - runs simultaneously with Public',
    })

    phases.push({
      name: 'Public',
      stage: 2,
      price: basePrice,
      maxPerWallet: maxPerWallet,
      startDate: formatDate(mintStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: publicIsActive,
      isEnded: false,
      isEligible: publicIsActive,
      minted: 0,
      maxSupply: publicSupply,
      description: 'Open to everyone - runs simultaneously with Whitelist',
    })
  } else if (displayStatus === 'live') {
    // Live: ALL phases run simultaneously!
    // Both Whitelist and Public are active at the same time
    // Users can choose which phase to mint from - both are available concurrently
    
    phases.push({
      name: 'Whitelist',
      stage: 1,
      price: whitelistPrice,
      maxPerWallet: whitelistMax,
      startDate: formatDate(whitelistStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: whitelistIsActive,
      isEnded: !whitelistIsActive && publicEnd ? publicEnd < now : false,
      isEligible: whitelistIsActive,
      whitelistCount: 20,
      minted: whitelistIsActive ? Math.floor(whitelistSupply * 0.3) : whitelistSupply,
      maxSupply: whitelistSupply,
      description: 'Early access for whitelisted wallets - runs simultaneously with Public',
    })

    phases.push({
      name: 'Public',
      stage: 2,
      price: basePrice,
      maxPerWallet: maxPerWallet,
      startDate: formatDate(mintStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: publicIsActive,
      isEnded: !publicIsActive && publicEnd ? publicEnd < now : false,
      isEligible: publicIsActive,
      minted: Math.max(0, collection.minted - (whitelistIsActive ? Math.floor(whitelistSupply * 0.3) : whitelistSupply)),
      maxSupply: publicSupply,
      description: 'Open to everyone - runs simultaneously with Whitelist',
    })
  } else {
    // Ended: Show all phases as completed
    phases.push({
      name: 'Whitelist',
      stage: 1,
      price: whitelistPrice,
      maxPerWallet: whitelistMax,
      startDate: formatDate(whitelistStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: false,
      isEnded: true,
      isEligible: false,
      whitelistCount: 20,
      minted: whitelistSupply,
      maxSupply: whitelistSupply,
      description: 'Early access for whitelisted wallets - ran simultaneously with Public',
    })

    phases.push({
      name: 'Public',
      stage: 2,
      price: basePrice,
      maxPerWallet: maxPerWallet,
      startDate: formatDate(mintStart),
      endDate: publicEnd ? formatDate(publicEnd) : undefined,
      isActive: false,
      isEnded: true,
      isEligible: false,
      minted: Math.max(0, collection.minted - whitelistSupply),
      maxSupply: publicSupply,
      description: 'Open to everyone - ran simultaneously with Whitelist',
    })
  }

  return phases
}

export default function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set())
  const [selectedPhaseStage, setSelectedPhaseStage] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('Missing slug')
      return
    }
    setLoading(true)
    setError(null)
    fetch(`/api/collections/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Collection not found')
          throw new Error(res.statusText || 'Failed to load collection')
        }
        return res.json()
      })
      .then((data: { success: boolean; data?: NFTCollection }) => {
        if (!data.success || !data.data) throw new Error('Invalid response')
        // Map NFTCollection to CollectionDetail
        // Convert traits from Trait[] to TraitSummary[] if needed
        const traits = data.data.traits
          ? data.data.traits.map((trait) => ({
              name: trait.name,
              count: 1, // Default count, could be enhanced with actual counts
            }))
          : undefined
        
        const collectionData: CollectionDetail = {
          ...data.data,
          slug: data.data.slug,
          traits,
        }
        setCollection(collectionData)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [slug])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(text)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  // Initialize selected phase to the best phase (lowest price) when phases are available
  // This hook MUST be called unconditionally (before any conditional returns)
  // React hooks must always be called in the same order on every render
  useEffect(() => {
    if (!collection) return
    
    const phases = generateMintPhases(collection, getDisplayStatus(collection.status), 10)
    const activePhases = phases.filter(p => p.isActive)
    
    if (activePhases.length > 0 && selectedPhaseStage === undefined) {
      const bestPhase = activePhases.reduce((best, current) => {
        if (current.price < best.price) return current
        if (current.price === best.price && current.maxPerWallet > best.maxPerWallet) return best
        return best
      }, activePhases[0])
      setSelectedPhaseStage(bestPhase.stage)
    }
  }, [collection, selectedPhaseStage])

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>Loading collection…</p>
        </div>
      </Layout>
    )
  }

  if (error || !collection) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>Collection Not Found</h1>
          <p className={styles.errorMessage}>
            {error ?? 'The collection you are looking for does not exist.'}
          </p>
          <Link href="/collections" className={styles.errorButton}>
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Back to Collections
            </Button>
          </Link>
        </div>
      </Layout>
    )
  }

  const displayStatus = getDisplayStatus(collection.status)
  const [bgColorHex, accentColorHex] = getBannerPalette(collection.id)
  const bgColor = `#${bgColorHex}`
  const accentColor = `#${accentColorHex}`
  
  // Banner image - use collection bannerUrl or fallback to placeholder
  const bannerImageUrl = collection.bannerUrl || placeholderBannerUrl(
    collection.id,
    collection.name,
    1200,
    400
  )

  // Format creator wallet address
  const creatorWallet = formatAddress(collection.creatorAddress)
  const creatorName = collection.creator || 'Unknown Creator'
  const creatorInitials = creatorName.slice(0, 2).toUpperCase()

  // Extract social usernames - because URLs are messy but we need clean links
  const twitterUsername = extractTwitterUsername(collection.twitterUrl)
  const discordServer = extractDiscordServer(collection.discordUrl)
  // Also check if URLs exist directly (for cases where extraction fails but URL is valid)
  const hasTwitter = twitterUsername || collection.twitterUrl
  const hasDiscord = discordServer || collection.discordUrl

  // Calculate max per wallet (default to 10 if not specified)
  const maxPerWallet = 10 // This should come from collection data in the future

  // Format mint date
  const mintDate = collection.mintStart
    ? new Date(collection.mintStart).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : undefined

  // Generate phases and find all active phases
  // Because phases can overlap (multiple phases active at the same time)
  // And we need to handle this state properly (because reality is messy)
  const phases = generateMintPhases(collection, displayStatus, maxPerWallet)
  const activePhases = phases.filter(p => p.isActive)
  const hasMultipleActivePhases = activePhases.length > 1

  // For stats/widget, prioritize the "best" phase (lowest price, highest limit)
  // Or if multiple active, aggregate the data
  const activePhase = activePhases.length > 0
    ? activePhases.reduce((best, current) => {
        // Prefer lower price, then higher limit
        if (current.price < best.price) return current
        if (current.price === best.price && current.maxPerWallet > best.maxPerWallet) return current
        return best
      }, activePhases[0])
    : phases.find(p => !p.isEnded && !p.isActive) // First upcoming phase
    || phases[phases.length - 1] // Last phase if all are ended

  return (
    <Layout>
      <main>
        {/* Banner */}
        <div className={styles.banner}>
          {/* Banner Image */}
          <img
            src={bannerImageUrl}
            alt={collection.name}
            className={styles.bannerImage}
            onError={(e) => {
              const target = e.currentTarget
              // Fallback to placeholder if banner fails to load
              if (!target.src.includes('/api/images/banner')) {
                target.src = placeholderBannerUrl(collection.id, collection.name, 1200, 400)
              }
            }}
          />
          
          {/* Gradient overlay for better text readability */}
          <div
            className={styles.bannerOverlay}
            style={{
              background: `linear-gradient(135deg, ${bgColor}40 0%, ${accentColor}40 100%)`,
            }}
          />
          
          {/* Decorative elements */}
          <div className={styles.bannerDecorative}>
            <div
              className={styles.bannerBlob1}
              style={{ backgroundColor: accentColor }}
            />
            <div
              className={styles.bannerBlob2}
              style={{ backgroundColor: accentColor }}
            />
          </div>

          {/* Back button */}
          <Link href="/collections" className={styles.bannerBackButton}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Content */}
        <div className={styles.contentContainer}>
          <div className={styles.contentGrid}>
            {/* Left Column - Collection Info */}
            <div className={styles.leftColumn}>
              {/* Collection PFP & Title Section - minimal style */}
              <div className={styles.titleSection}>
                <div className={styles.titleRow}>
                  <img
                    src={collection.imageUrl}
                    alt={collection.name}
                    className={styles.collectionPfp}
                    onError={(e) => {
                      const target = e.currentTarget
                      if (!target.src.includes('/api/images')) {
                        target.src = `/api/images/banner?id=${collection.id}&name=${encodeURIComponent(collection.name)}&w=200&h=200`
                      }
                    }}
                  />
                  <div className={styles.titleGroup}>
                    <div className={styles.titleRowWithBadge}>
                      <h1 className={styles.title}>{collection.name}</h1>
                      {/* Status badge removed - MintWidget header already shows status */}
                    </div>
                    <div className={styles.creatorInfo}>
                      <span className={styles.creatorName}>{creatorName}</span>
                      {collection.verified && <Shield className="h-3.5 w-3.5" style={{ color: '#00d4ff' }} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {collection.description && (
                <p className={styles.sectionContent}>{collection.description}</p>
              )}

              {/* Stats Grid - Phase-specific stats because phases have different prices/limits/supplies */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <Layers className="h-4 w-4" />
                    <span>Supply</span>
                  </div>
                  <p className={styles.statValue}>
                    {activePhase?.maxSupply ? activePhase.maxSupply.toLocaleString() : collection.totalSupply.toLocaleString()}
                  </p>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <Users className="h-4 w-4" />
                    <span>Minted</span>
                  </div>
                  <p className={styles.statValue}>
                    {activePhase?.minted !== undefined ? activePhase.minted.toLocaleString() : collection.minted.toLocaleString()}
                  </p>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <Clock className="h-4 w-4" />
                    <span>Price</span>
                  </div>
                  {(() => {
                    const price = activePhase?.price !== undefined 
                      ? activePhase.price 
                      : (collection.price || 0)
                    const displayPrice = price > 0 ? price.toFixed(price < 1 ? 2 : 1) : 'Free'
                    return (
                      <div className={styles.statValueWithIcon}>
                        <span className={styles.statValue}>{displayPrice}</span>
                        {price > 0 && (
                          <Image
                            src="/svg/solana-sol-logo.svg"
                            alt="SOL"
                            width={14}
                            height={14}
                            className={styles.statSolanaIcon}
                          />
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <Users className="h-4 w-4" />
                    <span>Max/Wallet</span>
                  </div>
                  <p className={styles.statValue}>
                    {activePhase?.maxPerWallet !== undefined ? activePhase.maxPerWallet : maxPerWallet}
                  </p>
                </div>
              </div>

              {/* Contract Address - minimal */}
              <div className={styles.contractContainer}>
                <code className={styles.contractAddress}>
                  {formatAddress(collection.creatorAddress)}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(collection.creatorAddress)}
                  className={styles.contractButton}
                >
                  {copiedAddress === collection.creatorAddress ? (
                    <Check className="h-4 w-4" style={{ color: '#10b981' }} />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={`https://solscan.io/account/${collection.creatorAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contractButton}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Collection Info - All the smart contract details */}
              <div className={styles.infoSection}>
                {/* Minting Status */}
                {collection.isPaused && (
                  <div className={styles.infoItem}>
                    <Pause className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Status:</span>
                    <Badge className="border-[#f59e0b]/30 bg-[#f59e0b]/20 px-2 py-1 text-xs text-[#f59e0b]">
                      Minting Paused
                    </Badge>
                  </div>
                )}

                {/* Metadata Standard */}
                {collection.metadataStandard && (
                  <div className={styles.infoItem}>
                    <FileText className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Standard:</span>
                    <Badge className="border-[#00d4ff]/30 bg-[#00d4ff]/20 px-2 py-1 text-xs text-[#00d4ff]">
                      {getMetadataStandardDisplayLabel(collection.metadataStandard)}
                    </Badge>
                  </div>
                )}

                {/* Trading Fees - Strategic grouping for tradable collections */}
                {isCollectionTradable(collection) && 
                 (collection.royaltyBasisPoints !== undefined || collection.platformFeeBasisPoints !== undefined) && (
                  <div className={styles.tradingFeesSection}>
                    <div className={styles.tradingFeesHeader}>
                      <Tag className={styles.tradingFeesIcon} />
                      <span className={styles.tradingFeesTitle}>Trading Fees</span>
                    </div>
                    <div className={styles.tradingFeesGrid}>
                      {collection.royaltyBasisPoints !== undefined && (
                        <div className={styles.tradingFeeCard}>
                          <div className={styles.tradingFeeLabel}>
                            <Percent className={styles.tradingFeeIcon} />
                            <span>Creator Royalty</span>
                          </div>
                          <div className={styles.tradingFeeValue}>
                            {(collection.royaltyBasisPoints / 100).toFixed(1)}%
                          </div>
                          <div className={styles.tradingFeeDescription}>
                            Paid to creator on secondary sales
                          </div>
                        </div>
                      )}
                      {collection.platformFeeBasisPoints !== undefined && (
                        <div className={styles.tradingFeeCard}>
                          <div className={styles.tradingFeeLabel}>
                            <Info className={styles.tradingFeeIcon} />
                            <span>Platform Fee</span>
                          </div>
                          <div className={styles.tradingFeeValue}>
                            {(collection.platformFeeBasisPoints / 100).toFixed(1)}%
                          </div>
                          <div className={styles.tradingFeeDescription}>
                            Platform fee on secondary sales
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Collection Symbol */}
                {collection.symbol && (
                  <div className={styles.infoItem}>
                    <Tag className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Symbol:</span>
                    <span className={styles.infoValue}>{collection.symbol}</span>
                  </div>
                )}

                {/* Exact Mint Times */}
                {collection.mintStart && (
                  <div className={styles.infoItem}>
                    <Calendar className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Mint Start:</span>
                    <span className={styles.infoValue}>
                      {new Date(collection.mintStart).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {collection.endDate && (
                  <div className={styles.infoItem}>
                    <Calendar className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Mint End:</span>
                    <span className={styles.infoValue}>
                      {new Date(collection.endDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {/* Collection Mint Address */}
                {collection.mintAddress && (
                  <div className={styles.infoItem}>
                    <Layers className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Mint Address:</span>
                    <div className={styles.infoAddressRow}>
                      <code className={styles.infoAddress}>{formatAddress(collection.mintAddress)}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(collection.mintAddress!)}
                        className={styles.infoCopyButton}
                      >
                        {copiedAddress === collection.mintAddress ? (
                          <Check className="h-3 w-3" style={{ color: '#10b981' }} />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <a
                        href={`https://solscan.io/account/${collection.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.infoCopyButton}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Treasury Address */}
                {collection.treasuryAddress && (
                  <div className={styles.infoItem}>
                    <Wallet className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Treasury:</span>
                    <div className={styles.infoAddressRow}>
                      <code className={styles.infoAddress}>{formatAddress(collection.treasuryAddress)}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(collection.treasuryAddress!)}
                        className={styles.infoCopyButton}
                      >
                        {copiedAddress === collection.treasuryAddress ? (
                          <Check className="h-3 w-3" style={{ color: '#10b981' }} />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <a
                        href={`https://solscan.io/account/${collection.treasuryAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.infoCopyButton}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* External URL */}
                {collection.externalUrl && (
                  <div className={styles.infoItem}>
                    <Globe className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Website:</span>
                    <a
                      href={collection.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoLink}
                    >
                      {collection.externalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Category */}
                {collection.category && (
                  <div className={styles.infoItem}>
                    <Tag className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Category:</span>
                    <span className={styles.infoValue}>{collection.category}</span>
                  </div>
                )}

                {/* Multiple Creators */}
                {collection.creators && collection.creators.length > 1 && (
                  <div className={styles.infoItem}>
                    <Users className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Creators:</span>
                    <div className={styles.creatorsList}>
                      {collection.creators.map((creator, idx) => (
                        <div key={idx} className={styles.creatorItem}>
                          <code className={styles.infoAddress}>{formatAddress(creator.address)}</code>
                          <span className={styles.creatorShare}>{creator.share}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User's Minted Count */}
                {collection.userMintedCount !== undefined && (
                  <div className={styles.infoItem}>
                    <Users className={styles.infoIcon} />
                    <span className={styles.infoLabel}>You've Minted:</span>
                    <span className={styles.infoValue}>{collection.userMintedCount}</span>
                  </div>
                )}

                {/* Freeze Trading */}
                {collection.freezeTrading?.enabled && (
                  <div className={styles.infoItem}>
                    <Lock className={styles.infoIcon} />
                    <span className={styles.infoLabel}>Trading:</span>
                    <div className={styles.freezeInfo}>
                      {collection.freezeTrading.freezeUntilSoldOut ? (
                        <Badge className="border-[#f59e0b]/30 bg-[#f59e0b]/20 px-2 py-1 text-xs text-[#f59e0b]">
                          Frozen Until Sold Out
                        </Badge>
                      ) : collection.freezeTrading.freezeUntilDate ? (
                        <div className={styles.freezeDetails}>
                          <Badge className="border-[#f59e0b]/30 bg-[#f59e0b]/20 px-2 py-1 text-xs text-[#f59e0b]">
                            Frozen Until
                          </Badge>
                          <span className={styles.freezeDate}>
                            {new Date(collection.freezeTrading.freezeUntilDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      ) : (
                        <Badge className="border-[#f59e0b]/30 bg-[#f59e0b]/20 px-2 py-1 text-xs text-[#f59e0b]">
                          Trading Frozen
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Traits - minimal */}
              {collection.traits && collection.traits.length > 0 && (
                <div className={styles.traitsContainer}>
                  {collection.traits.map((trait) => (
                    <div key={trait.name} className={styles.traitCard}>
                      <span className={styles.traitName}>{trait.name}</span>
                    </div>
                  ))}
                </div>
              )}


              {/* Social Links - minimal icon-only style */}
              {(hasTwitter || hasDiscord || collection.secondaryMarketUrl) && (
                <div className={styles.socialLinksContainer}>
                  {hasTwitter && (
                    <a
                      href={twitterUsername ? `https://twitter.com/${twitterUsername}` : collection.twitterUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLinkIcon}
                      aria-label={`Follow ${collection.name} on Twitter`}
                    >
                      <TwitterIcon className="h-4 w-4" />
                    </a>
                  )}
                  {hasDiscord && (
                    <a
                      href={discordServer ? `https://discord.gg/${discordServer}` : collection.discordUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLinkIcon}
                      aria-label={`Join ${collection.name} Discord`}
                    >
                      <DiscordIcon className="h-4 w-4" />
                    </a>
                  )}
                  {collection.secondaryMarketUrl && (
                    <a
                      href={collection.secondaryMarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLinkIcon}
                      aria-label={`View ${collection.name} on secondary market`}
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Mint Widget & Phases */}
            <div className={styles.rightColumn}>
              {/* Allowlist Checker - Show if collection has allowlist */}
              {collection.allowlistMerkleRoot && (
                <AllowlistChecker
                  walletAddress={null} // TODO: Get from wallet connection
                  merkleRoot={collection.allowlistMerkleRoot}
                  allowlist={collection.allowlist || []}
                  collectionSlug={collection.slug}
                  onProofGenerated={(proof, leafIndex) => {
                    // Store proof for use in minting
                    console.log('Proof generated:', { proof, leafIndex })
                    // TODO: Store in state/context for mint function
                  }}
                />
              )}
              
              <MintWidget
                price={activePhase?.price !== undefined ? activePhase.price : (collection.price || 0)}
                maxPerWallet={activePhase?.maxPerWallet !== undefined ? activePhase.maxPerWallet : maxPerWallet}
                supply={activePhase?.maxSupply !== undefined ? activePhase.maxSupply : collection.totalSupply}
                minted={activePhase?.minted !== undefined ? activePhase.minted : collection.minted}
                status={displayStatus}
                mintDate={mintDate}
                mintStart={collection.mintStart}
                activePhasesCount={activePhases.length}
                hasMultipleActivePhases={hasMultipleActivePhases}
                phases={activePhases.map(p => ({
                  stage: p.stage,
                  name: p.name,
                  price: p.price,
                  maxPerWallet: p.maxPerWallet,
                  supply: p.maxSupply ?? 0,
                  minted: p.minted ?? 0,
                  isEligible: p.isEligible,
                  description: p.description,
                }))}
                selectedPhaseStage={selectedPhaseStage ?? activePhases[0]?.stage}
                onPhaseChange={setSelectedPhaseStage}
              />

              {/* Mint Phases - Magic Eden style */}
              <div className={styles.mintPhasesSection}>
                <div className={styles.mintPhasesHeader}>
                  <h3 className={styles.mintPhasesTitle}>Mint Phases</h3>
                  {hasMultipleActivePhases && (
                    <Badge className="border-[#10b981]/30 bg-[#10b981]/20 px-2 py-1 text-xs text-[#10b981]">
                      {activePhases.length} Active
                    </Badge>
                  )}
                </div>
                <div className={styles.mintPhasesList}>
                  {phases.map((phase) => {
                    const isExpanded = expandedPhases.has(phase.stage)
                    const progress = phase.maxSupply && phase.maxSupply > 0 
                      ? (phase.minted || 0) / phase.maxSupply * 100 
                      : 0
                    
                    const panelClasses = [
                      styles.mintPhasePanel,
                      phase.isActive && styles.mintPhasePanelActive,
                      phase.isEnded && styles.mintPhasePanelEnded,
                    ]
                      .filter(Boolean)
                      .join(' ')
                    
                    return (
                      <div
                        key={phase.stage}
                        className={panelClasses}
                      >
                        {/* Phase Header */}
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedPhases)
                            if (isExpanded) {
                              newExpanded.delete(phase.stage)
                            } else {
                              newExpanded.add(phase.stage)
                            }
                            setExpandedPhases(newExpanded)
                          }}
                          className={styles.mintPhaseHeader}
                        >
                          <div className={styles.mintPhaseHeaderLeft}>
                            {!phase.isEligible && !phase.isEnded && (
                              <Lock className={styles.mintPhaseLockIcon} />
                            )}
                            <span className={styles.mintPhaseStage}>Stage {phase.stage}</span>
                            <HelpCircle className={styles.mintPhaseHelpIcon} />
                          </div>
                          <div className={styles.mintPhaseHeaderRight}>
                            {phase.isEnded && (
                              <span className={styles.mintPhaseStatusEnded}>ENDED</span>
                            )}
                            {phase.isActive && (
                              <span className={styles.mintPhaseStatusActive}>
                                <span className={styles.mintPhaseActiveDot}>
                                  <span className={styles.mintPhaseActiveDotPing} />
                                  <span className={styles.mintPhaseActiveDotSolid} />
                                </span>
                                {phase.name || `Stage ${phase.stage}`}
                              </span>
                            )}
                            {!phase.isActive && !phase.isEnded && phase.endDate && (
                              <span className={styles.mintPhaseStatusUpcoming}>
                                {(() => {
                                  // Format: "Jan 29, 2026" -> "ENDS JAN 29"
                                  const dateParts = phase.endDate.split(' ')
                                  if (dateParts.length >= 2) {
                                    const month = dateParts[0].toUpperCase()
                                    const day = dateParts[1].replace(',', '')
                                    return `ENDS ${month} ${day}`
                                  }
                                  return `ENDS ${phase.endDate.toUpperCase()}`
                                })()}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className={styles.mintPhaseChevron} />
                            ) : (
                              <ChevronDown className={styles.mintPhaseChevron} />
                            )}
                          </div>
                        </button>

                        {/* Phase Content (Expandable) */}
                        {isExpanded && (
                          <div className={styles.mintPhaseContent}>
                            {phase.whitelistCount && (
                              <div className={styles.mintPhaseDetail}>
                                <span className={styles.mintPhaseDetailLabel}>Whitelist:</span>
                                <span className={styles.mintPhaseDetailValue}>{phase.whitelistCount}</span>
                              </div>
                            )}
                            <div className={styles.mintPhaseDetail}>
                              <span className={styles.mintPhaseDetailLabel}>Price:</span>
                              <div className={styles.mintPhaseDetailValueWithIcon}>
                                <span className={styles.mintPhaseDetailValue}>
                                  {phase.price > 0 
                                    ? (phase.price < 1 
                                        ? phase.price.toFixed(2) 
                                        : phase.price.toFixed(2).replace(/\.?0+$/, ''))
                                    : 'Free'}
                                </span>
                                {phase.price > 0 && (
                                  <Image
                                    src="/svg/solana-sol-logo.svg"
                                    alt="SOL"
                                    width={14}
                                    height={14}
                                    className={styles.mintPhaseSolanaIcon}
                                  />
                                )}
                              </div>
                            </div>
                            <div className={styles.mintPhaseDetail}>
                              <span className={styles.mintPhaseDetailLabel}>Minted:</span>
                              <span className={styles.mintPhaseDetailValue}>
                                {phase.minted || 0}
                              </span>
                            </div>
                            {phase.maxSupply && (
                              <>
                                <div className={styles.mintPhaseProgressContainer}>
                                  <div className={styles.mintPhaseProgressBar}>
                                    <div
                                      className={styles.mintPhaseProgressFill}
                                      style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className={styles.mintPhaseProgressText}>
                                  {progress.toFixed(1)}% ({phase.minted || 0}/{phase.maxSupply})
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  )
}

// Coded by Juan - because every good page needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Collection details: making NFTs look good since... always. 🎨
