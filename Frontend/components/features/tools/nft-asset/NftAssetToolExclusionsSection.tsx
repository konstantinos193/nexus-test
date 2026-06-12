'use client'

/**
 * NftAssetToolExclusionsSection.tsx - Trait exclusions.
 * "When Layer A is X and Layer B is Y, skip this combo."
 * Because some combinations are cursed (laser eyes on a blue background, etc.)
 * CustomDropdown handles the actual selects — we just wire them up.
 *
 * @author Juan – exclusion enforcer, combo gatekeeper, reformed inline-style offender
 */

// The X button for removing a rule
import { X } from 'lucide-react'

// CustomDropdown: the site's styled select, already exists, no need to reinvent
import CustomDropdown from '@/components/features/collections/CustomDropdown'

// Types and helpers – getLayerValues reads the actual file names from each layer
import {
  type ExclusionRule,
  type LayerFolder,
  type ValueNameOverrides,
  getLayerValues,
  getDisplayName,
} from './nft-asset-utils'

export interface NftAssetToolExclusionsSectionProps {
  exclusionRules: ExclusionRule[]
  sortedLayersStable: LayerFolder[]
  valueNameOverrides: ValueNameOverrides
  totalCombinations: number
  validCombinationCount: number
  addExclusionRule: () => void
  removeExclusionRule: (id: string) => void
  updateExclusionRule: (id: string, field: keyof ExclusionRule, value: string) => void
  canAddExclusionRule: boolean
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
  canAddExclusionRule,
}: NftAssetToolExclusionsSectionProps) {
  return (
    <section aria-labelledby="exclusions-heading" className="space-y-4">
      <div>
        <h2 id="exclusions-heading" className="text-base font-semibold text-dark-text-primary">
          Trait exclusions
        </h2>
        <p className="mt-1 text-sm text-dark-text-tertiary">
          Skip combinations where two traits have specific values together. E.g. &quot;Background:
          Blue&quot; + &quot;Eyes: Laser&quot; = skip.
        </p>
      </div>

      {/* Empty state */}
      {exclusionRules.length === 0 && (
        <p className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary px-5 py-4 text-sm text-dark-text-tertiary">
          No exclusions — all combinations are valid. Add a rule to skip specific trait pairs.
        </p>
      )}

      {/* Rule list */}
      {exclusionRules.length > 0 && (
        <div className="space-y-2">
          {exclusionRules.map((rule) => {
            const layerA = sortedLayersStable.find((l) => l.id === rule.layerAId)
            const layerB = sortedLayersStable.find((l) => l.id === rule.layerBId)
            const valuesA = layerA ? getLayerValues(layerA) : []
            const valuesB = layerB ? getLayerValues(layerB) : []

            return (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-dark-border-primary bg-dark-bg-secondary px-4 py-3"
              >
                <span className="text-xs font-medium text-dark-text-tertiary">When</span>

                {/* Layer A selector */}
                <div className="w-36">
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

                <span className="text-xs font-medium text-dark-text-tertiary">is</span>

                {/* Value A selector */}
                <div className="w-36">
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

                <span className="text-xs font-medium text-dark-text-tertiary">, exclude when</span>

                {/* Layer B selector */}
                <div className="w-36">
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

                <span className="text-xs font-medium text-dark-text-tertiary">is</span>

                {/* Value B selector */}
                <div className="w-36">
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

                {/* Remove rule */}
                <button
                  type="button"
                  onClick={() => removeExclusionRule(rule.id)}
                  aria-label="Remove rule"
                  className="ml-auto rounded-md p-1.5 text-dark-text-tertiary transition-colors hover:bg-dark-accent-error/10 hover:text-dark-accent-error"
                >
                  <X size={15} />
                </button>
              </div>
            )
          })}

          {/* Impact summary: how many combos survive the rules */}
          <p className="px-1 text-sm text-dark-text-tertiary">
            {totalCombinations.toLocaleString()} total →{' '}
            <strong className="text-dark-text-primary">
              {validCombinationCount.toLocaleString()} valid
            </strong>{' '}
            after exclusions.
          </p>
        </div>
      )}

      {/* Add new rule button */}
      <button
        type="button"
        onClick={addExclusionRule}
        disabled={!canAddExclusionRule}
        className="rounded-lg border border-dark-border-primary px-4 py-2 text-sm font-medium text-dark-text-secondary transition-colors hover:border-dark-border-secondary hover:text-dark-text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add exclusion rule
      </button>
    </section>
  )
}

// — Juan. Add a rule. Remove a rule. We're not judging. (We're judging.)
