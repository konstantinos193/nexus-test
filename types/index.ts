/**
 * Type definitions for the NFT Launchpad platform
 * The bouncer at the door: wrong types don't get in.
 * Collections, users, API responses, filters – all the shapes we need.
 *
 * @author Juan - The developer who typed this place
 * (Coded with care, humor, and probably too much coffee)
 */

/* ============================================
   Collection types
   ============================================ */

/** Main collection shape – hero, grid, cards, detail page. */
export interface NFTCollection {
  id: string
  /** URL-safe slug for /drops/[slug]. Fall back to id when missing (e.g. mock data). */
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
  traits?: Trait[]
  createdAt: string
  updatedAt: string
  /** Optional mint end date for "Ending Soon" discover tab */
  endDate?: string
}

/** Solana only – we're a Solana NFT launchpad. No chain confusion here. */
export type Blockchain = 'solana'

/**
 * Metadata Standard – the complete reality map.
 * All NFT/digital asset standards on Solana we actually encounter.
 * Legacy, pNFT, Core, cNFT, Token-2022, etc. Future-proof enum.
 */
export type MetadataStandard =
  | 'Legacy'
  | 'Programmable'
  | 'Core'
  | 'Compressed'
  | 'SemiFungible'
  | 'Token2022'
  | 'NativeMetadata'
  | 'Custom'

/** Collection status – because not everything is ready to launch (unlike my career). */
export type CollectionStatus =
  | 'draft'
  | 'preparing'
  | 'ready'
  | 'minting'
  | 'completed'
  | 'paused'

/** Trait: name + value + optional rarity. Rarity is everything (just ask my dating life). */
export interface Trait {
  name: string
  value: string
  rarity?: number
}

/** Detail-page traits: name + count (e.g. Background (12)). */
export interface TraitSummary {
  name: string
  count: number
}

/** Activity feed item: mint / list / sale. Who did what, when, for how much. */
export interface ActivityItem {
  type: 'minted' | 'listed' | 'sold'
  tokenId: string
  user: string
  when: string
  price?: number
}

/**
 * Extended collection data for /collections detail page (wireframe).
 * Floor, volume, utility, roadmap, gallery, activity – the full show.
 */
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
  floorPrice?: number
  volume?: number
  owners?: number
  utility?: string[]
  roadmap?: string[]
  traits?: TraitSummary[]
  galleryItems?: { id: string; imageUrl: string }[]
  activity?: ActivityItem[]
  mintStart?: string
  endDate?: string
  discordUrl?: string
  twitterUrl?: string
  secondaryMarketUrl?: string
  isPaused?: boolean
  metadataStandard?: MetadataStandard
  royaltyBasisPoints?: number
  platformFeeBasisPoints?: number
  symbol?: string
  mintAddress?: string
  treasuryAddress?: string
  externalUrl?: string
  category?: string
  creators?: Array<{ address: string; share: number }>
  userMintedCount?: number
  freezeTrading?: {
    enabled: boolean
    freezeUntilDate?: string
    freezeUntilSoldOut?: boolean
  }
  allowlistMerkleRoot?: string | null
  allowlist?: string[]
}

/* ============================================
   User & wallet
   ============================================ */

/** User – who's creating chaos. Wallet, username, avatar, collection IDs. */
export interface User {
  id: string
  walletAddress: string
  username?: string
  avatar?: string
  collections: string[]
  createdAt: string
}

/** Collection filters state – shared by filters UI and useCollectionFilters. */
export interface FilterState {
  status?: CollectionStatus
  search?: string
  sortBy?: 'newest' | 'oldest' | 'name' | 'minted'
}

/** Wallet connection – Web3 is just fancy authentication. */
export interface WalletConnection {
  address: string
  chainId: number
  isConnected: boolean
  provider?: unknown
}

/* ============================================
   API
   ============================================ */

/** API response wrapper – because APIs love to wrap things in unnecessary layers. */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// P.S. - Types. We have them. So does the bouncer.
