'use client'

/**
 * CreateStep1Details - Step 1 of the Create flow: Collection Details.
 * Identity section, Trading rules (collapsible), Revenue config (collapsible).
 * This is the longest step. Buckle up.
 *
 * @author Juan - The developer who built this form and questioned his choices
 * (Coded with care, humor, and probably too much coffee)
 */

import type { ShareAddressRow } from './create-types'
import { sanitizeSymbol, ROYALTY_SPLIT_MAX } from './create-types'
import FreezzeUntilDatePickerModule from './FreezeUntilDatePicker'

// Fallback for when the module import resolves oddly after wallet connect
function FreezzeUntilDatePickerFallback({
  id, value, onChange, min, placeholder, className = '',
}: { id: string; value: string; onChange: (v: string) => void; min?: string; placeholder?: string; className?: string }) {
  return (
    <input id={id} type="datetime-local" className={className} value={value ? value.slice(0, 16) : ''} min={min?.slice(0, 16)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
  )
}

const FreezzeUntilDatePicker =
  (typeof FreezzeUntilDatePickerModule === 'function'
    ? FreezzeUntilDatePickerModule
    : (FreezzeUntilDatePickerModule as { default?: typeof FreezzeUntilDatePickerFallback })?.default) ??
  FreezzeUntilDatePickerFallback

const METADATA_STANDARDS: { value: 'Core' | 'Metaplex' | 'CNFT'; label: string }[] = [
  { value: 'Core', label: 'Standard (DAS)' },
  { value: 'Metaplex', label: 'Legacy' },
  { value: 'CNFT', label: 'Compressed' },
]

const MINT_MODES: { value: 'Blind' | 'Gallery'; label: string; description: string }[] = [
  { value: 'Blind', label: 'Random mint', description: 'Minters get a random NFT from the collection. Great for surprise drops.' },
  { value: 'Gallery', label: 'Pick & mint', description: 'Minters choose which NFT they want before minting. Full transparency.' },
]

export interface CreateStep1DetailsProps {
  draftSavedAgo: string | null
  identityValid: boolean
  sectionTradingExpanded: boolean
  sectionRevenueExpanded: boolean
  setSectionTradingExpanded: (v: boolean) => void
  setSectionRevenueExpanded: (v: boolean) => void
  isRoyaltySplitValid: boolean
  fundReceiverError: string | null
  step1Errors: { name?: string; symbol?: string }
  collectionName: string
  setCollectionName: (v: string | ((prev: string) => string)) => void
  symbol: string
  setSymbol: (v: string) => void
  collectionDescription: string
  setCollectionDescription: (v: string) => void
  step1Touched: { name: boolean; symbol: boolean }
  setStep1Touched: (v: React.SetStateAction<{ name: boolean; symbol: boolean }>) => void
  collectionNameRef: React.RefObject<HTMLInputElement | null>
  symbolRef: React.RefObject<HTMLInputElement | null>
  collectionImage: string | null
  collectionImageUploading: boolean
  collectionImageError: string | null
  collectionImageHash: string | null
  bannerImage: string | null
  bannerImageUploading: boolean
  bannerImageError: string | null
  bannerImageHash: string | null
  onDrop: (e: React.DragEvent, kind: 'collection' | 'banner') => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, kind: 'collection' | 'banner') => void
  metadataStandard: 'Core' | 'Metaplex' | 'CNFT'
  setMetadataStandard: (v: 'Core' | 'Metaplex' | 'CNFT') => void
  mintMode: 'Blind' | 'Gallery'
  setMintMode: (v: 'Blind' | 'Gallery') => void
  freezeCollection: boolean
  setFreezeCollection: (v: boolean) => void
  freezeUntilDate: string
  setFreezeUntilDate: (v: string) => void
  revealLater: boolean
  setRevealLater: (v: boolean) => void
  royaltyPercent: number
  setRoyaltyPercent: (v: number | ((prev: number) => number)) => void
  royaltyConfig: ShareAddressRow[]
  updateRoyaltyConfig: (i: number, field: 'share' | 'address', value: string) => void
  addRoyaltyConfig: () => void
  removeRoyaltyConfig: (i: number) => void
  distributeRoyaltyEvenly: () => void
  autoFillRoyaltyRemainder: () => void
  fundReceivers: ShareAddressRow[]
  updateFundReceiver: (i: number, field: 'share' | 'address', value: string) => void
  addFundReceiver: () => void
  removeFundReceiver: (i: number) => void
  distributeFundReceiversEvenly: () => void
  autoFillFundReceiversRemainder: () => void
  royaltySplitError: string | null
  royaltyTotal: number
  fundReceiverTotal: number
}

export default function CreateStep1Details(props: CreateStep1DetailsProps) {
  const {
    draftSavedAgo, identityValid, sectionTradingExpanded, sectionRevenueExpanded,
    setSectionTradingExpanded, setSectionRevenueExpanded, isRoyaltySplitValid, fundReceiverError,
    step1Errors, collectionName, setCollectionName, symbol, setSymbol, collectionDescription,
    setCollectionDescription, step1Touched, setStep1Touched, collectionNameRef, symbolRef,
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
        <div className="nft-create-step1-head">
          <h2 className="nft-create-step1-title">Collection Details</h2>
          {draftSavedAgo && (
            <div className="nft-create-draft-saved nft-create-draft-saved-topright" aria-live="polite">
              ✓ Draft saved {draftSavedAgo}
            </div>
          )}
        </div>

        <div className="nft-create-step1-progress" role="status" aria-label="Step 1 progress">
          <span className={`nft-create-step1-progress-item ${identityValid ? 'done' : 'active'}`}>{identityValid ? '✓' : '●'} Identity</span>
          <span className="nft-create-step1-progress-sep" aria-hidden>|</span>
          <span className={`nft-create-step1-progress-item ${sectionTradingExpanded ? 'done' : ''}`}>{sectionTradingExpanded ? '✓' : '●'} Trading</span>
          <span className="nft-create-step1-progress-sep" aria-hidden>|</span>
          <span className={`nft-create-step1-progress-item ${isRoyaltySplitValid && !fundReceiverError ? 'done' : ''}`}>{isRoyaltySplitValid && !fundReceiverError ? '✓' : '●'} Revenue</span>
        </div>

        <div className="nft-create-details-form">
          {/* Identity section */}
          <div className="nft-create-step1-section nft-create-step1-section-identity">
            <div className="nft-create-step1-section-head">
              <strong className="nft-create-details-section-title">Collection Identity</strong>
              {identityValid && <span className="nft-create-step1-badge" aria-label="Section complete">✓ Collection Identity Ready</span>}
            </div>
            <div className="nft-create-details-fields-row nft-create-details-fields-wrap">
              <div className="nft-create-details-field">
                <label className="nft-create-details-label" htmlFor="create-collection-name">
                  Collection Name
                  <span className="nft-create-tooltip-wrap nft-create-tooltip-details" title="The name of your collection eg. 'My NFTs'">
                    <span className="nft-create-tooltip-icon" aria-hidden>i</span>
                    <span className="nft-create-tooltip-text">The name of your collection eg. &apos;My NFTs&apos;, will be displayed as the title of your collection.</span>
                  </span>
                </label>
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
                  <span className="nft-create-tooltip-wrap nft-create-tooltip-details" title="Ticker symbol eg. 'MNFT'">
                    <span className="nft-create-tooltip-icon" aria-hidden>i</span>
                    <span className="nft-create-tooltip-text">This is the ticker or symbol which will be used to represent your collection on the blockchain eg. &apos;MNFT&apos;.</span>
                  </span>
                </label>
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

            {/* Images */}
            <div className="nft-create-step1-images-section">
              <strong className="nft-create-details-section-title">Collection PFP &amp; banner</strong>
              <div className="nft-create-step1-images-row">
                <div className="nft-create-details-field">
                  <label className="nft-create-details-label">Collection PFP</label>
                  <label className={`nft-create-upload nft-create-upload-square ${collectionImageUploading ? 'nft-create-upload--loading' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, 'collection')} aria-busy={collectionImageUploading}>
                    <input type="file" accept="image/png,image/jpeg,image/jpg" className="sr-only" onChange={(e) => onFileSelect(e, 'collection')} disabled={collectionImageUploading} />
                    {collectionImageUploading ? (
                      <div className="nft-create-upload-loading">Uploading…</div>
                    ) : collectionImage ? (
                      <div className="nft-create-preview-card nft-create-step1-collection-preview"><img src={collectionImage} alt="Collection" /></div>
                    ) : (
                      <><div className="nft-create-upload-text">Drop or select image</div><div className="nft-create-upload-hint">PNG / JPEG – square</div></>
                    )}
                  </label>
                  {collectionImageError && <span className="nft-create-inline-error" role="alert">{collectionImageError}</span>}
                </div>
                <div className="nft-create-details-field nft-create-step1-banner-field">
                  <label className="nft-create-details-label">Banner (optional)</label>
                  <label className={`nft-create-upload nft-create-upload-banner ${bannerImageUploading ? 'nft-create-upload--loading' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, 'banner')} aria-busy={bannerImageUploading}>
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

          {/* Trading Rules (collapsible) */}
          <div className={`nft-create-step1-section nft-create-step1-section-collapse ${sectionTradingExpanded ? 'expanded' : ''} ${!identityValid ? 'locked' : ''}`}>
            <button type="button" className="nft-create-step1-collapse-head" onClick={() => identityValid && setSectionTradingExpanded(!sectionTradingExpanded)} disabled={!identityValid} aria-expanded={sectionTradingExpanded} aria-disabled={!identityValid}>
              <span className="nft-create-step1-collapse-title">Trading Rules</span>
              <span className="nft-create-step1-collapse-hint">Required</span>
              <span className="nft-create-step1-collapse-chevron" aria-hidden>{sectionTradingExpanded ? '▼' : '▶'}</span>
            </button>
            {sectionTradingExpanded && (
              <div className="nft-create-step1-collapse-body">
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
                <div className="nft-create-mint-mode">
                  <div className="nft-create-mint-mode-header">
                    <span className="nft-create-mint-mode-label">How minters choose</span>
                  </div>
                  <div className="nft-create-mint-mode-grid" role="radiogroup" aria-label="Mint mode">
                    {MINT_MODES.map((opt) => (
                      <button key={opt.value} type="button" role="radio" aria-checked={mintMode === opt.value} className={`nft-create-mint-mode-card ${mintMode === opt.value ? 'nft-create-mint-mode-card--selected' : ''}`} onClick={() => setMintMode(opt.value)}>
                        <span className="nft-create-mint-mode-card-title">{opt.label}</span>
                        <span className="nft-create-mint-mode-card-desc">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="nft-create-details-options-panel">
                  <div className="nft-create-details-options-panel-title">Collection options</div>
                  <div className="nft-create-details-switch-row">
                    <button type="button" role="switch" aria-checked={freezeCollection} className={`nft-create-switch ${freezeCollection ? 'on' : ''}`} onClick={() => setFreezeCollection(!freezeCollection)}>
                      <span className="nft-create-switch-thumb" />
                    </button>
                    <div className="nft-create-details-switch-copy">
                      <div className="nft-create-details-switch-title"><strong>Freeze Collection</strong></div>
                      <span className="nft-create-details-switch-desc">While frozen, your NFTs cannot be traded.</span>
                    </div>
                  </div>
                  {freezeCollection && (
                    <div className="nft-create-details-freeze-until-row">
                      <div className="nft-create-details-freeze-until-copy">
                        <label className="nft-create-details-label" htmlFor="create-freeze-until-date">Unfreeze at date (optional)</label>
                        <p className="nft-create-details-freeze-until-desc">Trading stays frozen until this date. Leave empty to only unfreeze when sold out.</p>
                        <FreezzeUntilDatePicker id="create-freeze-until-date" value={freezeUntilDate} onChange={setFreezeUntilDate} placeholder="Pick date & time" className="nft-create-freeze-until-input" />
                      </div>
                    </div>
                  )}
                  <div className="nft-create-details-switch-row">
                    <button type="button" role="switch" aria-checked={revealLater} className={`nft-create-switch ${revealLater ? 'on' : ''}`} onClick={() => setRevealLater(!revealLater)}>
                      <span className="nft-create-switch-thumb" />
                    </button>
                    <div className="nft-create-details-switch-copy">
                      <div className="nft-create-details-switch-title"><strong>Reveal Later</strong></div>
                      <span className="nft-create-details-switch-desc">Use placeholder art revealed at a later time.</span>
                    </div>
                  </div>
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

          {/* Revenue configuration (collapsible) */}
          <div className={`nft-create-step1-section nft-create-step1-section-collapse ${sectionRevenueExpanded ? 'expanded' : ''}`}>
            <button type="button" className="nft-create-step1-collapse-head" onClick={() => setSectionRevenueExpanded(!sectionRevenueExpanded)} aria-expanded={sectionRevenueExpanded}>
              <span className="nft-create-step1-collapse-title">Revenue configuration</span>
              <span className="nft-create-step1-collapse-hint">Required</span>
              <span className="nft-create-step1-collapse-chevron" aria-hidden>{sectionRevenueExpanded ? '▼' : '▶'}</span>
            </button>
            {sectionRevenueExpanded && (
              <div className="nft-create-step1-collapse-body">
                <div className="nft-create-details-field" style={{ marginBottom: '1rem' }}>
                  <label className="nft-create-details-label" htmlFor="create-royalty-percent">Royalty % (0–50%)</label>
                  <div className="nft-create-display-row">
                    <input id="create-royalty-percent" type="number" className="nft-create-input nft-create-details-input nft-create-input-narrow" min={0} max={50} step={0.5} placeholder="5" value={royaltyPercent} onChange={(e) => { const v = parseFloat(e.target.value); setRoyaltyPercent(Number.isNaN(v) ? 0 : Math.min(50, Math.max(0, v))) }} aria-label="Royalty percentage 0 to 50" />
                    <span className="nft-create-char" aria-hidden>%</span>
                  </div>
                </div>

                {/* Secondary Royalty Split */}
                <div className="nft-create-split-panel">
                  <div className="nft-create-split-panel-header">
                    <div className="nft-create-split-panel-title-wrap">
                      <h3 className="nft-create-split-panel-title">Secondary Royalty Split</h3>
                      <p className="nft-create-split-panel-desc">Split secondary sale royalties between wallets. Shares must total 100%.</p>
                    </div>
                    <div className="nft-create-split-panel-actions">
                      <button type="button" className="nft-create-split-helper-btn" onClick={distributeRoyaltyEvenly}>Distribute evenly</button>
                      <button type="button" className="nft-create-split-helper-btn" onClick={autoFillRoyaltyRemainder}>Auto fill remainder</button>
                      <div className={`nft-create-split-total ${isRoyaltySplitValid ? 'valid' : 'invalid'}`} aria-live="polite">
                        <span className="nft-create-split-total-value">Total: {royaltyTotal.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  {royaltySplitError && <div className="nft-create-split-error-banner" role="alert">{royaltySplitError}</div>}
                  {Math.abs(royaltyTotal - 100) > 0.01 && <div className="nft-create-split-remaining" role="status">Remaining: {(100 - royaltyTotal).toFixed(1)}%</div>}
                  <ul className="nft-create-split-list">
                    {royaltyConfig.map((row, i) => {
                      const pct = parseFloat(row.share) || 0
                      const barWidth = royaltyTotal > 0 ? (pct / royaltyTotal) * 100 : 0
                      return (
                        <li key={i} className="nft-create-split-row-card">
                          <div className="nft-create-split-row-top">
                            <div className="nft-create-split-row-bar-wrap">
                              <div className="nft-create-split-row-bar" style={{ width: `${Math.min(100, barWidth)}%` }} />
                              <span className="nft-create-split-row-pct">{pct}%</span>
                            </div>
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
                  <button type="button" className="nft-create-split-add-btn" onClick={addRoyaltyConfig} disabled={royaltyConfig.length >= ROYALTY_SPLIT_MAX}>Add recipient</button>
                </div>

                {/* Mint Funds Split */}
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

// Coded by Juan - the form has spoken. Please fill it in correctly.
