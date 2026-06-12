'use client'

/* eslint-disable max-lines, max-lines-per-function, max-statements, complexity */

/**
 * NftAssetToolPageContent.tsx
 * The main orchestrator. All state lives here. All callbacks live here.
 * Generation now happens on the backend — this component POSTs a FormData and
 * waits for a download token. No more freezing the browser main thread.
 *
 * @author Juan – state hoarder, callback dispenser, proud server-offloader
 */

// No JSZip. No compositeLayers. No loadImage. They live on the backend now.
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Settings2, Zap } from 'lucide-react'

// Only the pure data-manipulation utilities we actually need on the frontend
import {
  type ExclusionRule,
  type LayerFolder,
  type RarityByLayer,
  type ValueNameOverrides,
  filterImageFiles,
  groupByFolder,
  getCombinationIndices,
  getLayerValues,
  isCombinationExcluded,
  newRuleId,
} from './nft-asset-utils'

// Components
import NftAssetErrorBoundary from './NftAssetErrorBoundary'
import NftAssetToolUploadSection from './NftAssetToolUploadSection'
import NftAssetToolRaritySection from './NftAssetToolRaritySection'
import NftAssetToolExclusionsSection from './NftAssetToolExclusionsSection'
import NftAssetToolOutputSection, { type GeneratedResult } from './NftAssetToolOutputSection'
import NftAssetToast from './NftAssetToast'

// The NestJS backend. NEXT_PUBLIC_BACKEND_URL matches how every other API call works.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/* Step config */
const STEPS = [
  { id: 1, label: 'Upload Layers', hint: 'Add and arrange trait folders', Icon: Upload },
  { id: 2, label: 'Configure', hint: 'Rarity weights & exclusions', Icon: Settings2 },
  { id: 3, label: 'Generate', hint: 'Metadata settings & output', Icon: Zap },
]

function VerticalSteps({ currentStep }: { currentStep: number }) {
  return (
    <div>
      {STEPS.map((s, i) => {
        const isActive = s.id === currentStep
        const isDone = s.id < currentStep
        const isLocked = s.id > currentStep

        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-colors',
                isDone ? 'bg-dark-accent-success/15 border-dark-accent-success/50 text-dark-accent-success' : '',
                isActive ? 'bg-dark-accent-primary/15 border-dark-accent-primary text-dark-accent-primary' : '',
                isLocked ? 'bg-dark-bg-secondary border-dark-border-primary text-dark-text-tertiary' : '',
              ].join(' ')}>
                {isDone ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={[
                  'w-px flex-1 my-1 min-h-8',
                  isDone ? 'bg-dark-accent-success/25' : 'bg-dark-border-primary',
                ].join(' ')} />
              )}
            </div>
            <div className={i < STEPS.length - 1 ? 'pb-6 pt-0.5' : 'pt-0.5'}>
              <p className={[
                'text-sm font-medium leading-none',
                isActive ? 'text-dark-text-primary' : '',
                isLocked ? 'text-dark-text-tertiary' : '',
                isDone ? 'text-dark-text-secondary' : '',
              ].join(' ')}>
                {s.label}
              </p>
              {isActive && (
                <p className="text-xs text-dark-text-tertiary mt-1">{s.hint}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LayerStats({
  layerCount,
  totalCombinations,
  validCombinations,
}: {
  layerCount: number
  totalCombinations: number
  validCombinations: number
}) {
  return (
    <div className="rounded-xl border border-dark-border-primary overflow-hidden bg-dark-bg-secondary">
      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider">Layers</p>
          <p className="text-lg font-bold text-dark-text-primary mt-1">{layerCount}</p>
        </div>
        <div className="border-t border-dark-border-primary pt-3">
          <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider">Combinations</p>
          <p className="text-xs text-dark-text-secondary mt-1">Total: {totalCombinations.toLocaleString()}</p>
          <p className="text-xs text-dark-accent-primary mt-0.5">Valid: {validCombinations.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export default function NftAssetToolPageContent() {
  /* State. All of it. We could split. We didn't. */
  const [step, setStep] = useState(1)
  const [layers, setLayers] = useState<LayerFolder[]>([])
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([])
  const [rarityByLayer, setRarityByLayer] = useState<RarityByLayer>({})
  const [valueNameOverrides, setValueNameOverrides] = useState<ValueNameOverrides>({})
  const [collectionNameBase, setCollectionNameBase] = useState('My NFT')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [outputSize, setOutputSize] = useState<'layer' | '512' | '1024'>('layer')
  const [supply, setSupply] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [generated, setGenerated] = useState<GeneratedResult | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [layerDragId, setLayerDragId] = useState<string | null>(null)
  const [layerDropIndex, setLayerDropIndex] = useState<number | null>(null)

  const canNextFromStep1 = layers.length > 0
  const nextStep = useCallback(() => {
    if (step < 3) setStep(step + 1)
  }, [step])
  const prevStep = useCallback(() => {
    if (step > 1) setStep(step - 1)
  }, [step])

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }, [])

  /* Add a layer from a folder. If no images, we toast and blame the user. */
  const addLayerFromFiles = useCallback(
    (folderName: string, files: File[]) => {
      const images = filterImageFiles(files)
      if (images.length === 0) {
        showToast('error', `No image files (PNG/JPG/WebP) in "${folderName}".`)
        return
      }
      const maxOrder = layers.length === 0 ? 0 : Math.max(...layers.map((l) => l.order))
      const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setLayers((prev) => [...prev, { id, name: folderName, files: images, order: maxOrder + 1 }])
      showToast('success', `Added "${folderName}" with ${images.length} image(s).`)
    },
    [layers, showToast]
  )

  const handleDirectoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      const fileList = Array.from(files)
      const byFolder = groupByFolder(fileList)
      byFolder.forEach((folderFiles, folderName) => addLayerFromFiles(folderName, folderFiles))
      e.target.value = ''
    },
    [addLayerFromFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer?.files
      if (!files?.length) {
        showToast('error', 'No files in drop.')
        return
      }
      const fileList = Array.from(files)
      const byFolder = groupByFolder(fileList)

      if (byFolder.size > 0) {
        let layersAdded = 0
        byFolder.forEach((folderFiles, folderName) => {
          const images = filterImageFiles(folderFiles)
          if (images.length > 0) {
            addLayerFromFiles(folderName, images)
            layersAdded++
          }
        })
        if (layersAdded === 0) {
          showToast('error', 'No image files found in any folders. Make sure your folders contain PNG, JPG, WebP, or GIF files.')
        }
      } else {
        const images = filterImageFiles(fileList)
        if (images.length > 0) {
          addLayerFromFiles('Layer', images)
        } else {
          showToast('error', 'No image files (PNG/JPG/WebP) found. Try using the "Select folder" button instead.')
        }
      }
    },
    [addLayerFromFiles, showToast]
  )

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setExclusionRules((prev) => prev.filter((r) => r.layerAId !== id && r.layerBId !== id))
    setRarityByLayer((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setValueNameOverrides((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setGenerated(null)
  }, [])

  const setLayerName = useCallback((id: string, name: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)))
    setGenerated(null)
  }, [])

  const moveLayer = useCallback((id: string, direction: -1 | 1) => {
    setLayers((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((l) => l.id === id)
      if (idx < 0) return prev
      const newIdx = Math.max(0, Math.min(sorted.length - 1, idx + direction))
      if (newIdx === idx) return prev
      const [removed] = sorted.splice(idx, 1)
      sorted.splice(newIdx, 0, removed)
      return sorted.map((l, i) => ({ ...l, order: i }))
    })
    setGenerated(null)
  }, [])

  const reorderLayerToIndex = useCallback((layerId: string, toIndex: number) => {
    setLayers((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const fromIdx = sorted.findIndex((l) => l.id === layerId)
      if (fromIdx < 0 || fromIdx === toIndex) return prev
      const [removed] = sorted.splice(fromIdx, 1)
      sorted.splice(toIndex, 0, removed)
      return sorted.map((l, i) => ({ ...l, order: i }))
    })
    setLayerDragId(null)
    setLayerDropIndex(null)
    setGenerated(null)
  }, [])

  const totalCombinations = useMemo(() => {
    if (layers.length === 0) return 0
    return layers.reduce((acc, l) => acc * l.files.length, 1)
  }, [layers])

  const sortedLayersStable = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    [layers]
  )

  // Async because iterating millions of combos synchronously freezes the main thread.
  // Chunked setTimeout yields to the browser between batches. Cancelled on dependency change.
  const [validCombinationCount, setValidCombinationCount] = useState(0)
  const validCountCancelRef = useRef(false)

  useEffect(() => {
    // No exclusions — answer is always totalCombinations; no iteration needed
    if (exclusionRules.length === 0) {
      setValidCombinationCount(totalCombinations)
      return
    }
    if (layers.length === 0) {
      setValidCombinationCount(0)
      return
    }

    const layerLengths = sortedLayersStable.map((l) => l.files.length)
    const total = layerLengths.reduce((a, b) => a * b, 1)

    // For enormous combination spaces the exact count is academic (generation is capped at 2000
    // anyway). Skip the loop and show the total so we don't freeze for e.g. 5 layers × 100 images.
    if (total > 200_000) {
      setValidCombinationCount(totalCombinations)
      return
    }

    validCountCancelRef.current = false
    let count = 0
    let i = 0
    const CHUNK = 5_000

    const tick = () => {
      if (validCountCancelRef.current) return
      const end = Math.min(i + CHUNK, total)
      for (; i < end; i++) {
        if (!isCombinationExcluded(sortedLayersStable, getCombinationIndices(i, layerLengths), exclusionRules)) count++
      }
      if (i < total) {
        setTimeout(tick, 0)
      } else {
        setValidCombinationCount(count)
      }
    }

    const id = setTimeout(tick, 0)
    return () => {
      validCountCancelRef.current = true
      clearTimeout(id)
    }
  }, [layers, exclusionRules, totalCombinations, sortedLayersStable])

  const addExclusionRule = useCallback(() => {
    if (sortedLayersStable.length < 2) {
      showToast('error', 'Add at least 2 layers to create exclusions.')
      return
    }
    const candidates = sortedLayersStable.filter((layer) => getLayerValues(layer).length > 0)
    if (candidates.length < 2) {
      showToast('error', 'Add at least 2 layers with valid trait values before creating exclusion rules.')
      return
    }
    const [first, second] = candidates
    const valuesA = getLayerValues(first)
    const valuesB = getLayerValues(second)
    setExclusionRules((prev) => [
      ...prev,
      {
        id: newRuleId(),
        layerAId: first.id,
        valueA: valuesA[0] ?? '',
        layerBId: second.id,
        valueB: valuesB[0] ?? '',
      },
    ])
    setGenerated(null)
  }, [sortedLayersStable, showToast])

  const removeExclusionRule = useCallback((id: string) => {
    setExclusionRules((prev) => prev.filter((r) => r.id !== id))
    setGenerated(null)
  }, [])

  const canCreateExclusionRule = useMemo(() => {
    const layersWithValues = sortedLayersStable.filter((layer) => getLayerValues(layer).length > 0)
    return layersWithValues.length >= 2
  }, [sortedLayersStable])

  const updateExclusionRule = useCallback(
    (id: string, field: keyof ExclusionRule, value: string) => {
      setExclusionRules((prev) => {
        const rule = prev.find((r) => r.id === id)
        if (!rule) return prev
        const next = { ...rule, [field]: value }
        if (field === 'layerAId') {
          const layer = sortedLayersStable.find((l) => l.id === value)
          next.valueA = layer ? getLayerValues(layer)[0] ?? '' : ''
        } else if (field === 'layerBId') {
          const layer = sortedLayersStable.find((l) => l.id === value)
          next.valueB = layer ? getLayerValues(layer)[0] ?? '' : ''
        }
        return prev.map((r) => (r.id === id ? next : r))
      })
      setGenerated(null)
    },
    [sortedLayersStable]
  )

  const setRarityPct = useCallback((layerId: string, valueName: string, pct: string) => {
    setRarityByLayer((prev) => {
      const layerR = { ...(prev[layerId] ?? {}) }
      if (pct.trim() === '') delete layerR[valueName]
      else layerR[valueName] = pct.replace(/[^\d.]/g, '').slice(0, 6)
      const next = { ...prev }
      next[layerId] = layerR
      return next
    })
    setGenerated(null)
  }, [])

  const distributeRarityEvenly = useCallback((layerId: string) => {
    const layer = sortedLayersStable.find((l) => l.id === layerId)
    if (!layer) return
    const values = getLayerValues(layer)
    if (values.length === 0) return
    const each = Math.floor(100 / values.length)
    const remainder = 100 - each * values.length
    setRarityByLayer((prev) => {
      const layerR: Record<string, string> = {}
      values.forEach((v, i) => {
        layerR[v] = String(i === 0 ? each + remainder : each)
      })
      return { ...prev, [layerId]: layerR }
    })
    setGenerated(null)
  }, [sortedLayersStable])

  const setValueDisplayName = useCallback(
    (layerId: string, valueName: string, displayName: string) => {
      setValueNameOverrides((prev) => {
        const layerO = { ...(prev[layerId] ?? {}) }
        if (displayName.trim() === '') delete layerO[valueName]
        else layerO[valueName] = displayName.trim()
        const next = { ...prev }
        next[layerId] = layerO
        return next
      })
      setGenerated(null)
    },
    []
  )

  /* POST layers + config to the NestJS backend. It composites and zips server-side. */
  const generate = useCallback(async () => {
    if (layers.length === 0) {
      showToast('error', 'Add at least one layer folder.')
      return
    }
    if (validCombinationCount === 0) {
      showToast('error', 'No valid combinations. Relax or remove some exclusion rules.')
      return
    }

    setGenerating(true)
    setProgress({ current: 0, total: validCombinationCount })
    setGenerated(null)

    try {
      const configPayload = {
        layers: sortedLayersStable.map((l) => ({ id: l.id, name: l.name, order: l.order })),
        exclusionRules: exclusionRules.map(({ id, layerAId, valueA, layerBId, valueB }) => ({
          id, layerAId, valueA, layerBId, valueB,
        })),
        rarityByLayer,
        valueNameOverrides,
        collectionNameBase,
        collectionDescription,
        externalUrl,
        outputSize,
        supply: supply.trim() ? Math.max(1, Math.min(2000, parseInt(supply, 10) || 0)) : null,
      }

      const formData = new FormData()
      formData.append('config', JSON.stringify(configPayload))
      for (const layer of sortedLayersStable) {
        for (const file of layer.files) {
          formData.append(`layer_${layer.id}`, file, file.name)
        }
      }

      const res = await fetch(`${BACKEND_URL}/tools/nft/generate`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error((errBody as { message?: string }).message ?? `Server error ${res.status}`)
      }

      const result = await res.json() as {
        token: string
        count: number
        rarityIndex: Array<{ tokenId: number; rank: number; score: number }>
      }
      setGenerated({ token: result.token, count: result.count, rarityIndex: result.rarityIndex })
      showToast('success', `Generated ${result.count} NFT${result.count !== 1 ? 's' : ''}. Download the ZIP.`)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }, [
    layers,
    validCombinationCount,
    sortedLayersStable,
    exclusionRules,
    rarityByLayer,
    valueNameOverrides,
    collectionNameBase,
    collectionDescription,
    externalUrl,
    outputSize,
    supply,
    showToast,
  ])

  /* The token is single-use — after this download the server deletes the job directory. */
  const handleDownload = useCallback(() => {
    if (!generated?.token) return
    window.location.href = `${BACKEND_URL}/tools/nft/download/${generated.token}`
    showToast('success', 'Downloading ZIP… unzip and drop images + metadata folders on /create.')
  }, [generated, showToast])

  return (
    <NftAssetErrorBoundary>
      <div className="min-h-screen bg-dark-bg-primary">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24 lg:self-start">
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 text-sm text-dark-text-tertiary hover:text-dark-text-secondary transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Tools
              </Link>
              <div className="mb-7">
                <h1 className="text-xl font-bold text-dark-text-primary tracking-tight">NFT Asset Tool</h1>
                <p className="text-sm text-dark-text-tertiary mt-1">Generate unique collections</p>
              </div>
              <div className="mb-7">
                <VerticalSteps currentStep={step} />
              </div>
              <div className="border-t border-dark-border-primary mb-6" />
              <div>
                <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider mb-3">Stats</p>
                <LayerStats
                  layerCount={layers.length}
                  totalCombinations={totalCombinations}
                  validCombinations={validCombinationCount}
                />
              </div>
            </aside>

            {/* Main content – step card uses Tailwind, no CSS class */}
            <main className="flex-1 min-w-0">
              <div className="rounded-2xl border border-dark-border-primary bg-dark-bg-secondary p-6 sm:p-8">
                {step === 1 && (
                  <NftAssetToolUploadSection
                    layers={layers}
                    sortedLayersStable={sortedLayersStable}
                    totalCombinations={totalCombinations}
                    validCombinationCount={validCombinationCount}
                    exclusionRulesCount={exclusionRules.length}
                    dragOver={dragOver}
                    setDragOver={setDragOver}
                    onDrop={handleDrop}
                    onDirectoryChange={handleDirectoryChange}
                    onReorder={reorderLayerToIndex}
                    onLayerNameChange={setLayerName}
                    onMoveLayer={moveLayer}
                    onRemoveLayer={removeLayer}
                    layerDragId={layerDragId}
                    setLayerDragId={setLayerDragId}
                    layerDropIndex={layerDropIndex}
                    setLayerDropIndex={setLayerDropIndex}
                  />
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <NftAssetToolRaritySection
                      sortedLayersStable={sortedLayersStable}
                      rarityByLayer={rarityByLayer}
                      valueNameOverrides={valueNameOverrides}
                      setRarityPct={setRarityPct}
                      distributeRarityEvenly={distributeRarityEvenly}
                      setValueDisplayName={setValueDisplayName}
                    />
                    {layers.length >= 2 && (
                      <NftAssetToolExclusionsSection
                        exclusionRules={exclusionRules}
                        sortedLayersStable={sortedLayersStable}
                        valueNameOverrides={valueNameOverrides}
                        totalCombinations={totalCombinations}
                        validCombinationCount={validCombinationCount}
                        addExclusionRule={addExclusionRule}
                        removeExclusionRule={removeExclusionRule}
                        updateExclusionRule={updateExclusionRule}
                        canAddExclusionRule={canCreateExclusionRule}
                      />
                    )}
                  </div>
                )}

                {step === 3 && (
                  <NftAssetToolOutputSection
                    collectionNameBase={collectionNameBase}
                    setCollectionNameBase={setCollectionNameBase}
                    collectionDescription={collectionDescription}
                    setCollectionDescription={setCollectionDescription}
                    externalUrl={externalUrl}
                    setExternalUrl={setExternalUrl}
                    outputSize={outputSize}
                    setOutputSize={setOutputSize}
                    supply={supply}
                    setSupply={setSupply}
                    layersCount={layers.length}
                    validCombinationCount={validCombinationCount}
                    rarityByLayer={rarityByLayer}
                    generating={generating}
                    progress={progress}
                    generated={generated}
                    onGenerate={generate}
                    onDownloadZip={handleDownload}
                  />
                )}

                {/* Footer nav */}
                <div className="mt-8 flex items-center gap-3">
                  {step > 1 && (
                    <button
                      onClick={prevStep}
                      className="px-6 py-3 h-12 rounded-full text-sm font-medium border border-dark-border-primary hover:border-dark-border-secondary transition-colors text-dark-text-secondary hover:text-dark-text-primary"
                    >
                      ← Back
                    </button>
                  )}
                  {step < 3 && (
                    <button
                      onClick={nextStep}
                      disabled={step === 1 && !canNextFromStep1}
                      className="px-6 py-3 h-12 rounded-full text-sm font-medium bg-dark-accent-primary/15 border border-dark-accent-primary/30 hover:border-dark-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-dark-accent-primary"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      {toast && <NftAssetToast type={toast.type} message={toast.message} />}
    </NftAssetErrorBoundary>
  )
}

// — Juan. Generation moved to the server. Page stays alive. No more frozen tabs. Worth it.
