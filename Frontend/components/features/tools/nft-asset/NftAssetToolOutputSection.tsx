'use client'

/**
 * NftAssetToolOutputSection.tsx - The final step: name, description, size, supply, then generate.
 * After generation, shows a progress bar, result card, and the full rarity ranking.
 * The progress bar width is the one place style={{}} is allowed – it's genuinely dynamic.
 *
 * @author Juan – output janitor, progress-bar wrangler, reformed CSS-class factory worker
 */

// The download icon and a link to /create for post-generation instructions
import Link from 'next/link'
import { Download } from 'lucide-react'

// hasRarity checks if any weights are set
import { type RarityByLayer, hasRarity } from './nft-asset-utils'

// Generation now happens on the backend; we only hold the download token + rarity data
export interface GeneratedResult {
  token: string
  count: number
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
  progress: { current: number; total: number }
  generated: GeneratedResult | null
  onGenerate: () => void
  onDownloadZip: () => void
}

// Shared label + input wrapper classes
const fieldClass = 'space-y-1.5'
const labelClass = 'block text-sm font-medium text-dark-text-secondary'
const inputClass =
  'w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2.5 text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:border-dark-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors'
const hintClass = 'text-xs text-dark-text-tertiary'

// eslint-disable-next-line max-lines-per-function, complexity
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
  generated,
  onGenerate,
  onDownloadZip,
}: NftAssetToolOutputSectionProps) {
  // Resolve the effective supply number for display
  const effectiveSupply = supply.trim()
    ? Math.min(2000, Math.max(1, parseInt(supply, 10) || 0))
    : null
  const toGenerate =
    effectiveSupply != null
      ? Math.min(effectiveSupply, validCombinationCount)
      : Math.min(validCombinationCount, 2000)

  const progressPct = progress.total ? (100 * progress.current) / progress.total : 0

  return (
    <section aria-labelledby="output-heading" className="space-y-6">
      <h2 id="output-heading" className="text-base font-semibold text-dark-text-primary">
        Output settings
      </h2>

      {/* Collection name */}
      <div className={fieldClass}>
        <label htmlFor="collection-name-base" className={labelClass}>
          Collection name
        </label>
        <input
          id="collection-name-base"
          type="text"
          className={inputClass}
          placeholder="My NFT"
          value={collectionNameBase}
          onChange={(e) => setCollectionNameBase(e.target.value)}
        />
        <p className={hintClass}>
          Each token: &quot;{collectionNameBase.trim() || 'NFT'}&quot; #0, #1, …
        </p>
      </div>

      {/* Description */}
      <div className={fieldClass}>
        <label htmlFor="collection-description" className={labelClass}>
          Description <span className="font-normal text-dark-text-tertiary">(optional)</span>
        </label>
        <textarea
          id="collection-description"
          className={inputClass}
          placeholder="A unique NFT from the collection."
          value={collectionDescription}
          onChange={(e) => setCollectionDescription(e.target.value)}
          rows={2}
        />
        <p className={hintClass}>Same description in every token&apos;s metadata.</p>
      </div>

      {/* External URL */}
      <div className={fieldClass}>
        <label htmlFor="external-url" className={labelClass}>
          External URL <span className="font-normal text-dark-text-tertiary">(optional)</span>
        </label>
        <input
          id="external-url"
          type="url"
          className={inputClass}
          placeholder="https://…"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
        />
        <p className={hintClass}>
          Written to <code className="rounded bg-dark-bg-primary px-1 py-0.5">external_url</code>{' '}
          in metadata.
        </p>
      </div>

      {/* Image output size */}
      <div className={fieldClass}>
        <span className={labelClass}>Output image size</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: 'layer' as const, label: 'Use layer size' },
              { value: '512' as const, label: '512 × 512' },
              { value: '1024' as const, label: '1024 × 1024' },
            ] as const
          ).map(({ value, label }) => (
            <label
              key={value}
              className={[
                'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors',
                outputSize === value
                  ? 'border-dark-accent-primary/40 bg-dark-accent-primary/10 text-dark-accent-primary'
                  : 'border-dark-border-primary text-dark-text-secondary hover:border-dark-border-secondary hover:text-dark-text-primary',
              ].join(' ')}
            >
              <input
                type="radio"
                name="output-size"
                value={value}
                checked={outputSize === value}
                onChange={() => setOutputSize(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        <p className={hintClass}>Layers are scaled to this size during compositing.</p>
      </div>

      {/* Supply */}
      <div className={fieldClass}>
        <label htmlFor="supply" className={labelClass}>
          Supply
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="supply"
            type="number"
            min={1}
            max={2000}
            className={[inputClass, 'w-40'].join(' ')}
            placeholder="All combos (max 2000)"
            value={supply}
            onChange={(e) => setSupply(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <span className="text-xs text-dark-text-tertiary">Quick:</span>
          {[100, 500, 1000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSupply(String(n))}
              className={[
                'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                supply === String(n)
                  ? 'border-dark-accent-primary/40 bg-dark-accent-primary/10 text-dark-accent-primary'
                  : 'border-dark-border-primary text-dark-text-secondary hover:border-dark-border-secondary hover:text-dark-text-primary',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
          {supply.trim() && (
            <button
              type="button"
              onClick={() => setSupply('')}
              className="rounded-lg border border-dark-border-primary px-3 py-1.5 text-sm text-dark-text-tertiary transition-colors hover:border-dark-border-secondary hover:text-dark-text-secondary"
            >
              Clear
            </button>
          )}
        </div>
        <p className={hintClass}>
          1–2000. Leave empty to use all valid combinations (capped at 2000).
        </p>
        {layersCount > 0 && validCombinationCount > 0 && (
          <p className="mt-1 text-sm font-medium text-dark-text-secondary">
            This run:{' '}
            <span className="text-dark-text-primary">
              {toGenerate.toLocaleString()} NFT{toGenerate !== 1 ? 's' : ''}
            </span>
            {effectiveSupply != null && toGenerate < validCombinationCount && (
              <span className="text-dark-text-tertiary">
                {' '}
                (of {validCombinationCount.toLocaleString()} valid)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Ready summary card */}
      {layersCount > 0 && validCombinationCount > 0 && !generating && (
        <div
          className="rounded-xl border border-dark-accent-success/20 bg-dark-accent-success/5 px-5 py-4"
          role="status"
        >
          <p className="mb-2 text-sm font-semibold text-dark-accent-success">Ready to generate</p>
          <ul className="space-y-0.5 text-sm text-dark-text-secondary">
            <li>
              {layersCount} layer{layersCount !== 1 ? 's' : ''}
            </li>
            <li>{validCombinationCount.toLocaleString()} valid combinations</li>
            <li>
              Supply: {toGenerate.toLocaleString()} NFT{toGenerate !== 1 ? 's' : ''}
            </li>
            <li>Rarity: {hasRarity(rarityByLayer) ? 'weighted random' : 'equal chance'}</li>
          </ul>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        disabled={layersCount === 0 || generating || validCombinationCount === 0}
        onClick={onGenerate}
        className="w-full rounded-xl border border-dark-accent-primary/30 bg-dark-accent-primary/10 px-6 py-3.5 text-sm font-semibold text-dark-accent-primary transition-colors hover:border-dark-accent-primary/50 hover:bg-dark-accent-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating
          ? 'Generating…'
          : `Generate images + metadata · supply ${toGenerate.toLocaleString()}`}
      </button>

      {/* Indeterminate spinner while backend is generating */}
      {generating && (
        <div className="flex items-center gap-3 rounded-xl border border-dark-border-primary bg-dark-bg-secondary px-4 py-3">
          <span
            className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-dark-accent-primary border-t-transparent"
            style={{ animation: 'nft-asset-spin 0.8s linear infinite' }}
            aria-hidden
          />
          <span className="text-sm text-dark-text-secondary">
            Generating on server — the page won&apos;t freeze.
          </span>
        </div>
      )}

      {/* Result card + rarity panel */}
      {generated && !generating && (
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Download card */}
          <div className="flex-1 rounded-xl border border-dark-accent-primary/20 bg-dark-accent-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full border border-dark-accent-success/30 bg-dark-accent-success/10 px-2.5 py-0.5 text-xs font-semibold text-dark-accent-success">
                Ready
              </span>
              <span className="text-sm text-dark-text-tertiary">
                {generated.count} images · {generated.count} metadata
              </span>
            </div>
            <p className="mb-4 text-sm text-dark-text-secondary">
              Download the ZIP, unzip it, then on{' '}
              <Link href="/create" className="text-dark-accent-primary hover:underline">
                Create
              </Link>{' '}
              drop the <strong>images</strong> and <strong>metadata</strong> folders in Step 2.
            </p>
            <button
              type="button"
              onClick={onDownloadZip}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dark-accent-primary/30 bg-dark-accent-primary/10 px-4 py-3 text-sm font-semibold text-dark-accent-primary transition-colors hover:border-dark-accent-primary/50 hover:bg-dark-accent-primary/15"
            >
              <Download size={16} aria-hidden />
              Download ZIP
            </button>
          </div>

          {/* Rarity panel */}
          <aside
            className="flex w-full flex-col lg:w-72"
            aria-label="Rarity list"
          >
            <div className="rounded-t-xl border border-b-0 border-dark-border-primary bg-dark-bg-secondary px-4 py-3">
              <h3 className="text-sm font-semibold text-dark-text-primary">Rarity</h3>
              <p className="mt-0.5 text-xs text-dark-text-tertiary">
                Rank 1 = rarest. Score = sum of trait frequencies.
              </p>
            </div>
            {/* Header row */}
            <div className="grid grid-cols-[40px_40px_1fr_52px] items-center gap-2 border border-b-0 border-dark-border-primary bg-dark-bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wider text-dark-text-tertiary">
              <span />
              <span>Rank</span>
              <span>NFT</span>
              <span className="text-right">Score</span>
            </div>
            {/* Scrollable list */}
            <ul
              className="max-h-80 overflow-y-auto rounded-b-xl border border-dark-border-primary bg-dark-bg-secondary"
              role="list"
            >
              {[...generated.rarityIndex]
                .sort((a, b) => a.rank - b.rank)
                .map((r) => (
                  <li
                    key={r.tokenId}
                    className="grid grid-cols-[40px_40px_1fr_52px] items-center gap-2 border-b border-dark-border-primary px-4 py-2 last:border-b-0"
                  >
                    {/* Thumbnails not available — images are on the server */}
                    <span className="h-8 w-8 rounded border border-dark-border-primary bg-dark-bg-primary" />
                    <span className="text-xs font-semibold text-dark-accent-primary">
                      #{r.rank}
                    </span>
                    <span className="text-xs text-dark-text-secondary">NFT {r.tokenId}</span>
                    <span
                      className="text-right text-xs font-mono text-dark-text-tertiary"
                      title="Higher = rarer"
                    >
                      {r.score.toFixed(2)}
                    </span>
                  </li>
                ))}
            </ul>
          </aside>
        </div>
      )}
    </section>
  )
}

// — Juan. Hit Generate. Wait. Download ZIP. We believe in you. (We've seen the ETA.)
