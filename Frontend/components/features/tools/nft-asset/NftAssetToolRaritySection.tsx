'use client'

/**
 * NftAssetToolRaritySection.tsx - Trait rarity accordion: set % per value, rename for metadata.
 * Percentages are weights for generation – leave empty for equal chance. We're not monsters.
 * Operates on data from the parent; we're just the renderer. A pure herald of sliders.
 *
 * @author Juan – rarity wrangler, percentage pedant, and reformed CSS class author
 */

// Layer types and helpers – the oracle of what values each layer has
import {
  type LayerFolder,
  type RarityByLayer,
  type ValueNameOverrides,
  getLayerValues,
} from './nft-asset-utils'

export interface NftAssetToolRaritySectionProps {
  sortedLayersStable: LayerFolder[]
  rarityByLayer: RarityByLayer
  valueNameOverrides: ValueNameOverrides
  setRarityPct: (layerId: string, valueName: string, pct: string) => void
  distributeRarityEvenly: (layerId: string) => void
  setValueDisplayName: (layerId: string, valueName: string, displayName: string) => void
}

export default function NftAssetToolRaritySection({
  sortedLayersStable,
  rarityByLayer,
  valueNameOverrides,
  setRarityPct,
  distributeRarityEvenly,
  setValueDisplayName,
}: NftAssetToolRaritySectionProps) {
  return (
    <section aria-labelledby="rarity-heading" className="space-y-4">
      <div>
        <h2 id="rarity-heading" className="text-base font-semibold text-dark-text-primary">
          Trait rarity
        </h2>
        <p className="mt-1 text-sm text-dark-text-tertiary">
          Set a generation % per value — each NFT is a unique combo (no duplicates).
          Rename = display name in metadata. Leave % empty for equal chance.
        </p>
      </div>

      {/* One accordion card per layer */}
      <div className="space-y-2">
        {sortedLayersStable.map((layer) => {
          const values = getLayerValues(layer)
          const layerRarity = rarityByLayer[layer.id] ?? {}
          const total = values.reduce((sum, v) => sum + (parseFloat(layerRarity[v]) || 0), 0)
          const isTotalOff = values.length > 0 && total > 0 && Math.abs(total - 100) > 0.5

          return (
            <details
              key={layer.id}
              className="overflow-hidden rounded-xl border border-dark-border-primary bg-dark-bg-secondary"
            >
              {/* Layer summary row: name, value count, total %, distribute button */}
              <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-dark-bg-hover">
                <span className="text-sm font-medium text-dark-text-primary">{layer.name}</span>
                <span className="ml-auto text-xs text-dark-text-tertiary">
                  {values.length} values · Total {total.toFixed(0)}%
                  {isTotalOff && (
                    <span className="ml-1.5 text-dark-accent-warning"> (normalised on gen)</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    // Stop the click from toggling the <details> open/closed
                    e.preventDefault()
                    distributeRarityEvenly(layer.id)
                  }}
                  className="shrink-0 rounded-lg border border-dark-border-primary px-2.5 py-1 text-xs text-dark-text-secondary transition-colors hover:border-dark-border-secondary hover:text-dark-text-primary"
                >
                  Distribute equally
                </button>
              </summary>

              {/* Per-value rows: original name | rename input | % input */}
              <div className="divide-y divide-dark-border-primary border-t border-dark-border-primary">
                {values.map((valueName) => (
                  <div
                    key={valueName}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    {/* Original filename-derived name */}
                    <span
                      className="w-36 shrink-0 truncate text-sm text-dark-text-secondary"
                      title={valueName}
                    >
                      {valueName}
                    </span>

                    {/* Display name override (written into metadata) */}
                    <input
                      type="text"
                      placeholder="Rename…"
                      value={valueNameOverrides[layer.id]?.[valueName] ?? ''}
                      onChange={(e) => setValueDisplayName(layer.id, valueName, e.target.value)}
                      aria-label={`Display name for ${valueName}`}
                      className="flex-1 rounded-md border border-dark-border-primary bg-dark-bg-primary px-2.5 py-1.5 text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:border-dark-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                    />

                    {/* Rarity percentage weight */}
                    <label
                      htmlFor={`rarity-${layer.id}-${valueName}`}
                      className="flex shrink-0 items-center gap-1"
                    >
                      <input
                        id={`rarity-${layer.id}-${valueName}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="—"
                        value={layerRarity[valueName] ?? ''}
                        onChange={(e) => setRarityPct(layer.id, valueName, e.target.value)}
                        className="w-16 rounded-md border border-dark-border-primary bg-dark-bg-primary px-2.5 py-1.5 text-right text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:border-dark-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                      />
                      <span className="text-sm text-dark-text-tertiary">%</span>
                    </label>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}

// — Juan. Set your percentages. Or don't. We'll normalize and move on.
