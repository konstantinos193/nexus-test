/**
 * Type definitions for the NFT Launchpad platform
 * Because TypeScript is like a bouncer for your code - it won't let the wrong types in
 */

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
  status: CollectionStatus
  traits?: Trait[]
  createdAt: string
  updatedAt: string
  /** Optional mint end date for "Ending Soon" discover tab */
  endDate?: string
}

// Solana only – we're a Solana NFT launchpad
export type Blockchain = 'solana'

/**
 * Metadata Standard - The Complete Reality Map
 * All NFT/digital asset standards on Solana that developers actually encounter today
 * 
 * This is the future-proof enum that matches reality - because we're coding during a transition era.
 * Migration path: Legacy → pNFT → Core → Token-2022 Native Assets
 */
export type MetadataStandard =
  | 'Legacy'           // 0 - Metaplex Legacy NFT (Token Metadata) - Universal support, expensive
  | 'Programmable'     // 1 - Programmable NFT (pNFT) - Enforced royalties, rule sets
  | 'Core'             // 2 - Metaplex Core (DAS) - Cheaper, future-proof
  | 'Compressed'       // 3 - Compressed NFT (cNFT) - Dirt cheap, millions possible
  | 'SemiFungible'     // 4 - Semi-Fungible Token (SFT) - NFT metadata + fungible supply
  | 'Token2022'        // 5 - Token-2022 NFTs - Transfer hooks, native royalties
  | 'NativeMetadata'   // 6 - SPL Token Extensions Metadata - No Metaplex dependency
  | 'Custom'           // 7 - Custom/Private Standards - WNS, spNFT, SPL-404, etc.

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
  /** Smart contract fields */
  /** Whether minting is currently paused */
  isPaused?: boolean
  /** Metadata standard: All Solana NFT/digital asset standards */
  metadataStandard?: MetadataStandard
  /** Royalty percentage (seller fee basis points, e.g., 500 = 5%) */
  royaltyBasisPoints?: number
  /** Platform fee percentage (basis points, e.g., 500 = 5%) */
  platformFeeBasisPoints?: number
  /** Collection symbol/ticker */
  symbol?: string
  /** Collection mint address (the actual NFT mint) */
  mintAddress?: string
  /** Treasury address (where creator receives payments) */
  treasuryAddress?: string
  /** External website URL */
  externalUrl?: string
  /** Collection category */
  category?: string
  /** Multiple creators with their shares */
  creators?: Array<{ address: string; share: number }>
  /** User's minted count (if wallet connected) */
  userMintedCount?: number
  /** Freeze trading settings */
  freezeTrading?: {
    enabled: boolean
    /** Freeze until this date (if provided) */
    freezeUntilDate?: string
    /** Freeze until sold out (if true, ignore freezeUntilDate) */
    freezeUntilSoldOut?: boolean
  }
  /** Allowlist Merkle root (null = public mint, string = allowlist required) */
  allowlistMerkleRoot?: string | null
  /** Full allowlist array (for proof generation on frontend) */
  allowlist?: string[]
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
  provider?: any
}

// API Response wrapper - because APIs love to wrap things in unnecessary layers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
