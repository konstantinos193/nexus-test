/**
 * create-types.ts - The type definitions and pure helpers for the entire Create flow.
 * Every step component imports from here. Every hook imports from here.
 * If this file disappears, the entire create wizard explodes into TypeScript errors.
 * We're not being dramatic. This file is load-bearing.
 *
 * What lives here:
 * - Constants (name limits, symbol limits, storage keys, split max)
 * - Enum-style types (Blockchain, NetworkEnv)
 * - Data shapes (ShareAddressRow, TraitRow, SplitRow, PhaseRow, CreateDraftPayload, NftPreviewItem)
 * - Pure utility functions (toDateTimeLocal, fromDateTimeLocal, getPhaseTimeError,
 *   sanitizeSymbol, isValidSolanaAddress, getRoyaltySplitError, buildCreatorsFromRoyaltyConfig)
 *
 * Rule: nothing here has side effects. Nothing imports from React.
 * Nothing calls a hook. Nothing touches the DOM.
 * This file is a library. A calm, type-safe library.
 * (The calm before the form. The form is not calm.)
 *
 * @author Juan - The developer who decided "put all the types in one file"
 * and has not regretted it. Not once. Not even a little.
 * (Coded with discipline, mild smugness about the architecture, and black coffee.)
 */

// ── Constants ─────────────────────────────────────────────────────────────────

// COLLECTION_NAME_MAX — 64 characters. Enough to be creative.
// Not enough to write a manifesto. That's what the description is for.
export const COLLECTION_NAME_MAX = 64

// SYMBOL_MIN / SYMBOL_MAX — 1 to 12 characters. Uppercase. Alphanumeric only.
// The blockchain has opinions about symbols. These constants encode those opinions.
export const SYMBOL_MIN = 1
export const SYMBOL_MAX = 12

// DRAFT_STORAGE_KEY — the localStorage key where we stash draft state.
// If you change this key, every user's existing draft disappears.
// Don't change this key unless you really mean to.
export const DRAFT_STORAGE_KEY = 'nexus-create-draft'

// ROYALTY_SPLIT_MAX — maximum number of royalty/fund recipients.
// Ten is generous. Ten is also the limit. We cap it here so the UI
// never renders an infinite list of address inputs into a terrifying void.
export const ROYALTY_SPLIT_MAX = 10

// ── Enum-style types ──────────────────────────────────────────────────────────

// Blockchain — currently we only ship on Solana. Ethereum and Polygon are there
// because we planned for the future once. The future is still mostly Solana.
export type Blockchain = 'solana' | 'ethereum' | 'polygon'

// NetworkEnv — mainnet for real money, testnet for practice.
// The deploy flow checks this before building the transaction.
// Sending mainnet transactions on testnet is not dangerous. Just embarrassing.
export type NetworkEnv = 'mainnet' | 'testnet'

// ── Data shapes ───────────────────────────────────────────────────────────────

// ShareAddressRow — one recipient in a royalty split or fund receiver list.
// share is a string (from input) so we avoid float precision on partial edits.
// address is the raw Solana base58 string. Validated separately with isValidSolanaAddress.
export interface ShareAddressRow {
  share: string
  address: string
}

// TraitRow — one attribute row in the metadata traits builder.
// name = trait_type, values = comma-separated possible values.
// Used in Step 1's legacy traits UI.
export interface TraitRow {
  name: string
  values: string
}

// SplitRow — older split format, kept for draft backward compatibility.
// wallet + percent as strings. Do not confuse with ShareAddressRow.
// They're the same concept. We have two interfaces because history.
export interface SplitRow {
  wallet: string
  percent: string
}

// PhaseRow — one mint phase in the wizard.
// All fields are strings because they come from input elements.
// priceOverride = '' means "use collection default". Not "zero". Empty string ≠ zero.
// allowlistRaw = newline/comma-separated wallet addresses. Parsed at deploy time.
// useEndDateTime = 'true' | '' — yes, it's a string boolean. We know. We lived with it.
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

// CreateDraftPayload — everything we persist to localStorage for draft recovery.
// All fields are optional because the draft might be partial (the user could have
// stopped after Step 1). We reconstruct what we have. We don't crash on missing fields.
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
  twitterUrl?: string
  discordUrl?: string
  websiteUrl?: string
}

// ── Pure utility functions ────────────────────────────────────────────────────

// toDateTimeLocal — converts a Date to "YYYY-MM-DDTHH:mm" (datetime-local format).
// Used to pre-fill date inputs with default values.
// Padded manually because JavaScript date methods return non-padded numbers. Charming.
/** Format Date for datetime-local input (YYYY-MM-DDTHH:mm) */
export function toDateTimeLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

// fromDateTimeLocal — parses a datetime-local string back into a Date.
// Returns null for empty/invalid strings instead of throwing.
// Date.parse returns NaN on invalid input. Number.isFinite(NaN) = false. Clean.
/** Parse datetime-local string to Date (or null) */
export function fromDateTimeLocal(s: string): Date | null {
  if (!s || !s.trim()) return null
  const n = Date.parse(s)
  return Number.isFinite(n) ? new Date(n) : null
}

// getPhaseTimeError — validates start/end ordering for a PhaseRow.
// Returns an error message string or null.
// Cases:
// 1. No start → "Start date/time is required"
// 2. No end (or useEndDateTime off) → null (valid)
// 3. End <= start → "End must be after start"
// 4. Everything fine → null
// Called in the phase card renders to show inline error banners.
/** Validate phase start/end; returns error message or null */
export function getPhaseTimeError(phase: PhaseRow): string | null {
  const start = fromDateTimeLocal(phase.startDateTime)
  if (!start) return 'Start date/time is required'
  // No end date configured — that's fine. A phase without an end runs until supply is gone.
  if (!phase.endDateTime.trim()) return null
  const end = fromDateTimeLocal(phase.endDateTime)
  // Can't parse the end date? Not an error we handle here.
  if (!end) return null
  // End must be strictly after start. Equal times are not valid — that's a zero-duration phase.
  if (end <= start) return 'End must be after start'
  return null
}

// sanitizeSymbol — strips non-alphanumeric, uppercases, truncates to SYMBOL_MAX.
// Applied on every keystroke in the symbol input.
// The blockchain rejects special characters in symbols. We pre-reject them. Preemptive kindness.
/** Only allow alphanumeric for symbol (block special chars) */
export function sanitizeSymbol(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, SYMBOL_MAX)
}

// SOLANA_ADDRESS_REGEX — base58 Solana addresses are 32-44 characters from the base58 alphabet.
// The alphabet excludes 0, O, I, l to avoid visual confusion. Clever. Annoying. Necessary.
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

// isValidSolanaAddress — checks the regex. That's it.
// Does not hit the chain. Does not check balance. Does not check if the wallet exists.
// Just checks the format. A formatting validation, nothing more.
export function isValidSolanaAddress(addr: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(addr.trim())
}

// getRoyaltySplitError — validates an array of ShareAddressRow entries.
// Three possible errors:
// 1. Too many rows (> ROYALTY_SPLIT_MAX)
// 2. Shares don't total 100% (within 0.01 tolerance for float arithmetic)
// 3. An address is non-empty but fails the Solana address regex
// Returns the first error found, or null if valid.
// Called in the form to drive the error banner and the valid/invalid total indicator.
/** Validation for Secondary Royalty Split: sum = 100, valid addresses, max 10 rows */
export function getRoyaltySplitError(rows: ShareAddressRow[]): string | null {
  if (rows.length > ROYALTY_SPLIT_MAX) return `Maximum ${ROYALTY_SPLIT_MAX} recipients`
  const total = rows.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
  // 0.01 tolerance because floating-point addition is not perfectly precise.
  // 33.33 + 33.33 + 33.34 = 100.00 in theory. In practice: 99.99999... We're lenient.
  if (Math.abs(total - 100) > 0.01) return 'Shares must total 100%'
  for (let i = 0; i < rows.length; i++) {
    const share = parseFloat(rows[i].share) || 0
    // Only validate address format when the row is non-zero AND has an address.
    // Empty address on a 0% row is harmless. We skip it.
    if (share > 0 && rows[i].address.trim()) {
      if (!isValidSolanaAddress(rows[i].address)) return `Row ${i + 1}: invalid Solana address`
    }
  }
  return null
}

// NftPreviewItem — a local-only preview of a single NFT, built from File references.
// imageUrl is an object URL — temporary, browser-only. It MUST be revoked when no longer needed.
// attributes are parsed from the matching JSON metadata file during buildNftPreviews.
/** One NFT preview card: local image URL + parsed metadata (Step 2) */
export interface NftPreviewItem {
  stem: string
  name: string
  imageUrl: string
  attributes: Array<{ trait_type: string; value: string }>
}

// buildCreatorsFromRoyaltyConfig — converts valid ShareAddressRow entries into
// the creators array format expected by Metaplex metadata.
// Validates the config first. Returns empty array if invalid.
// Only includes rows with a positive share AND a valid Solana address.
// Share is rounded to the nearest integer (Metaplex doesn't like fractional shares in creators).
/** Build properties.creators for collection metadata */
export function buildCreatorsFromRoyaltyConfig(royaltyConfig: ShareAddressRow[]): { address: string; share: number }[] {
  // Validate first. No partial creators arrays from invalid configs.
  const err = getRoyaltySplitError(royaltyConfig)
  if (err) return []
  return royaltyConfig
    .filter((r) => {
      const share = parseFloat(r.share) || 0
      // Must have positive share AND valid address to be included.
      // Zero-share rows don't belong in creators. The blockchain would agree.
      return share > 0 && r.address.trim() && isValidSolanaAddress(r.address)
    })
    .map((r) => ({ address: r.address.trim(), share: Math.round(parseFloat(r.share) || 0) }))
}

// Coded by Juan — the type file that holds everything together.
// Delete it and watch the compiler scream. We all scream.
// All 26 components that import from here scream simultaneously.
// Keep this file. Treasure it. It earned its place.
