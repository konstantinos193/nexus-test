/**
 * Type definitions for the NFT Launchpad platform
 * Because TypeScript is like a bouncer for your code - it won't let the wrong types in
 */

// Mint phase - allowlist or public, with optional price/wallet overrides
export interface MintPhase {
  name: string
  phaseType: 'public' | 'allowlist'
  startDateTime: string
  endDateTime?: string
  priceOverride?: string
  maxPerWallet?: string
}

// Fund split receiver - address + percentage share
export interface FundReceiver {
  share: string
  address: string
}

// Collection types - because we need to know what we're dealing with
export interface NFTCollection {
  id: string
  /** URL-safe identifier for /drops/[slug]. Fall back to id when missing (e.g. mock data). */
  slug?: string
  name: string
  description: string
  imageUrl: string
  bannerUrl?: string
  creator: string
  creatorAddress: string
  blockchain: Blockchain
  totalSupply: number
  minted: number
  price?: number
  /** Base mint price (SOL) — never a phase override. */
  mintPrice?: number
  /** All-in price per NFT (SOL) incl. additive platform fee. Computed server-side; grid cards display this. */
  buyerPrice?: number
  status: CollectionStatus
  traits?: Trait[]
  createdAt: string
  updatedAt: string
  /** Optional mint end date for "Ending Soon" discover tab */
  endDate?: string
  phases?: MintPhase[]
  fundReceivers?: FundReceiver[]
  mintAddress?: string
  royaltyBasisPoints?: number
  platformFeeBasisPoints?: number
  ipfsHash?: string
  mintStart?: string
  effectiveStatus?: CollectionStatus
  twitterUrl?: string
  discordUrl?: string
  websiteUrl?: string
}

// Solana only – we're a Solana NFT launchpad
export type Blockchain = 'solana'

// Collection status - because not everything is ready to launch (unlike my career)
export type CollectionStatus = 
  | 'draft' 
  | 'preparing' 
  | 'ready' 
  | 'minting' 
  | 'completed' 
  | 'paused'

// Trait system - because rarity is everything (just ask my dating life)
export interface Trait {
  name: string
  value: string
  rarity?: number
}

/** Detail-page traits: name + count (e.g. Background (12)) */
export interface TraitSummary {
  name: string
  count: number
}

/** Activity feed item: mint / list / sale */
export interface ActivityItem {
  type: 'minted' | 'listed' | 'sold'
  /** e.g. "#1423", "#982" */
  tokenId: string
  /** User or "—" */
  user: string
  /** Relative time, e.g. "2 mins ago" */
  when: string
  /** SOL amount if listed/sold */
  price?: number
}

/** Extended collection data for /collections detail page (wireframe) */
export interface CollectionDetail {
  id: string
  slug?: string
  name: string
  description: string
  imageUrl: string
  bannerUrl?: string
  creator: string
  creatorAddress: string
  blockchain: Blockchain
  totalSupply: number
  minted: number
  price?: number
  status: CollectionStatus
  verified?: boolean
  /** Floor, volume, owners, items */
  floorPrice?: number
  volume?: number
  owners?: number
  /** Utility bullets */
  utility?: string[]
  /** Roadmap phases, e.g. ["Phase 1", "Phase 2"] */
  roadmap?: string[]
  /** Trait name + count for rarity breakdown */
  traits?: TraitSummary[]
  /** Gallery: token id -> image url */
  galleryItems?: { id: string; imageUrl: string }[]
  /** Recent activity */
  activity?: ActivityItem[]
  /** Mint start (for countdown) */
  mintStart?: string
  /** Mint end */
  endDate?: string
  discordUrl?: string
  twitterUrl?: string
  secondaryMarketUrl?: string
  websiteUrl?: string
  phases?: MintPhase[]
  fundReceivers?: FundReceiver[]
  mintAddress?: string
  royaltyBasisPoints?: number
  platformFeeBasisPoints?: number
  ipfsHash?: string
}

// User types - because we need to know who's creating chaos
export interface User {
  id: string
  walletAddress: string
  username?: string
  avatar?: string
  collections: string[] // Collection IDs
  createdAt: string
}

// Collection filters state - shared by filters UI and useCollectionFilters
export interface FilterState {
  status?: CollectionStatus
  search?: string
  sortBy?: 'newest' | 'oldest' | 'name' | 'minted'
}

// Wallet connection - because Web3 is just fancy authentication
export interface WalletConnection {
  address: string
  chainId: number
  isConnected: boolean
  provider?: unknown
}

// API Response wrapper - because APIs love to wrap things in unnecessary layers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
