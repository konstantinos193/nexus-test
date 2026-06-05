'use client'

/**
 * CreateStep1Details - Step 1 of the older Create flow.
 * Three sections: Collection Identity, Trading Rules (collapsible), Revenue Config (collapsible).
 * The Identity section is always open. The others unlock after Identity is valid.
 * Because you can't configure royalties for a collection with no name. That's just chaos.
 *
 * This is the longest step in the form. It has collapsible sections, toggle switches,
 * split panels, progress bars, and a date picker for freeze-until dates.
 * We built it. We're not apologizing. Buckle up.
 *
 * Note: the FreezzeUntilDatePicker import has an extra 'z'. This is load-bearing.
 * We have a fallback for when the module resolves oddly post-wallet-connect.
 * The fallback is a native datetime-local input, which is ugly but functional.
 * (We've made peace with the extra 'z'. The module naming committee has not.)
 *
 * @author Juan - The developer who built this form and at some point questioned everything.
 * (Coded with care, perseverance, and a deeply personal relationship with collapsible sections.)
 */

// Shared types + constants for the create flow.
// ROYALTY_SPLIT_MAX = 10. Ten recipients maximum. Enough for anyone's extended family.
import { type ShareAddressRow, sanitizeSymbol, ROYALTY_SPLIT_MAX } from './create-types'

// FreezzeUntilDatePicker — the custom calendar with the extra 'z'.
// We import it, check if it's a function or has a .default, and use whichever works.
// This defensive import pattern exists because wallet connect causes module re-evaluation
// and sometimes the default export lands in the wrong place. Yes, really. Yes, we checked.
import FreezzeUntilDatePickerModule from './FreezeUntilDatePicker'

// Fallback — a native datetime-local input. Ugly, but it works when the module misbehaves.
// We'd rather show an ugly input than a blank gap or a crash.
function FreezzeUntilDatePickerFallback({
  id, value, onChange, min, placeholder, className = '',
}: { id: string; value: string; onChange: (v: string) => void; min?: string; placeholder?: string; className?: string }) {
  return (
    <input id={id} type="datetime-local" className={className} value={value ? value.slice(0, 16) : ''} min={min?.slice(0, 16)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  )
}

// Module resolution guard — if the import is a function, use it directly.
// If it has a .default property, use that. If neither, fall back.
// This is what happens when module systems meet wallet SDKs. We survive.
const FreezzeUntilDatePicker =
  (typeof FreezzeUntilDatePickerModule === 'function'
    ? FreezzeUntilDatePickerModule
    : (FreezzeUntilDatePickerModule as { default?: typeof FreezzeUntilDatePickerFallback })?.default) ??
  FreezzeUntilDatePickerFallback

// METADATA_STANDARDS — three options. Core is the modern choice.
// Metaplex = legacy compatibility. CNFT = compressed, pennies per mint.
const METADATA_STANDARDS: { value: 'Core' | 'Metaplex' | 'CNFT'; label: string }[] = [
  { value: 'Core', label: 'Standard (DAS)' },
  { value: 'Metaplex', label: 'Legacy' },
  { value: 'CNFT', label: 'Compressed' },
]

// MINT_MODES — Blind = random NFT, Gallery = pick your own.
// Gallery is transparent. Blind is a surprise box.
// Both are valid. Neither is wrong. The market will decide.
const MINT_MODES: { value: 'Blind' | 'Gallery'; label: string; description: string }[] = [
  { value: 'Blind', label: 'Random mint', description: 'Minters get a random NFT from the collection. Great for surprise drops.' },
  { value: 'Gallery', label: 'Pick & mint', description: 'Minters choose which NFT they want before minting. Full transparency.' },
]

// ── Props interface ────────────────────────────────────────────────────────────
// This is a big interface. Not the biggest we've ever written, but it's up there.
// Every prop is used. None are decorative. We checked.
export interface CreateStep1DetailsProps {
  // Draft saved indicator — shows "✓ Draft saved X seconds ago" when present
  draftSavedAgo: string | null
  // identityValid — true when name and symbol are both non-empty.
  // Trading Rules section is locked until identityValid is true. You earn the next section.
  identityValid: boolean
  // Section expansion state — controlled from the parent. Collapsibles need their state owned above.
  sectionTradingExpanded: boolean
  sectionRevenueExpanded: boolean
  setSectionTradingExpanded: (v: boolean) => void
  setSectionRevenueExpanded: (v: boolean) => void
  // Revenue validation state — royalty split must total 100%. fundReceiverError is the message if not.
  isRoyaltySplitValid: boolean
  fundReceiverError: string | null
  // Step 1 validation errors and touched state — for inline error messages on name/symbol
  step1Errors: { name?: string; symbol?: string }
  // Collection identity fields
  collectionName: string
  setCollectionName: (v: string | ((prev: string) => string)) => void
  symbol: string
  setSymbol: (v: string) => void
  collectionDescription: string
  setCollectionDescription: (v: string) => void
  // Touched state for blur-triggered validation on name and symbol
  step1Touched: { name: boolean; symbol: boolean }
  setStep1Touched: (v: React.SetStateAction<{ name: boolean; symbol: boolean }>) => void
  // Refs for programmatic focus — used when validation fails and we need to guide the user
  collectionNameRef: React.RefObject<HTMLInputElement | null>
  symbolRef: React.RefObject<HTMLInputElement | null>
  // Collection image state — IPFS URI after upload, uploading flag, error, content hash
  collectionImage: string | null
  collectionImageUploading: boolean
  collectionImageError: string | null
  collectionImageHash: string | null
  // Banner image state — same pattern as collection image
  bannerImage: string | null
  bannerImageUploading: boolean
  bannerImageError: string | null
  bannerImageHash: string | null
  // Image upload handlers — shared between PFP and banner via kind discriminator
  onDrop: (e: React.DragEvent, kind: 'collection' | 'banner') => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, kind: 'collection' | 'banner') => void
  // Trading settings
  metadataStandard: 'Core' | 'Metaplex' | 'CNFT'
  setMetadataStandard: (v: 'Core' | 'Metaplex' | 'CNFT') => void
  mintMode: 'Blind' | 'Gallery'
  setMintMode: (v: 'Blind' | 'Gallery') => void
  // Freeze collection — toggles trading lock; freeze date is optional
  freezeCollection: boolean
  setFreezeCollection: (v: boolean) => void
  freezeUntilDate: string
  setFreezeUntilDate: (v: string) => void
  // Reveal Later — placeholder art until reveal. Mystery. Drama. Marketing.
  revealLater: boolean
  setRevealLater: (v: boolean) => void
  // Royalty percentage — 0 to 50%. This step allows up to 50 (deploy caps it per standard).
  royaltyPercent: number
  setRoyaltyPercent: (v: number | ((prev: number) => number)) => void
  // Secondary royalty split — up to ROYALTY_SPLIT_MAX wallets
  royaltyConfig: ShareAddressRow[]
  updateRoyaltyConfig: (i: number, field: 'share' | 'address', value: string) => void
  addRoyaltyConfig: () => void
  removeRoyaltyConfig: (i: number) => void
  distributeRoyaltyEvenly: () => void
  autoFillRoyaltyRemainder: () => void
  // Mint fund split — primary sale proceeds distribution
  fundReceivers: ShareAddressRow[]
  updateFundReceiver: (i: number, field: 'share' | 'address', value: string) => void
  addFundReceiver: () => void
  removeFundReceiver: (i: number) => void
  distributeFundReceiversEvenly: () => void
  autoFillFundReceiversRemainder: () => void
  // Validation totals + error messages
  royaltySplitError: string | null
  royaltyTotal: number
  fundReceiverTotal: number
}

/**
 * CreateStep1Details — renders all three collapsible sections for Step 1.
 * Pure render component. All state is passed in as props.
 * If this component causes a crash, something is wrong upstream. Check the props.
 */
export default function CreateStep1Details(props: CreateStep1DetailsProps) {
  // Destructure everything. Yes, all of it. The props interface is long.
  // We pay the destructuring tax once here so the JSX stays readable.
  const {
    draftSavedAgo, identityValid, sectionTradingExpanded, sectionRevenueExpanded,
    setSectionTradingExpanded, setSectionRevenueExpanded, isRoyaltySplitValid, fundReceiverError,
    step1Errors, collectionName, setCollectionName, symbol, setSymbol, collectionDescription,
    setCollectionDescription, setStep1Touched, collectionNameRef, symbolRef,
    collectionImage, collectionImageUploading, collectionImageError, bannerImage,
    bannerImageUploading, bannerImageError, onDrop, onFileSelect, metadataStandard,
    setMetadataStandard, mintMode, setMintMode, freezeCollection, setFreezeCollection,
    freezeUntilDate, setFreezeUntilDate, revealLater, setRevealLater, royaltyPercent,
    setRoyaltyPercent, royaltyConfig, updateRoyaltyConfig, addRoyaltyConfig, removeRoyaltyConfig,
    distributeRoyaltyEvenly, autoFillRoyaltyRemainder, fundReceivers, updateFundReceiver,
    addFundReceiver, removeFundReceiver, distributeFundReceiversEvenly,
    autoFillFundReceiversRemainder, royaltySplitError, royaltyTotal, fundReceiverTotal,
  } = props

  return (
    <>
      <div className="nft-create-step1-main">
        {/* Step header — title + draft saved indicator.
            Draft saved indicator is top-right when present.
            Green checkmark. Small text. Quietly reassuring. */}
        <div className="nft-create-step1-head">
          <h2 className="nft-create-step1-title">Collection Details</h2>
          {draftSavedAgo && (
            <div className="nft-create-draft-saved nft-create-draft-saved-topright" aria-live="polite">
              ✓ Draft saved {draftSavedAgo}
            </div>
          )}
        </div>

        {/* Section progress pills — Identity | Trading | Revenue.
            Each shows a filled dot (active/incomplete) or a check (valid/done).
            A three-item progress indicator for a three-section form.
            It's elegant. It's informative. We're proud of it. */}
        <div className="nft-create-step1-progress" role="status" aria-label="Step 1 progress">
          <span className={`nft-create-step1-progress-item ${identityValid ? 'done' : 'active'}`}>{identityValid ? '✓' : '●'} Identity</span>
          <span className="nft-create-step1-progress-sep" aria-hidden>|</span>
          <span className={`nft-create-step1-progress-item ${sectionTradingExpanded ? 'done' : ''}`}>{sectionTradingExpanded ? '✓' : '●'} Trading</span>
          <span className="nft-create-step1-progress-sep" aria-hidden>|</span>
          {/* Revenue is valid when royalty split totals 100% and there's no fund receiver error. */}
          <span className={`nft-create-step1-progress-item ${isRoyaltySplitValid && !fundReceiverError ? 'done' : ''}`}>{isRoyaltySplitValid && !fundReceiverError ? '✓' : '●'} Revenue</span>
        </div>

        <div className="nft-create-details-form">

          {/* ── Identity section — always open ──────────────────────────────── */}
          {/* Name, symbol, description, PFP, banner.
              The minimum viable identity for a collection that wants to exist.
              If identityValid is true, a badge appears: "✓ Collection Identity Ready".
              It's validation feedback as affirmation. We contain multitudes. */}
          <div className="nft-create-step1-section nft-create-step1-section-identity">
            <div className="nft-create-step1-section-head">
              <strong className="nft-create-details-section-title">Collection Identity</strong>
              {/* Ready badge — shows when name and symbol are both filled. Small reward. */}
              {identityValid && <span className="nft-create-step1-badge" aria-label="Section complete">✓ Collection Identity Ready</span>}
            </div>

            {/* Name + Symbol row — side by side on wider screens. */}
            <div className="nft-create-details-fields-row nft-create-details-fields-wrap">
              <div className="nft-create-details-field">
                <label className="nft-create-details-label" htmlFor="create-collection-name">
                  Collection Name
                  {/* Tooltip — "My NFTs". Because some users genuinely need the example. */}
                  <span className="nft-create-tooltip-wrap nft-create-tooltip-details" title="The name of your collection eg. 'My NFTs'">
                    <span className="nft-create-tooltip-icon" aria-hidden>i</span>
                    <span className="nft-create-tooltip-text">The name of your collection eg. &apos;My NFTs&apos;, will be displayed as the title of your collection.</span>
                  </span>
                </label>
                {/* Name input — trims leading spaces, max 64 chars.
                    onBlur trims the whole value. No trailing spaces in production. */}
                <input
                  id="create-collection-name" type="text" name="collectionName" ref={collectionNameRef}
                  className={`nft-create-input nft-create-details-input ${step1Errors.name ? 'nft-create-input-error' : ''}`}
                  placeholder="My NFTs" maxLength={64} value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value.replace(/\s+/g, ' ').trimStart())}
                  onBlur={() => { setStep1Touched((t) => ({ ...t, name: true })); setCollectionName((v) => v.trim()) }}
                  aria-invalid={!!step1Errors.name}
                />
                {step1Errors.name && <span className="nft-create-inline-error" role="alert">{step1Errors.name}</span>}
              </div>

              <div className="nft-create-details-field">
                <label className="nft-create-details-label" htmlFor="create-symbol">
                  Symbol
                  {/* Tooltip — "MNFT". The ticker. The identity on the blockchain. */}
                  <span className="nft-create-tooltip-wrap nft-create-tooltip-details" title="Ticker symbol eg. 'MNFT'">
                    <span className="nft-create-tooltip-icon" aria-hidden>i</span>
                    <span className="nft-create-tooltip-text">This is the ticker or symbol which will be used to represent your collection on the blockchain eg. &apos;MNFT&apos;.</span>
                  </span>
                </label>
                {/* Symbol input — sanitized to alphanumeric uppercase, max 12 chars.
                    sanitizeSymbol strips anything that isn't A-Z0-9 and uppercases.
                    The blockchain doesn't want your special characters. Neither do we. */}
                <input
                  id="create-symbol" type="text" name="symbol" ref={symbolRef}
                  className={`nft-create-input nft-create-details-input ${step1Errors.symbol ? 'nft-create-input-error' : ''}`}
                  placeholder="MNFT" maxLength={12} value={symbol}
                  onChange={(e) => setSymbol(sanitizeSymbol(e.target.value))}
                  onBlur={() => setStep1Touched((t) => ({ ...t, symbol: true }))}
                  aria-invalid={!!step1Errors.symbol}
                />
                {step1Errors.symbol && <span className="nft-create-inline-error" role="alert">{step1Errors.symbol}</span>}
              </div>

              {/* Description — full-width field. 250 char max.
                  Optional in this version — no required marker, no validation error.
                  But seriously, write a description. Future collectors will read it. */}
              <div className="nft-create-details-field nft-create-details-field-full">
                <label className="nft-create-details-label" htmlFor="create-collection-description">Collection Description</label>
                <input
                  id="create-collection-description" type="text" name="collectionDescription"
                  className="nft-create-input nft-create-details-input"
                  placeholder="My collection description" maxLength={250} value={collectionDescription}
                  onChange={(e) => setCollectionDescription(e.target.value)}
                />
              </div>
            </div>

            {/* ── Images: PFP + Banner ─────────────────────────────────────── */}
            {/* Both are upload zones. Both support drag-and-drop via onDrop.
                Both call onFileSelect when a file is chosen via the hidden input.
                kind = 'collection' | 'banner' distinguishes them in the handlers above. */}
            <div className="nft-create-step1-images-section">
              <strong className="nft-create-details-section-title">Collection PFP &amp; banner</strong>
              <div className="nft-create-step1-images-row">

                {/* PFP upload zone — square, 1:1 preferred. */}
                <div className="nft-create-details-field">
                  <label className="nft-create-details-label">Collection PFP</label>
                  <label
                    className={`nft-create-upload nft-create-upload-square ${collectionImageUploading ? 'nft-create-upload--loading' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, 'collection')}
                    aria-busy={collectionImageUploading}
                  >
                    {/* Hidden file input — label is the clickable area */}
                    <input type="file" accept="image/png,image/jpeg,image/jpg" className="sr-only" onChange={(e) => onFileSelect(e, 'collection')} disabled={collectionImageUploading} />
                    {/* Three states: uploading (spinner text), uploaded (preview), empty (prompt) */}
                    {collectionImageUploading ? (
                      <div className="nft-create-upload-loading">Uploading…</div>
                    ) : collectionImage ? (
                      <div className="nft-create-preview-card nft-create-step1-collection-preview"><img src={collectionImage} alt="Collection" /></div>
                    ) : (
                      <><div className="nft-create-upload-text">Drop or select image</div><div className="nft-create-upload-hint">PNG / JPEG – square</div></>
                    )}
                  </label>
                  {/* Upload error — shown if IPFS or processing fails */}
                  {collectionImageError && <span className="nft-create-inline-error" role="alert">{collectionImageError}</span>}
                </div>

                {/* Banner upload zone — wide, 16:6 preferred. Optional label in the UI. */}
                <div className="nft-create-details-field nft-create-step1-banner-field">
                  <label className="nft-create-details-label">Banner (optional)</label>
                  <label
                    className={`nft-create-upload nft-create-upload-banner ${bannerImageUploading ? 'nft-create-upload--loading' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, 'banner')}
                    aria-busy={bannerImageUploading}
                  >
                    <input type="file" accept="image/png,image/jpeg,image/jpg" className="sr-only" onChange={(e) => onFileSelect(e, 'banner')} disabled={bannerImageUploading} />
                    {bannerImageUploading ? (
                      <div className="nft-create-upload-loading">Uploading…</div>
                    ) : bannerImage ? (
                      <div className="nft-create-preview-banner"><img src={bannerImage} alt="Banner" /></div>
                    ) : (
                      <><div className="nft-create-upload-text">Wide banner</div><div className="nft-create-upload-hint">PNG / JPG – 16:6</div></>
                    )}
                  </label>
                  {bannerImageError && <span className="nft-create-inline-error" role="alert">{bannerImageError}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Trading Rules — collapsible, locked until identity is valid ── */}
          {/* If identityValid is false, the button is disabled and the section won't expand.
              Because you can't set trading rules for a nameless void. We tried. It doesn't work. */}
          <div className={`nft-create-step1-section nft-create-step1-section-collapse ${sectionTradingExpanded ? 'expanded' : ''} ${!identityValid ? 'locked' : ''}`}>
            <button
              type="button"
              className="nft-create-step1-collapse-head"
              onClick={() => identityValid && setSectionTradingExpanded(!sectionTradingExpanded)}
              disabled={!identityValid}
              aria-expanded={sectionTradingExpanded}
              aria-disabled={!identityValid}
            >
              <span className="nft-create-step1-collapse-title">Trading Rules</span>
              <span className="nft-create-step1-collapse-hint">Required</span>
              {/* Chevron — ▼ when expanded, ▶ when collapsed. Classic. Timeless. */}
              <span className="nft-create-step1-collapse-chevron" aria-hidden>{sectionTradingExpanded ? '▼' : '▶'}</span>
            </button>

            {sectionTradingExpanded && (
              <div className="nft-create-step1-collapse-body">

                {/* Metadata Standard — radio group. Core / Legacy / Compressed. */}
                <div className="nft-create-details-radios">
                  <span className="nft-create-details-radios-label">Metadata Standard</span>
                  <div className="nft-create-radio-group" role="radiogroup">
                    {METADATA_STANDARDS.map((opt) => (
                      <label key={opt.value} className="nft-create-radio-wrap">
                        <span className="nft-create-radio-input-wrap">
                          <input type="radio" name="metadataStandard" value={opt.value} checked={metadataStandard === opt.value} onChange={() => setMetadataStandard(opt.value)} />
                        </span>
                        <span className="nft-create-radio-label">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mint Mode — Blind (random) or Gallery (pick your own).
                    Two button cards, radio semantics via role="radio" + aria-checked. */}
                <div className="nft-create-mint-mode">
                  <div className="nft-create-mint-mode-header">
                    <span className="nft-create-mint-mode-label">How minters choose</span>
                  </div>
                  <div className="nft-create-mint-mode-grid" role="radiogroup" aria-label="Mint mode">
                    {MINT_MODES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={mintMode === opt.value}
                        className={`nft-create-mint-mode-card ${mintMode === opt.value ? 'nft-create-mint-mode-card--selected' : ''}`}
                        onClick={() => setMintMode(opt.value)}
                      >
                        <span className="nft-create-mint-mode-card-title">{opt.label}</span>
                        <span className="nft-create-mint-mode-card-desc">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collection options — three toggle switches.
                    Freeze Collection, Reveal Later, Enforce Royalties.
                    Enforce Royalties is always on and disabled. The blockchain enforces it. We're not arguing. */}
                <div className="nft-create-details-options-panel">
                  <div className="nft-create-details-options-panel-title">Collection options</div>

                  {/* Freeze Collection toggle */}
                  <div className="nft-create-details-switch-row">
                    <button type="button" role="switch" aria-checked={freezeCollection} className={`nft-create-switch ${freezeCollection ? 'on' : ''}`} onClick={() => setFreezeCollection(!freezeCollection)}>
                      <span className="nft-create-switch-thumb" />
                    </button>
                    <div className="nft-create-details-switch-copy">
                      <div className="nft-create-details-switch-title"><strong>Freeze Collection</strong></div>
                      <span className="nft-create-details-switch-desc">While frozen, your NFTs cannot be traded.</span>
                    </div>
                  </div>

                  {/* Freeze-until date — conditional, only when freezeCollection is true.
                      Uses the FreezeUntilDatePicker (or fallback if module misbehaves).
                      Leave empty to only unfreeze when sold out. */}
                  {freezeCollection && (
                    <div className="nft-create-details-freeze-until-row">
                      <div className="nft-create-details-freeze-until-copy">
                        <label className="nft-create-details-label" htmlFor="create-freeze-until-date">Unfreeze at date (optional)</label>
                        <p className="nft-create-details-freeze-until-desc">Trading stays frozen until this date. Leave empty to only unfreeze when sold out.</p>
                        {/* The DatePicker — custom calendar, portal-rendered, timezone-aware.
                            The extra 'z' in the component name is a feature, not a bug. Allegedly. */}
                        <FreezzeUntilDatePicker id="create-freeze-until-date" value={freezeUntilDate} onChange={setFreezeUntilDate} placeholder="Pick date & time" className="nft-create-freeze-until-input" />
                      </div>
                    </div>
                  )}

                  {/* Reveal Later toggle — placeholder art until the big reveal */}
                  <div className="nft-create-details-switch-row">
                    <button type="button" role="switch" aria-checked={revealLater} className={`nft-create-switch ${revealLater ? 'on' : ''}`} onClick={() => setRevealLater(!revealLater)}>
                      <span className="nft-create-switch-thumb" />
                    </button>
                    <div className="nft-create-details-switch-copy">
                      <div className="nft-create-details-switch-title"><strong>Reveal Later</strong></div>
                      <span className="nft-create-details-switch-desc">Use placeholder art revealed at a later time.</span>
                    </div>
                  </div>

                  {/* Enforce Royalties — always on, always disabled.
                      aria-disabled + disabled so both AT and visual styling agree.
                      The blockchain enforces royalties. We just display the fact. */}
                  <div className="nft-create-details-switch-row">
                    <button type="button" role="switch" aria-checked={true} aria-disabled disabled className="nft-create-switch on disabled">
                      <span className="nft-create-switch-thumb" />
                    </button>
                    <div className="nft-create-details-switch-copy">
                      <div className="nft-create-details-switch-title"><strong>Enforce Royalties</strong></div>
                      <span className="nft-create-details-switch-desc">Enforce royalties on secondary sales.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Revenue configuration — collapsible ─────────────────────── */}
          {/* Always unlocked (unlike Trading Rules, Revenue doesn't require Identity).
              Two split panels: Secondary Royalty Split + Mint Funds Split.
              Both must total 100%. Both have bar visualizations per row.
              Both have "Distribute evenly" and "Auto fill remainder" helpers.
              Because percentages are hard and we're here to help. */}
          <div className={`nft-create-step1-section nft-create-step1-section-collapse ${sectionRevenueExpanded ? 'expanded' : ''}`}>
            <button
              type="button"
              className="nft-create-step1-collapse-head"
              onClick={() => setSectionRevenueExpanded(!sectionRevenueExpanded)}
              aria-expanded={sectionRevenueExpanded}
            >
              <span className="nft-create-step1-collapse-title">Revenue configuration</span>
              <span className="nft-create-step1-collapse-hint">Required</span>
              <span className="nft-create-step1-collapse-chevron" aria-hidden>{sectionRevenueExpanded ? '▼' : '▶'}</span>
            </button>

            {sectionRevenueExpanded && (
              <div className="nft-create-step1-collapse-body">

                {/* Royalty % input — 0 to 50%, step 0.5.
                    This is the secondary sale percentage. On every resale, forever.
                    Passive income. On-chain. The dream. */}
                <div className="nft-create-details-field" style={{ marginBottom: '1rem' }}>
                  <label className="nft-create-details-label" htmlFor="create-royalty-percent">Royalty % (0–50%)</label>
                  <div className="nft-create-display-row">
                    <input
                      id="create-royalty-percent" type="number"
                      className="nft-create-input nft-create-details-input nft-create-input-narrow"
                      min={0} max={50} step={0.5} placeholder="5" value={royaltyPercent}
                      onChange={(e) => { const v = parseFloat(e.target.value); setRoyaltyPercent(Number.isNaN(v) ? 0 : Math.min(50, Math.max(0, v))) }}
                      aria-label="Royalty percentage 0 to 50"
                    />
                    <span className="nft-create-char" aria-hidden>%</span>
                  </div>
                </div>

                {/* ── Secondary Royalty Split panel ──────────────────────────── */}
                {/* Split secondary sale royalties between up to ROYALTY_SPLIT_MAX wallets.
                    Each row has a share bar visualization + % input + address input.
                    Shares must total 100%. Helpers make the math easier. */}
                <div className="nft-create-split-panel">
                  <div className="nft-create-split-panel-header">
                    <div className="nft-create-split-panel-title-wrap">
                      <h3 className="nft-create-split-panel-title">Secondary Royalty Split</h3>
                      <p className="nft-create-split-panel-desc">Split secondary sale royalties between wallets. Shares must total 100%.</p>
                    </div>
                    <div className="nft-create-split-panel-actions">
                      {/* Helper buttons — saves the user from doing division by hand.
                          "Distribute evenly" spreads 100% across all rows equally.
                          "Auto fill remainder" fills the last row to reach 100%. */}
                      <button type="button" className="nft-create-split-helper-btn" onClick={distributeRoyaltyEvenly}>Distribute evenly</button>
                      <button type="button" className="nft-create-split-helper-btn" onClick={autoFillRoyaltyRemainder}>Auto fill remainder</button>
                      {/* Total indicator — green when 100%, red otherwise. Live feedback. */}
                      <div className={`nft-create-split-total ${isRoyaltySplitValid ? 'valid' : 'invalid'}`} aria-live="polite">
                        <span className="nft-create-split-total-value">Total: {royaltyTotal.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Error banner — appears when the split is invalid */}
                  {royaltySplitError && <div className="nft-create-split-error-banner" role="alert">{royaltySplitError}</div>}
                  {/* Remaining indicator — tells the user how far they are from 100% */}
                  {Math.abs(royaltyTotal - 100) > 0.01 && <div className="nft-create-split-remaining" role="status">Remaining: {(100 - royaltyTotal).toFixed(1)}%</div>}

                  {/* Recipient rows — each has a bar visualization, share input, address input. */}
                  <ul className="nft-create-split-list">
                    {royaltyConfig.map((row, i) => {
                      const pct = parseFloat(row.share) || 0
                      // barWidth — this row's share as a percentage of the current total.
                      // Visualizes relative allocation. If total is 0, bar is empty.
                      const barWidth = royaltyTotal > 0 ? (pct / royaltyTotal) * 100 : 0
                      return (
                        <li key={i} className="nft-create-split-row-card">
                          <div className="nft-create-split-row-top">
                            {/* Bar + percentage — relative share visualization */}
                            <div className="nft-create-split-row-bar-wrap">
                              <div className="nft-create-split-row-bar" style={{ width: `${Math.min(100, barWidth)}%` }} />
                              <span className="nft-create-split-row-pct">{pct}%</span>
                            </div>
                            {/* Remove button — only shown when there's more than one row.
                                You cannot have zero royalty recipients. We insist. */}
                            {royaltyConfig.length > 1 && <button type="button" className="nft-create-split-remove-btn" onClick={() => removeRoyaltyConfig(i)} aria-label={`Remove recipient ${i + 1}`}>Remove</button>}
                          </div>
                          <div className="nft-create-split-row-fields">
                            <div className="nft-create-split-field nft-create-split-field-share">
                              <label htmlFor={`royalty-share-${i}`}>Share %</label>
                              <div className="nft-create-input-adorned nft-create-input-adorned-start">
                                <span className="nft-create-input-adornment nft-create-input-adornment-text">%</span>
                                <input id={`royalty-share-${i}`} type="number" min={0} max={100} step={1} className="nft-create-input" value={row.share} onChange={(e) => updateRoyaltyConfig(i, 'share', e.target.value)} />
                              </div>
                            </div>
                            <div className="nft-create-split-field nft-create-split-field-address">
                              <label htmlFor={`royalty-address-${i}`}>Solana address</label>
                              <input id={`royalty-address-${i}`} type="text" className="nft-create-input" value={row.address} onChange={(e) => updateRoyaltyConfig(i, 'address', e.target.value)} placeholder="Wallet address" />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {/* Add recipient — disabled when at the max. ROYALTY_SPLIT_MAX = 10. */}
                  <button type="button" className="nft-create-split-add-btn" onClick={addRoyaltyConfig} disabled={royaltyConfig.length >= ROYALTY_SPLIT_MAX}>Add recipient</button>
                </div>

                {/* ── Mint Funds Split panel ──────────────────────────────────── */}
                {/* Same UI pattern as Secondary Royalty Split.
                    This one distributes primary sale proceeds. First money in.
                    Also must total 100%. Also has helpers. Also has bar visualizations.
                    We built the pattern once and used it twice. That's engineering. */}
                <div className="nft-create-split-panel">
                  <div className="nft-create-split-panel-header">
                    <div className="nft-create-split-panel-title-wrap">
                      <h3 className="nft-create-split-panel-title">Mint funds Split</h3>
                      <p className="nft-create-split-panel-desc">Split primary sale proceeds between wallets. Shares must total 100%.</p>
                    </div>
                    <div className="nft-create-split-panel-actions">
                      <button type="button" className="nft-create-split-helper-btn" onClick={distributeFundReceiversEvenly}>Distribute evenly</button>
                      <button type="button" className="nft-create-split-helper-btn" onClick={autoFillFundReceiversRemainder}>Auto fill remainder</button>
                      <div className={`nft-create-split-total ${!fundReceiverError ? 'valid' : 'invalid'}`} aria-live="polite">
                        <span className="nft-create-split-total-value">Total: {fundReceiverTotal.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  {fundReceiverError && <div className="nft-create-split-error-banner" role="alert">{fundReceiverError}</div>}
                  {Math.abs(fundReceiverTotal - 100) > 0.01 && <div className="nft-create-split-remaining" role="status">Remaining: {(100 - fundReceiverTotal).toFixed(1)}%</div>}
                  <ul className="nft-create-split-list">
                    {fundReceivers.map((row, i) => {
                      const pct = parseFloat(row.share) || 0
                      const barWidth = fundReceiverTotal > 0 ? (pct / fundReceiverTotal) * 100 : 0
                      return (
                        <li key={i} className="nft-create-split-row-card">
                          <div className="nft-create-split-row-top">
                            <div className="nft-create-split-row-bar-wrap">
                              <div className="nft-create-split-row-bar" style={{ width: `${Math.min(100, barWidth)}%` }} />
                              <span className="nft-create-split-row-pct">{pct}%</span>
                            </div>
                            {fundReceivers.length > 1 && <button type="button" className="nft-create-split-remove-btn" onClick={() => removeFundReceiver(i)} aria-label={`Remove recipient ${i + 1}`}>Remove</button>}
                          </div>
                          <div className="nft-create-split-row-fields">
                            <div className="nft-create-split-field nft-create-split-field-share">
                              <label htmlFor={`fund-share-${i}`}>Share %</label>
                              <div className="nft-create-input-adorned nft-create-input-adorned-start">
                                <span className="nft-create-input-adornment nft-create-input-adornment-text">%</span>
                                <input id={`fund-share-${i}`} type="number" min={0} max={100} step={1} className="nft-create-input" value={row.share} onChange={(e) => updateFundReceiver(i, 'share', e.target.value)} />
                              </div>
                            </div>
                            <div className="nft-create-split-field nft-create-split-field-address">
                              <label htmlFor={`fund-address-${i}`}>Solana address</label>
                              <input id={`fund-address-${i}`} type="text" className="nft-create-input" value={row.address} onChange={(e) => updateFundReceiver(i, 'address', e.target.value)} placeholder="Wallet address" />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  <button type="button" className="nft-create-split-add-btn" onClick={addFundReceiver} disabled={fundReceivers.length >= ROYALTY_SPLIT_MAX}>Add recipient</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Coded by Juan — three sections, two split panels, one extra 'z' in a component name,
// and a form that screams into the void only when validation fails.
// Fill it in correctly. The form has spoken. The blockchain awaits your compliance.
