'use client'

/**
 * NftAssetToolRaritySection.tsx
 * Trait rarity accordion: set % per value, rename for metadata, "Distribute equally."
 * Percentages are weights for generation – leave empty for equal chance. We're not monsters.
 *
 * @author Juan – rarity wrangler and percentage pedant
 */

import { type LayerFolder, type RarityByLayer, type ValueNameOverrides, getLayerValues } from './nft-asset-utils'

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
    <details
      className="nft-asset-tool-section nft-asset-tool-details"
      aria-labelledby="rarity-heading"
    >
      <summary id="rarity-heading" className="nft-asset-tool-section-title nft-asset-tool-details-summary">
        Trait rarity (generation %)
      </summary>
      <p className="nft-asset-tool-upload-hint nft-asset-tool-upload-hint-compact">
        Percentages are weights for the supply you generate — each NFT is a unique combination (no
        duplicates). Set chance per value; Rename = display in metadata. Leave % empty for equal.
      </p>
      <div className="nft-asset-tool-rarity-accordion">
        {sortedLayersStable.map((layer) => {
          const values = getLayerValues(layer)
          const layerRarity = rarityByLayer[layer.id] ?? {}
          const total = values.reduce((sum, v) => sum + (parseFloat(layerRarity[v]) || 0), 0)
          return (
            <details key={layer.id} className="nft-asset-tool-rarity-layer">
              <summary className="nft-asset-tool-rarity-layer-summary">
                <span>{layer.name}</span>
                <span className="nft-asset-tool-rarity-layer-meta">
                  {values.length} values · Total {total.toFixed(0)}%
                </span>
                <button
                  type="button"
                  className="nft-asset-tool-btn nft-asset-tool-btn-outline nft-asset-tool-rarity-distribute"
                  onClick={(e) => {
                    e.preventDefault()
                    distributeRarityEvenly(layer.id)
                  }}
                >
                  Distribute equally
                </button>
              </summary>
              <div className="nft-asset-tool-rarity-list">
                {values.map((valueName) => (
                  <div key={valueName} className="nft-asset-tool-rarity-row">
                    <span className="nft-asset-tool-rarity-value-name" title={valueName}>
                      {valueName}
                    </span>
                    <input
                      type="text"
                      className="nft-asset-tool-input nft-asset-tool-rarity-rename"
                      placeholder="Rename…"
                      value={valueNameOverrides[layer.id]?.[valueName] ?? ''}
                      onChange={(e) => setValueDisplayName(layer.id, valueName, e.target.value)}
                      aria-label={`Display name for ${valueName}`}
                    />
                    <label
                      className="nft-asset-tool-rarity-pct-wrap"
                      htmlFor={`rarity-${layer.id}-${valueName}`}
                    >
                      <input
                        id={`rarity-${layer.id}-${valueName}`}
                        type="text"
                        inputMode="decimal"
                        className="nft-asset-tool-input nft-asset-tool-rarity-input"
                        placeholder="—"
                        value={layerRarity[valueName] ?? ''}
                        onChange={(e) => setRarityPct(layer.id, valueName, e.target.value)}
                      />
                      <span className="nft-asset-tool-rarity-suffix">%</span>
                    </label>
                  </div>
                ))}
              </div>
              {values.length > 0 && total > 0 && Math.abs(total - 100) > 0.5 && (
                <p className="nft-asset-tool-upload-hint nft-asset-tool-rarity-total">
                  <span className="nft-asset-tool-rarity-normalize">
                    Normalized to 100% when generating
                  </span>
                </p>
              )}
            </details>
          )
        })}
      </div>
    </details>
  )
}

// — Juan. Set your percentages. Or don't. We'll normalize and move on.
