/**
 * Metadata Standards Utilities - The Complete Reality Map
 * 
 * Helper functions for working with all Solana NFT/digital asset standards.
 * Because enums are great, but helper functions make them actually useful.
 * 
 * This matches the Rust MetadataStandard enum in nexus-launchpad/src/lib.rs
 * (Because consistency is key, and we're not about to let TypeScript and Rust drift apart)
 */

import type { MetadataStandard } from '@/types'

/**
 * Metadata standard information - because developers need to know what they're working with
 * (And because documentation is nice, but code is better)
 */
export interface MetadataStandardInfo {
  /** Human-readable name */
  name: string
  /** Program ID (if applicable) */
  programId?: string
  /** Whether this standard requires SPL Token mint */
  requiresSplTokenMint: boolean
  /** Whether this standard supports enforced royalties */
  supportsEnforcedRoyalties: boolean
  /** Estimated on-chain cost in lamports */
  estimatedCostLamports: number
  /** Whether this standard is widely supported by marketplaces */
  isMarketplaceSupported: boolean
  /** Description of the standard */
  description: string
}

/**
 * Convert numeric value to MetadataStandard (with validation)
 * Returns undefined if the value is invalid
 * (Because invalid enum values are like invalid pizza toppings - they shouldn't exist)
 */
export function metadataStandardFromNumber(value: number): MetadataStandard | undefined {
  const mapping: Record<number, MetadataStandard> = {
    0: 'Legacy',
    1: 'Programmable',
    2: 'Core',
    3: 'Compressed',
    4: 'SemiFungible',
    5: 'Token2022',
    6: 'NativeMetadata',
    7: 'Custom',
  }
  return mapping[value]
}

/**
 * Convert MetadataStandard to numeric value
 * (Because sometimes you need the number, not the string)
 */
export function metadataStandardToNumber(standard: MetadataStandard): number {
  const mapping: Record<MetadataStandard, number> = {
    Legacy: 0,
    Programmable: 1,
    Core: 2,
    Compressed: 3,
    SemiFungible: 4,
    Token2022: 5,
    NativeMetadata: 6,
    Custom: 7,
  }
  return mapping[standard]
}

/**
 * Get detailed information about a metadata standard
 * (Because developers need to know what they're working with)
 */
export function getMetadataStandardInfo(standard: MetadataStandard): MetadataStandardInfo {
  const info: Record<MetadataStandard, MetadataStandardInfo> = {
    Legacy: {
      name: 'Legacy NFT',
      programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      requiresSplTokenMint: true,
      supportsEnforcedRoyalties: false,
      estimatedCostLamports: 21_000_000, // ~0.021 SOL
      isMarketplaceSupported: true,
      description: 'Metaplex Legacy NFT (Token Metadata) - Universal support, tooling everywhere. Uses SPL Token (mint = 1, decimals = 0). External JSON metadata, royalties optional, high rent cost.',
    },
    Programmable: {
      name: 'Programmable NFT (pNFT)',
      programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Same as Legacy (it's an extension)
      requiresSplTokenMint: true,
      supportsEnforcedRoyalties: true,
      estimatedCostLamports: 21_000_000, // Same as Legacy + rule set costs
      isMarketplaceSupported: true,
      description: 'Programmable NFT (pNFT) - Built on Token Metadata program, adds rule sets. Enforced royalties, transfer restrictions, staking locks, gating logic. Used by games, royalty-sensitive projects, utility NFTs.',
    },
    Core: {
      name: 'Metaplex Core (DAS)',
      programId: 'ProgramCMaTZjS6R2t6Umy1PLsigY9XUYqN8TDLzZg', // DAS API program
      requiresSplTokenMint: false,
      supportsEnforcedRoyalties: true,
      estimatedCostLamports: 8_000_000, // ~0.008 SOL
      isMarketplaceSupported: false, // Still catching up
      description: 'Metaplex Core (Digital Asset Standard) - New Metaplex protocol, no SPL token mint required. Lower account count, lower rent, designed to replace legacy NFTs long-term. Much cheaper, cleaner account model, better composability.',
    },
    Compressed: {
      name: 'Compressed NFT (cNFT)',
      programId: 'BGUMAp9Gq7iTEuizy4pqaxsTyUC1WX3zRfhT4eRGrU2e', // Bubblegum program
      requiresSplTokenMint: false,
      supportsEnforcedRoyalties: false,
      estimatedCostLamports: 5_000_000, // ~0.005 SOL (dirt cheap)
      isMarketplaceSupported: false, // Limited support
      description: 'Compressed NFT (cNFT) - Stored in Merkle Trees, uses state compression. Off-chain proof verification, extremely cheap. Millions of NFTs possible, dirt cheap minting. Limited programmability, harder UX, no native token ownership.',
    },
    SemiFungible: {
      name: 'Semi-Fungible Token (SFT)',
      programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', // Uses Token Metadata
      requiresSplTokenMint: true,
      supportsEnforcedRoyalties: false,
      estimatedCostLamports: 21_000_000, // Similar to Legacy
      isMarketplaceSupported: true, // Uses Legacy metadata
      description: 'Semi-Fungible Token (SFT) - TokenStandard::SemiFungible, supply > 1. NFT-style metadata with fungible supply. Used for game items, tickets, badges, packs. Basically NFT metadata + fungible supply.',
    },
    Token2022: {
      name: 'Token-2022 NFT',
      programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022 program
      requiresSplTokenMint: true,
      supportsEnforcedRoyalties: true, // Native royalties (in progress)
      estimatedCostLamports: 15_000_000, // Variable, estimate
      isMarketplaceSupported: false, // New, limited support
      description: 'Token-2022 NFTs - NFTs built using spl-token-2022 instead of legacy SPL Token. Features: Transfer hooks, confidential transfers, native royalties (in progress), metadata extensions. This is where Solana core devs are pushing long-term.',
    },
    NativeMetadata: {
      name: 'SPL Token Extensions Metadata',
      programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022 with extensions
      requiresSplTokenMint: true,
      supportsEnforcedRoyalties: true, // Via extensions
      estimatedCostLamports: 10_000_000, // Variable, estimate
      isMarketplaceSupported: false, // Very new
      description: 'SPL Token Extensions Metadata - Native SPL token metadata, no Metaplex dependency. Stored directly in token account. Supports: Name, Symbol, URI, Custom fields. Used by people trying to move away from Metaplex monopoly.',
    },
    Custom: {
      name: 'Custom/Private Standard',
      programId: undefined, // Unknown - because custom means custom
      requiresSplTokenMint: true, // Assume yes (better safe than sorry)
      supportsEnforcedRoyalties: false, // Unknown - assume no
      estimatedCostLamports: 25_000_000, // Unknown, assume higher
      isMarketplaceSupported: false, // Unknown
      description: 'Custom/Private Standards - Custom metadata programs, custom NFT logic, custom asset registries. Non-standard private implementations (WNS, spNFT, SPL-404, Nifty, etc.). Think of it as the "escape hatch" for experimental standards.',
    },
  }
  
  return info[standard]
}

/**
 * Launchpad-supported standards only (programs/ contracts).
 * List only: Metaplex Core, CFT (Compressed), Legacy.
 */
export const LAUNCHPAD_METADATA_STANDARDS: MetadataStandard[] = ['Core', 'Compressed', 'Legacy']

/** Display names for launchpad standards (Metaplex Core, CFT, Legacy). */
export const LAUNCHPAD_STANDARD_LABELS: Record<MetadataStandard, string> = {
  Legacy: 'Legacy',
  Programmable: 'Programmable',
  Core: 'Metaplex Core',
  Compressed: 'CFT',
  SemiFungible: 'SemiFungible',
  Token2022: 'Token2022',
  NativeMetadata: 'NativeMetadata',
  Custom: 'Custom',
}

/** Generic display labels only (no third‑party names). Use for create flow, drops, etc. */
const DISPLAY_LABELS: Record<string, string> = {
  Core: 'Standard (DAS)',
  Metaplex: 'Legacy',
  CNFT: 'Compressed',
  Legacy: 'Legacy',
  Compressed: 'Compressed',
}

export function getMetadataStandardDisplayLabel(value: string | undefined): string {
  if (!value) return ''
  return DISPLAY_LABELS[value] ?? value
}

/**
 * Get launchpad-supported metadata standards only (Core, CFT, Legacy).
 * Use this for any UI that lists standards; contracts support only these three.
 */
export function getLaunchpadMetadataStandards(): MetadataStandard[] {
  return [...LAUNCHPAD_METADATA_STANDARDS]
}

/**
 * Get launchpad standards with info, for dropdowns/lists.
 * Only Metaplex Core, CFT (Compressed), Legacy.
 */
export function getLaunchpadMetadataStandardsWithInfo() {
  return LAUNCHPAD_METADATA_STANDARDS.map((standard) => ({
    standard,
    label: LAUNCHPAD_STANDARD_LABELS[standard],
    info: getMetadataStandardInfo(standard),
  }))
}

/**
 * Get all available metadata standards (full enum; use for internal/IDL only).
 */
export function getAllMetadataStandards(): MetadataStandard[] {
  return [
    'Legacy',
    'Programmable',
    'Core',
    'Compressed',
    'SemiFungible',
    'Token2022',
    'NativeMetadata',
    'Custom',
  ]
}

/**
 * Get metadata standards grouped by category (full enum; use for internal only).
 */
export function getMetadataStandardsByCategory() {
  return {
    official: [
      { standard: 'Legacy' as MetadataStandard, info: getMetadataStandardInfo('Legacy') },
      { standard: 'Programmable' as MetadataStandard, info: getMetadataStandardInfo('Programmable') },
      { standard: 'Core' as MetadataStandard, info: getMetadataStandardInfo('Core') },
      { standard: 'Compressed' as MetadataStandard, info: getMetadataStandardInfo('Compressed') },
      { standard: 'SemiFungible' as MetadataStandard, info: getMetadataStandardInfo('SemiFungible') },
    ],
    native: [
      { standard: 'Token2022' as MetadataStandard, info: getMetadataStandardInfo('Token2022') },
      { standard: 'NativeMetadata' as MetadataStandard, info: getMetadataStandardInfo('NativeMetadata') },
    ],
    experimental: [
      { standard: 'Custom' as MetadataStandard, info: getMetadataStandardInfo('Custom') },
    ],
  }
}

/**
 * Get recommended standard based on use case
 * (Because choosing the right standard is hard, and we're here to help)
 */
export function getRecommendedStandard(useCase: {
  /** Need marketplace support? */
  marketplaceSupport?: boolean
  /** Need enforced royalties? */
  enforcedRoyalties?: boolean
  /** Need cheapest option? */
  cheapest?: boolean
  /** Need future-proof option? */
  futureProof?: boolean
  /** Need most flexible option? */
  mostFlexible?: boolean
}): MetadataStandard {
  // Cheapest option
  if (useCase.cheapest) {
    return 'Compressed'
  }
  
  // Future-proof option
  if (useCase.futureProof) {
    return 'Core'
  }
  
  // Most flexible option
  if (useCase.mostFlexible) {
    return 'Programmable'
  }
  
  // Marketplace support + enforced royalties
  if (useCase.marketplaceSupport && useCase.enforcedRoyalties) {
    return 'Programmable'
  }
  
  // Marketplace support only
  if (useCase.marketplaceSupport) {
    return 'Legacy'
  }
  
  // Enforced royalties only
  if (useCase.enforcedRoyalties) {
    return 'Core'
  }
  
  // Default: Legacy (most supported)
  return 'Legacy'
}

/**
 * Format cost in SOL for display
 * (Because lamports are hard to read, and we're user-friendly like that)
 */
export function formatCostInSol(lamports: number): string {
  return `${(lamports / 1_000_000_000).toFixed(3)} SOL`
}
