'use client'

/**
 * CreateStep4Success - Step 4: Deploy & Review.
 * Summary of collection settings + deploy buttons.
 * The finish line. Finally.
 *
 * @author Juan - The developer who made the deploy button look scary on purpose
 * (Coded with care, humor, and probably too much coffee)
 */

import { PhaseRow } from './create-types'

const METADATA_STANDARDS = [
  { value: 'Core' as const, label: 'Standard (DAS)' },
  { value: 'Metaplex' as const, label: 'Legacy' },
  { value: 'CNFT' as const, label: 'Compressed' },
]

export interface CreateStep4SuccessProps {
  collectionName: string
  collectionImage: string | null
  totalSupply: string
  mintPrice: string
  freeMint: boolean
  royaltyPercent: number
  freezeCollection: boolean
  freezeUntilDate: string
  phases: PhaseRow[]
  metadataStandard: 'Core' | 'Metaplex' | 'CNFT'
  connected: boolean
  draftSavedAt: number | null
  onSaveDraft: () => void
  onStartNewCollection: () => void
}

export default function CreateStep4Success({
  collectionName, collectionImage, totalSupply, mintPrice, freeMint, royaltyPercent,
  freezeCollection, freezeUntilDate, phases, metadataStandard, connected, draftSavedAt,
  onSaveDraft, onStartNewCollection,
}: CreateStep4SuccessProps) {
  return (
    <div className="nft-create-step-main">
      <h2 className="nft-create-step-title">Deploy &amp; Review</h2>
      <div className="nft-create-summary-card">
        <div className="nft-create-summary-row">
          {collectionImage && <img src={collectionImage} alt="" className="nft-create-summary-thumb" />}
          <div className="nft-create-summary-meta">
            <h3>{collectionName || 'Collection name'}</h3>
            <p>Solana ◆ {METADATA_STANDARDS.find((m) => m.value === metadataStandard)?.label ?? 'Standard (DAS)'}</p>
            <ul className="nft-create-summary-list">
              <li>Supply: {totalSupply || '◆'}</li>
              <li>Mint price: {freeMint ? 'Free' : mintPrice || '◆'}</li>
              <li>Royalties: {royaltyPercent}%</li>
              <li>
                Freeze: {freezeCollection
                  ? freezeUntilDate
                    ? `until ${new Date(freezeUntilDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                    : 'until sold out'
                  : 'off'}
              </li>
              {phases.length > 0 && (
                <li>Phases: {phases.length} — {phases.map((p, i) => (p.name || `Phase ${i + 1}`)).join(', ')}</li>
              )}
              <li>Go live: on deploy</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="nft-create-field">
        <label className="nft-create-label">Pre-Flight Checks</label>
        <ul className="nft-create-checks">
          <li>Wallet connected</li>
          <li>Metadata valid</li>
          <li>Supply matches assets</li>
          <li>Royalties under limit</li>
        </ul>
      </div>
      <div className="nft-create-warning">Once deployed, collection settings cannot be changed.</div>
      <div className="nft-create-footer-actions" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button type="button" className="nft-create-btn nft-create-btn-secondary" onClick={onSaveDraft}>
          Save as Draft
        </button>
        <button type="button" className="nft-create-btn nft-create-btn-primary" disabled={!connected} aria-disabled={!connected}>
          Deploy Collection
        </button>
        <button type="button" className="nft-create-btn nft-create-btn-primary" disabled={!connected} aria-disabled={!connected}>
          Deploy &amp; Open Mint
        </button>
        <button type="button" className="nft-create-btn nft-create-btn-back" onClick={onStartNewCollection}>
          Create new collection
        </button>
      </div>
      {draftSavedAt && <div className="nft-create-draft-saved">✓ Draft saved</div>}
    </div>
  )
}

// Coded by Juan - hit deploy. We dare you.
