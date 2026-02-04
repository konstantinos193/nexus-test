'use client'

/**
 * NftAssetToolExclusionsSection.tsx
 * Trait exclusions: "When Layer A is X and Layer B is Y, skip this combo."
 * Because some combinations are cursed and we're not shipping laser eyes on blue background.
 *
 * @author Juan – exclusion enforcer and combo gatekeeper
 */

import { X } from 'lucide-react'
import CustomDropdown from '@/components/features/collections/CustomDropdown'
import type { ExclusionRule, LayerFolder, ValueNameOverrides } from './nft-asset-utils'
import { getLayerValues, getDisplayName } from './nft-asset-utils'

export interface NftAssetToolExclusionsSectionProps {
  exclusionRules: ExclusionRule[]
  sortedLayersStable: LayerFolder[]
  valueNameOverrides: ValueNameOverrides
  totalCombinations: number
  validCombinationCount: number
  addExclusionRule: () => void
  removeExclusionRule: (id: string) => void
  updateExclusionRule: (id: string, field: keyof ExclusionRule, value: string) => void
}

export default function NftAssetToolExclusionsSection({
  exclusionRules,
  sortedLayersStable,
  valueNameOverrides,
  totalCombinations,
  validCombinationCount,
  addExclusionRule,
  removeExclusionRule,
  updateExclusionRule,
}: NftAssetToolExclusionsSectionProps) {
  return (
    <details
      className="nft-asset-tool-section nft-asset-tool-details"
      aria-labelledby="exclusions-heading"
    >
      <summary id="exclusions-heading" className="nft-asset-tool-section-title nft-asset-tool-details-summary">
        Trait exclusions
      </summary>
      <p className="nft-asset-tool-upload-hint" style={{ marginBottom: '1rem' }}>
        Exclude combinations where two traits have specific values together. E.g. &quot;Background:
        Blue&quot; + &quot;Eyes: Laser&quot; = skip.
      </p>
      {exclusionRules.length === 0 ? (
        <p className="nft-asset-tool-upload-hint nft-asset-tool-exclusions-empty">
          No exclusions — all combinations are valid. Add a rule to skip specific trait pairs (e.g.
          Blue background + Laser eyes).
        </p>
      ) : null}
      {exclusionRules.map((rule) => {
        const layerA = sortedLayersStable.find((l) => l.id === rule.layerAId)
        const layerB = sortedLayersStable.find((l) => l.id === rule.layerBId)
        const valuesA = layerA ? getLayerValues(layerA) : []
        const valuesB = layerB ? getLayerValues(layerB) : []
        return (
          <div key={rule.id} className="nft-asset-tool-exclusion-row">
            <span className="nft-asset-tool-exclusion-label">When</span>
            <div className="nft-asset-tool-exclusion-dropdown nft-asset-tool-exclusion-dropdown-layer">
              <CustomDropdown
                value={rule.layerAId}
                options={sortedLayersStable
                  .filter((l) => l.id !== rule.layerBId)
                  .map((l) => ({ value: l.id, label: l.name }))}
                onChange={(v) => updateExclusionRule(rule.id, 'layerAId', v)}
                placeholder="Layer"
                size="sm"
                variant="dark"
              />
            </div>
            <span className="nft-asset-tool-exclusion-label">is</span>
            <div className="nft-asset-tool-exclusion-dropdown nft-asset-tool-exclusion-dropdown-value">
              <CustomDropdown
                value={rule.valueA}
                options={valuesA.map((v) => ({
                  value: v,
                  label: getDisplayName(rule.layerAId, v, valueNameOverrides),
                }))}
                onChange={(v) => updateExclusionRule(rule.id, 'valueA', v)}
                placeholder="Value"
                size="sm"
                variant="dark"
              />
            </div>
            <span className="nft-asset-tool-exclusion-label">, exclude when</span>
            <div className="nft-asset-tool-exclusion-dropdown nft-asset-tool-exclusion-dropdown-layer">
              <CustomDropdown
                value={rule.layerBId}
                options={sortedLayersStable
                  .filter((l) => l.id !== rule.layerAId)
                  .map((l) => ({ value: l.id, label: l.name }))}
                onChange={(v) => updateExclusionRule(rule.id, 'layerBId', v)}
                placeholder="Layer"
                size="sm"
                variant="dark"
              />
            </div>
            <span className="nft-asset-tool-exclusion-label">is</span>
            <div className="nft-asset-tool-exclusion-dropdown nft-asset-tool-exclusion-dropdown-value">
              <CustomDropdown
                value={rule.valueB}
                options={valuesB.map((v) => ({
                  value: v,
                  label: getDisplayName(rule.layerBId, v, valueNameOverrides),
                }))}
                onChange={(v) => updateExclusionRule(rule.id, 'valueB', v)}
                placeholder="Value"
                size="sm"
                variant="dark"
              />
            </div>
            <button
              type="button"
              className="nft-asset-tool-btn nft-asset-tool-btn-remove nft-asset-tool-exclusion-remove"
              onClick={() => removeExclusionRule(rule.id)}
              aria-label="Remove rule"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        className="nft-asset-tool-btn nft-asset-tool-btn-outline nft-asset-tool-add-trait"
        onClick={addExclusionRule}
      >
        Add exclusion rule
      </button>
      {exclusionRules.length > 0 && (
        <p className="nft-asset-tool-upload-hint" style={{ marginTop: '0.75rem' }}>
          {totalCombinations} total → <strong>{validCombinationCount} valid</strong> after exclusions.
        </p>
      )}
    </details>
  )
}

// — Juan. Add a rule. Remove a rule. We're not judging. (We're judging.)
