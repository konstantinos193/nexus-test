'use client'

/**
 * NftAssetToolOutputSection.tsx
 * Output form: name, description, URL, size, supply. Then Generate, progress bar, result panel + rarity list.
 * So many props we could've used a context – but we didn't. This is the way. (The prop-drilling way.)
 *
 * @author Juan – output janitor and progress-bar wrangler
 */

import Link from 'next/link'
import { Download } from 'lucide-react'
import type { RarityByLayer } from './nft-asset-utils'
import { hasRarity, formatEta } from './nft-asset-utils'

export interface GeneratedResult {
  imageBlobs: Blob[]
  metadataJsons: string[]
  rarityIndex: Array<{ tokenId: number; rank: number; score: number }>
}

export interface NftAssetToolOutputSectionProps {
  collectionNameBase: string
  setCollectionNameBase: (v: string) => void
  collectionDescription: string
  setCollectionDescription: (v: string) => void
  externalUrl: string
  setExternalUrl: (v: string) => void
  outputSize: 'layer' | '512' | '1024'
  setOutputSize: (v: 'layer' | '512' | '1024') => void
  supply: string
  setSupply: (v: string) => void
  layersCount: number
  validCombinationCount: number
  rarityByLayer: RarityByLayer
  generating: boolean
  progress: { current: number; total: number; startTime?: number }
  progressTick: number
  generated: GeneratedResult | null
  thumbnailUrls: string[] | null
  onGenerate: () => void
  onDownloadZip: () => void
}

export default function NftAssetToolOutputSection({
  collectionNameBase,
  setCollectionNameBase,
  collectionDescription,
  setCollectionDescription,
  externalUrl,
  setExternalUrl,
  outputSize,
  setOutputSize,
  supply,
  setSupply,
  layersCount,
  validCombinationCount,
  rarityByLayer,
  generating,
  progress,
  progressTick,
  generated,
  thumbnailUrls,
  onGenerate,
  onDownloadZip,
}: NftAssetToolOutputSectionProps) {
  const supplyNum = supply.trim() ? Math.min(2000, Math.max(1, parseInt(supply, 10) || 0)) : null
  const toGenerate = supplyNum != null ? Math.min(supplyNum, validCombinationCount) : Math.min(validCombinationCount, 2000)

  return (
    <details
      className="nft-asset-tool-section nft-asset-tool-details"
      open
      aria-labelledby="output-heading"
    >
      <summary id="output-heading" className="nft-asset-tool-section-title nft-asset-tool-details-summary">
        Output
      </summary>

      <div className="nft-asset-tool-field">
        <label className="nft-asset-tool-label" htmlFor="collection-name-base">
          Collection name (for metadata)
        </label>
        <input
          id="collection-name-base"
          type="text"
          className="nft-asset-tool-input"
          placeholder="Name"
          value={collectionNameBase}
          onChange={(e) => setCollectionNameBase(e.target.value)}
        />
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.25rem' }}>
          Each token will be named &quot;{collectionNameBase.trim() || 'NFT'}&quot; #0, #1, …
        </p>
      </div>

      <div className="nft-asset-tool-field">
        <label className="nft-asset-tool-label" htmlFor="collection-description">
          Description (optional)
        </label>
        <textarea
          id="collection-description"
          className="nft-asset-tool-textarea"
          placeholder="A unique NFT from the collection."
          value={collectionDescription}
          onChange={(e) => setCollectionDescription(e.target.value)}
          rows={2}
        />
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.25rem' }}>
          Same description for every token in the metadata.
        </p>
      </div>

      <div className="nft-asset-tool-field">
        <label className="nft-asset-tool-label" htmlFor="external-url">
          External URL (optional)
        </label>
        <input
          id="external-url"
          type="url"
          className="nft-asset-tool-input"
          placeholder="https://..."
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
        />
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.25rem' }}>
          Project or collection link; written to <code>external_url</code> in metadata.
        </p>
      </div>

      <div className="nft-asset-tool-field">
        <label className="nft-asset-tool-label">Output image size</label>
        <div className="nft-asset-tool-radios">
          {[
            { value: 'layer' as const, label: 'Use layer size' },
            { value: '512' as const, label: '512×512' },
            { value: '1024' as const, label: '1024×1024' },
          ].map(({ value, label }) => (
            <label key={value} className="nft-asset-tool-radio-wrap">
              <input
                type="radio"
                name="output-size"
                value={value}
                checked={outputSize === value}
                onChange={() => setOutputSize(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.25rem' }}>
          Layers are scaled to this size. Use layer size to keep original dimensions.
        </p>
      </div>

      <div className="nft-asset-tool-field">
        <label className="nft-asset-tool-label" htmlFor="supply">
          Supply
        </label>
        <div className="nft-asset-tool-supply-row">
          <input
            id="supply"
            type="number"
            min={1}
            max={2000}
            className="nft-asset-tool-input nft-asset-tool-input-narrow"
            placeholder="Leave empty = all combos (max 2000)"
            value={supply}
            onChange={(e) => setSupply(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <span className="nft-asset-tool-supply-presets-label">Quick:</span>
          {[100, 500, 1000].map((n) => (
            <button
              key={n}
              type="button"
              className={`nft-asset-tool-btn nft-asset-tool-btn-outline nft-asset-tool-supply-preset ${supply === String(n) ? 'active' : ''}`}
              onClick={() => setSupply(String(n))}
            >
              {n}
            </button>
          ))}
          {supply.trim() && (
            <button
              type="button"
              className="nft-asset-tool-btn nft-asset-tool-btn-outline nft-asset-tool-supply-preset"
              onClick={() => setSupply('')}
            >
              Clear
            </button>
          )}
        </div>
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.25rem' }}>
          Number of NFTs to generate (1–2000). Leave empty to use all valid combinations, capped at
          2000.
        </p>
        {layersCount > 0 && validCombinationCount > 0 && (
          <p
            className="nft-asset-tool-upload-hint nft-asset-tool-supply-summary"
            style={{ marginTop: '0.5rem' }}
          >
            <strong>Supply for this run:</strong>{' '}
            {supply.trim()
              ? (() => {
                  const s = Math.min(2000, Math.max(1, parseInt(supply, 10) || 0))
                  const n = Math.min(s, validCombinationCount)
                  return `${n} NFT${n !== 1 ? 's' : ''}${n < validCombinationCount ? ` (of ${validCombinationCount} valid)` : ''}`
                })()
              : `${Math.min(validCombinationCount, 2000)} NFT${Math.min(validCombinationCount, 2000) !== 1 ? 's' : ''} (all combos, max 2000)`}
          </p>
        )}
      </div>

      {layersCount > 0 && validCombinationCount > 0 && !generating && (
        <div className="nft-asset-tool-summary-card" role="status">
          <div className="nft-asset-tool-summary-title">Ready to generate</div>
          <ul className="nft-asset-tool-summary-list">
            <li>
              {layersCount} layer{layersCount !== 1 ? 's' : ''}
            </li>
            <li>
              {validCombinationCount.toLocaleString()} valid combination
              {validCombinationCount !== 1 ? 's' : ''}
            </li>
            <li>
              Supply:{' '}
              {supply.trim()
                ? (() => {
                    const s = Math.min(2000, Math.max(1, parseInt(supply, 10) || 0))
                    return `${Math.min(s, validCombinationCount)} NFT${Math.min(s, validCombinationCount) !== 1 ? 's' : ''}`
                  })()
                : `${Math.min(validCombinationCount, 2000)} (all combos, max 2000)`}
            </li>
            <li>Rarity: {hasRarity(rarityByLayer) ? 'weighted random' : 'equal chance'}</li>
          </ul>
        </div>
      )}

      <div className="nft-asset-tool-actions">
        <button
          type="button"
          className="nft-asset-tool-btn nft-asset-tool-btn-primary"
          disabled={layersCount === 0 || generating || validCombinationCount === 0}
          onClick={onGenerate}
        >
          {generating
            ? 'Generating…'
            : (() => {
                const s = supply.trim()
                  ? Math.min(2000, Math.max(1, parseInt(supply, 10) || 0))
                  : null
                const n =
                  s != null ? Math.min(s, validCombinationCount) : Math.min(validCombinationCount, 2000)
                return `Generate images + metadata · supply ${n}${s != null && n < validCombinationCount ? ` of ${validCombinationCount}` : ''}`
              })()}
        </button>
      </div>

      {generating && (
        <div className="nft-asset-tool-progress-wrap">
          <div className="nft-asset-tool-progress-stats">
            <span className="nft-asset-tool-progress-count">
              {progress.current} / {progress.total} NFT{progress.total !== 1 ? 's' : ''}
            </span>
            <span className="nft-asset-tool-progress-pct">
              {progress.total ? Math.round((100 * progress.current) / progress.total) : 0}%
            </span>
            {progress.current > 0 &&
              progress.startTime != null &&
              progress.total > progress.current && (
                <span className="nft-asset-tool-progress-eta">
                  {formatEta(
                    ((progress.total - progress.current) *
                      ((progressTick || Date.now()) - progress.startTime)) /
                      progress.current
                  )}{' '}
                  left
                </span>
              )}
          </div>
          <div
            className="nft-asset-tool-progress"
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label={`${progress.current} of ${progress.total} NFTs generated`}
          >
            <div
              className="nft-asset-tool-progress-bar"
              style={{
                width: `${progress.total ? (100 * progress.current) / progress.total : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {generated && !generating && (
        <div className="nft-asset-tool-result-layout">
          <div className="nft-asset-tool-result">
            <div className="nft-asset-tool-result-header">
              <span className="nft-asset-tool-result-badge">Ready</span>
              <span className="nft-asset-tool-result-count">
                {generated.imageBlobs.length} images · {generated.metadataJsons.length} metadata
              </span>
            </div>
            <p className="nft-asset-tool-result-hint">
              Download the ZIP, unzip, then on{' '}
              <Link href="/create" className="nft-asset-tool-link">
                Create
              </Link>{' '}
              drop the <strong>images</strong> and <strong>metadata</strong> folders in Step 2.
            </p>
            <button
              type="button"
              className="nft-asset-tool-btn nft-asset-tool-btn-primary nft-asset-tool-result-btn"
              onClick={onDownloadZip}
            >
              <Download size={18} aria-hidden />
              Download ZIP
            </button>
          </div>
          <aside className="nft-asset-tool-rarity-panel" aria-label="Rarity list">
            <h3 className="nft-asset-tool-rarity-panel-title">Rarity</h3>
            <p className="nft-asset-tool-rarity-panel-desc">
              Rank 1 = rarest, rank {generated.rarityIndex.length} = commonest (like Magic Eden).
              Score = trait rarity — higher = rarer.
            </p>
            <div className="nft-asset-tool-rarity-list-wrap">
              <div className="nft-asset-tool-rarity-list-header">
                <span aria-hidden />
                <span>Rank</span>
                <span>NFT</span>
                <span>Score</span>
              </div>
              <ul className="nft-asset-tool-rarity-list" role="list">
                {[...generated.rarityIndex]
                  .sort((a, b) => a.rank - b.rank)
                  .map((r) => (
                    <li key={r.tokenId} className="nft-asset-tool-rarity-row">
                      {thumbnailUrls?.[r.tokenId] ? (
                        <img
                          src={thumbnailUrls[r.tokenId]}
                          alt=""
                          className="nft-asset-tool-rarity-thumb"
                          width={40}
                          height={40}
                          loading="lazy"
                        />
                      ) : (
                        <span className="nft-asset-tool-rarity-thumb-placeholder" aria-hidden />
                      )}
                      <span className="nft-asset-tool-rarity-rank">#{r.rank}</span>
                      <span className="nft-asset-tool-rarity-token">NFT {r.tokenId}</span>
                      <span
                        className="nft-asset-tool-rarity-score"
                        title="Higher = rarer"
                      >
                        {r.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </details>
  )
}

// — Juan. Hit Generate. Wait. Download ZIP. We believe in you. (We've seen the ETA.)
