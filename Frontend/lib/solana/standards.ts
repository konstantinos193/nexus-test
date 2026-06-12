/**
 * NFT standards exposed in the create flow (CollectionForm step 1).
 * Must stay in sync with:
 *   - useCreateCollectionForm.ts METADATA_STANDARD_VARIANT
 *   - programs/nexus-launchpad MetadataStandard enum (lib.rs)
 */
// Canonical Metaplex Core program id (matches mpl_core::ID and the address the localnet
// validator hosts MPL Core at). The previous value here was a different/incorrect address.
export const MPL_CORE_PROGRAM_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'

export type UiMetadataStandard = 'Core' | 'Legacy' | 'Compressed' | 'Programmable'

/** On-chain MetadataStandard u8 (nexus-launchpad) */
export const ON_CHAIN_STANDARD = {
  Legacy: 0,
  Programmable: 1,
  Core: 2,
  Compressed: 3,
} as const

export type OnChainStandard = (typeof ON_CHAIN_STANDARD)[keyof typeof ON_CHAIN_STANDARD]

export const UI_TO_ON_CHAIN: Record<UiMetadataStandard, OnChainStandard> = {
  Core: ON_CHAIN_STANDARD.Core,
  Legacy: ON_CHAIN_STANDARD.Legacy,
  Compressed: ON_CHAIN_STANDARD.Compressed,
  Programmable: ON_CHAIN_STANDARD.Programmable,
}

export const ON_CHAIN_TO_UI: Partial<Record<OnChainStandard, UiMetadataStandard>> = {
  [ON_CHAIN_STANDARD.Core]: 'Core',
  [ON_CHAIN_STANDARD.Legacy]: 'Legacy',
  [ON_CHAIN_STANDARD.Compressed]: 'Compressed',
  [ON_CHAIN_STANDARD.Programmable]: 'Programmable',
}

export const STANDARD_LABELS: Record<UiMetadataStandard, string> = {
  Core: 'Standard (DAS)',
  Legacy: 'Legacy (Token Metadata)',
  Compressed: 'Compressed (cNFT)',
  Programmable: 'Programmable (pNFT)',
}

/**
 * Deploy support — what create_collection actually CPIs today.
 * All four standards can be stored on-chain; only Core creates a Metaplex collection at deploy.
 */
export const STANDARD_DEPLOY_SUPPORT: Record<UiMetadataStandard, 'live' | 'partial' | 'planned'> = {
  Core: 'live',
  Legacy: 'partial',       // config saved; no Token Metadata collection CPI yet
  Compressed: 'partial',   // config saved; no Bubblegum tree at deploy yet
  Programmable: 'partial',
}

/** Mint support — what the on-chain mint instruction CPIs today */
export const STANDARD_MINT_SUPPORT: Record<UiMetadataStandard, 'live' | 'planned'> = {
  Core: 'live',            // mpl-core CreateV2 CPI
  Legacy: 'live',          // mpl-token-metadata CPI (CreateMetadataAccountsV3 + CreateMasterEditionV3)
  Compressed: 'planned',   // Bubblegum + merkle tree
  Programmable: 'planned',
}

export const STANDARD_MINT_HINT: Record<UiMetadataStandard, string> = {
  Core: 'Mint live — creates a Metaplex Core asset in your wallet.',
  Legacy: 'Mint live — creates a Token Metadata NFT in your wallet.',
  Compressed: 'Deploy only for now — mint CPI (cNFT / Bubblegum) coming next.',
  Programmable: 'Deploy only for now — mint CPI (pNFT) coming next.',
}