/**
 * create-types.ts - Shared types and helpers for the Create Collection flow.
 * Used by CreatePageContent and all step components.
 * If this file disappears, the whole create flow explodes. Don't delete it.
 */

export const COLLECTION_NAME_MAX = 64
export const SYMBOL_MIN = 1
export const SYMBOL_MAX = 12
export const DRAFT_STORAGE_KEY = 'nexus-create-draft'
export const ROYALTY_SPLIT_MAX = 10

export type Blockchain = 'solana' | 'ethereum' | 'polygon'
export type NetworkEnv = 'mainnet' | 'testnet'

export interface ShareAddressRow {
  share: string
  address: string
}

export interface TraitRow {
  name: string
  values: string
}

export interface SplitRow {
  wallet: string
  percent: string
}

/** One mint phase: name, window, type (public/allowlist), optional price, allowlist addresses */
export interface PhaseRow {
  name: string
  startDateTime: string
  endDateTime: string
  /** When 'true', show and use end date; otherwise end mint is optional/off */
  useEndDateTime?: string
  phaseType: 'public' | 'allowlist'
  priceOverride: string
  allowlistRaw: string
  maxPerWallet: string
  maxSupply: string
}

/** Serializable draft payload for localStorage */
export interface CreateDraftPayload {
  version?: number
  step?: number
  collectionName?: string
  symbol?: string
  collectionDescription?: string
  metadataStandard?: string
  mintMode?: string
  freezeCollection?: boolean
  freezeUntilDate?: string
  royaltyConfig?: ShareAddressRow[]
  fundReceivers?: ShareAddressRow[]
  collectionImage?: string | null
  collectionImageHash?: string | null
  baseUri?: string | null
  bannerImage?: string | null
  bannerImageHash?: string | null
  totalSupply?: string
  traits?: TraitRow[]
  mintType?: string
  mintPrice?: string
  freeMint?: boolean
  maxPerWallet?: string
  maxSupplyPerPhase?: string
  phases?: PhaseRow[]
  royaltyPercent?: number
  royaltyWallet?: string
  splits?: SplitRow[]
}

/** Format Date for datetime-local input (YYYY-MM-DDTHH:mm) */
export function toDateTimeLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/** Parse datetime-local string to Date (or null) */
export function fromDateTimeLocal(s: string): Date | null {
  if (!s || !s.trim()) return null
  const n = Date.parse(s)
  return Number.isFinite(n) ? new Date(n) : null
}

/** Validate phase start/end; returns error message or null */
export function getPhaseTimeError(phase: PhaseRow): string | null {
  const start = fromDateTimeLocal(phase.startDateTime)
  if (!start) return 'Start date/time is required'
  if (!phase.endDateTime.trim()) return null
  const end = fromDateTimeLocal(phase.endDateTime)
  if (!end) return null
  if (end <= start) return 'End must be after start'
  return null
}

/** Only allow alphanumeric for symbol (block special chars) */
export function sanitizeSymbol(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, SYMBOL_MAX)
}

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
export function isValidSolanaAddress(addr: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(addr.trim())
}

/** Validation for Secondary Royalty Split: sum = 100, valid addresses, max 10 rows */
export function getRoyaltySplitError(rows: ShareAddressRow[]): string | null {
  if (rows.length > ROYALTY_SPLIT_MAX) return `Maximum ${ROYALTY_SPLIT_MAX} recipients`
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
  if (Math.abs(total - 100) > 0.01) return 'Shares must total 100%'
  for (let i = 0; i < rows.length; i++) {
    const share = parseFloat(rows[i].share) || 0
    if (share > 0 && rows[i].address.trim()) {
      if (!isValidSolanaAddress(rows[i].address)) return `Row ${i + 1}: invalid Solana address`
    }
  }
  return null
}

/** One NFT preview card: local image URL + parsed metadata (Step 2) */
export interface NftPreviewItem {
  stem: string
  name: string
  imageUrl: string
  attributes: Array<{ trait_type: string; value: string }>
}

/** Build properties.creators for collection metadata */
export function buildCreatorsFromRoyaltyConfig(royaltyConfig: ShareAddressRow[]): { address: string; share: number }[] {
  const err = getRoyaltySplitError(royaltyConfig)
  if (err) return []
  return royaltyConfig
    .filter((r) => {
      const share = parseFloat(r.share) || 0
      return share > 0 && r.address.trim() && isValidSolanaAddress(r.address)
    })
    .map((r) => ({ address: r.address.trim(), share: Math.round(parseFloat(r.share) || 0) }))
}
