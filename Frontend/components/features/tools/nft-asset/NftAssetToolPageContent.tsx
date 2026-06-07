'use client'

/* eslint-disable max-lines, max-lines-per-function, max-statements, complexity */

/**
 * NftAssetToolPageContent.tsx
 * The main orchestrator. All state lives here. All callbacks live here. All regret lives here.
 * Now a step-based wizard with left sidebar. Same vibe as /create.
 *
 * @author Juan – state hoarder and callback dispenser (one day we'll refactor; today is not that day)
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import JSZip from 'jszip'
import { ArrowLeft, Upload, Settings2, Zap } from 'lucide-react'
import {
  type ExclusionRule,
  type LayerFolder,
  type RarityByLayer,
  type ValueNameOverrides,
  nameFromFilename,
  filterImageFiles,
  groupByFolder,
  buildTokenMetadata,
  compositeLayers,
  loadImage,
  getCombinationIndices,
  getLayerValues,
  isCombinationExcluded,
  getCombinationWeight,
  hasRarity,
  getDisplayName,
  newRuleId,
} from './nft-asset-utils'
import NftAssetToolUploadSection from './NftAssetToolUploadSection'
import NftAssetToolRaritySection from './NftAssetToolRaritySection'
import NftAssetToolExclusionsSection from './NftAssetToolExclusionsSection'
import NftAssetToolOutputSection from './NftAssetToolOutputSection'
import NftAssetToast from './NftAssetToast'

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
  const [progress, setProgress] = useState<{
    current: number
    total: number
    startTime?: number
  }>({ current: 0, total: 0 })
  const [progressTick, setProgressTick] = useState(0)
  const [generated, setGenerated] = useState<{
    imageBlobs: Blob[]
    metadataJsons: string[]
    rarityIndex: Array<{ tokenId: number; rank: number; score: number }>
  } | null>(null)
  const [thumbnailUrls, setThumbnailUrls] = useState<string[] | null>(null)
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

  useEffect(() => {
    if (!generating || progress.total === 0) return
    const id = setInterval(() => setProgressTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [generating, progress.total])

  useEffect(() => {
    if (!generated?.imageBlobs?.length) {
      setThumbnailUrls(null)
      return
    }
    const urls = generated.imageBlobs.map((blob) => URL.createObjectURL(blob))
    setThumbnailUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [generated])

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

      // Try to group by folder first (handles both webkitRelativePath and fallback logic)
      const byFolder = groupByFolder(fileList)

      if (byFolder.size > 0) {
        // Successfully grouped by folder
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
        // No folder structure detected, try as single layer
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

  const validCombinationCount = useMemo(() => {
    if (layers.length === 0 || exclusionRules.length === 0) return totalCombinations
    const layerLengths = sortedLayersStable.map((l) => l.files.length)
    let count = 0
    const total = layerLengths.reduce((a, b) => a * b, 1)
    for (let i = 0; i < total; i++) {
      const indices = getCombinationIndices(i, layerLengths)
      if (!isCombinationExcluded(sortedLayersStable, indices, exclusionRules)) count++
    }
    return count
  }, [layers, exclusionRules, totalCombinations, sortedLayersStable])

  const addExclusionRule = useCallback(() => {
    if (sortedLayersStable.length < 2) {
      showToast('error', 'Add at least 2 layers to create exclusions.')
      return
    }

    const candidates = sortedLayersStable.filter((layer) => getLayerValues(layer).length > 0)
    if (candidates.length < 2) {
      showToast(
        'error',
        'Add at least 2 layers with valid trait values before creating exclusion rules.'
      )
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

  /* The big one: generate images + metadata. Rarity-weighted or equal, then composite and zip. */
  const generate = useCallback(async () => {
    if (layers.length === 0) {
      showToast('error', 'Add at least one layer folder.')
      return
    }
    const total = totalCombinations
    const validCount = validCombinationCount
    const supplyNum = supply.trim()
      ? Math.max(1, Math.min(2000, parseInt(supply, 10) || 0))
      : null
    const toGenerate =
      supplyNum != null ? Math.min(supplyNum, validCount) : Math.min(validCount, 2000)

    if (validCount > 2000 && (supplyNum == null || supplyNum > 2000)) {
      showToast(
        'error',
        'Too many valid combinations (max 2000 per run). Set a limit or add exclusions.'
      )
      return
    }
    if (validCount === 0) {
      showToast('error', 'No valid combinations. Relax or remove some exclusion rules.')
      return
    }

    setGenerating(true)
    setProgress({ current: 0, total: toGenerate, startTime: Date.now() })
    setGenerated(null)

    try {
      const sortedLayers = sortedLayersStable
      const layerLengthsSorted = sortedLayers.map((l) => l.files.length)
      const firstFile = sortedLayers[0].files[0]
      const firstImg = await loadImage(firstFile)
      let size: number | null
      if (outputSize === '512') size = 512
      else if (outputSize === '1024') size = 1024
      else size = null
      const width = size ?? firstImg.width
      const height = size ?? firstImg.height

      const useRarity = hasRarity(rarityByLayer)
      type Combo = { flatIndex: number; indices: number[]; weight: number }
      const combosToGenerate: Combo[] = []

      if (useRarity) {
        const weighted: Combo[] = []
        let totalWeight = 0
        for (let i = 0; i < total; i++) {
          const indices = getCombinationIndices(i, layerLengthsSorted)
          if (isCombinationExcluded(sortedLayers, indices, exclusionRules)) continue
          const weight = getCombinationWeight(sortedLayers, indices, rarityByLayer)
          if (weight <= 0) continue
          weighted.push({ flatIndex: i, indices, weight })
          totalWeight += weight
        }
        if (totalWeight <= 0) {
          showToast('error', 'Rarity weights produced no valid combinations.')
          setGenerating(false)
          return
        }
        const used = new Set<number>()
        for (let n = 0; n < toGenerate; n++) {
          let totalRemaining = 0
          for (const c of weighted) {
            if (used.has(c.flatIndex)) continue
            totalRemaining += c.weight
          }
          if (totalRemaining <= 0) break
          let r = Math.random() * totalRemaining
          let picked: Combo | null = null
          for (const c of weighted) {
            if (used.has(c.flatIndex)) continue
            r -= c.weight
            if (r <= 0) {
              picked = c
              break
            }
          }
          if (!picked)
            picked = weighted.find((c) => !used.has(c.flatIndex)) ?? weighted[weighted.length - 1]
          used.add(picked.flatIndex)
          combosToGenerate.push(picked)
        }
      } else {
        let count = 0
        for (let i = 0; i < total && count < toGenerate; i++) {
          const indices = getCombinationIndices(i, layerLengthsSorted)
          if (isCombinationExcluded(sortedLayers, indices, exclusionRules)) continue
          combosToGenerate.push({ flatIndex: i, indices, weight: 1 })
          count++
        }
      }

      const imageBlobs: Blob[] = []
      const metadataJsons: string[] = []
      const allAttributes: Array<Array<{ trait_type: string; value: string }>> = []
      const metaOpts = { description: collectionDescription, externalUrl }

      for (let outputIndex = 0; outputIndex < combosToGenerate.length; outputIndex++) {
        setProgress((prev) => ({
          ...prev,
          current: outputIndex + 1,
          total: combosToGenerate.length,
        }))
        const { indices } = combosToGenerate[outputIndex]
        const blob = await compositeLayers(sortedLayers, indices, width, height)
        imageBlobs.push(blob)

        const attributes = sortedLayers.map((layer, idx) => {
          const originalValue = nameFromFilename(layer.files[indices[idx]].name)
          return {
            trait_type: layer.name,
            value: getDisplayName(layer.id, originalValue, valueNameOverrides),
          }
        })
        allAttributes.push(attributes)
        const meta = buildTokenMetadata(
          outputIndex,
          collectionNameBase.trim() || 'NFT',
          attributes,
          metaOpts
        )
        metadataJsons.push(JSON.stringify(meta, null, 2))
      }

      const totalGen = allAttributes.length
      const traitValueCount = new Map<string, number>()
      for (const attrs of allAttributes) {
        for (const a of attrs) {
          const key = `${a.trait_type}\t${a.value}`
          traitValueCount.set(key, (traitValueCount.get(key) ?? 0) + 1)
        }
      }
      const scores = allAttributes.map((attrs) => {
        let score = 0
        for (const a of attrs) {
          const key = `${a.trait_type}\t${a.value}`
          const count = traitValueCount.get(key) ?? 1
          score += totalGen / count
        }
        return score
      })
      const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a])
      const rankByTokenId = new Map<number, number>()
      order.forEach((tokenId, zeroBasedRank) => {
        rankByTokenId.set(tokenId, zeroBasedRank + 1)
      })
      const rarityIndex: Array<{ tokenId: number; rank: number; score: number }> = Array.from(
        { length: totalGen },
        (_, tokenId) => ({
          tokenId,
          rank: rankByTokenId.get(tokenId)!,
          score: Math.round(scores[tokenId] * 100) / 100,
        })
      )

      const generatedCount = combosToGenerate.length
      setGenerated({ imageBlobs, metadataJsons, rarityIndex })
      let msg: string
      if (useRarity) msg = `Generated ${generatedCount} with rarity weights. Download the ZIP.`
      else if (supplyNum != null && generatedCount < validCount) msg = `Generated ${generatedCount} (supply ${supplyNum}). ${validCount - generatedCount} more valid available.`
      else if (generatedCount < validCount) msg = `Generated ${generatedCount} of ${validCount} valid. Download the ZIP.`
      else msg = `Generated ${generatedCount} images and metadata (supply ${generatedCount}). Download the ZIP and use on Create.`
      showToast('success', msg)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }, [
    layers,
    totalCombinations,
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

  /* Zip images + metadata + rarity.json and trigger download. We revoke nothing; the user's problem now. */
  const downloadZip = useCallback(async () => {
    if (!generated) return
    const zip = new JSZip()
    const imagesFolder = zip.folder('images')
    const metadataFolder = zip.folder('metadata')
    if (!imagesFolder || !metadataFolder) return
    generated.imageBlobs.forEach((blob, i) => imagesFolder.file(`${i}.png`, blob))
    generated.metadataJsons.forEach((json, i) => metadataFolder.file(`${i}.json`, json))
    const rarityJson = JSON.stringify(
      generated.rarityIndex.map((r) => ({ tokenId: r.tokenId, rank: r.rank, score: r.score })),
      null,
      2
    )
    zip.file('rarity.json', rarityJson)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nft-collection-${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', 'ZIP downloaded. Unzip and drop images + metadata folders on /create.')
  }, [generated, showToast])

  return (
    <div className="tools-page nft-asset-tool">
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

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <div className="nft-asset-step-card">
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
                    progressTick={progressTick}
                    generated={generated}
                    thumbnailUrls={thumbnailUrls}
                    onGenerate={generate}
                    onDownloadZip={downloadZip}
                  />
                )}

                {/* Footer nav */}
                <div className="nft-asset-step-footer">
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
                      className="px-6 py-3 h-12 rounded-full text-sm font-medium bg-dark-accent-primary/15 border border-dark-accent-primary/30 hover:border-dark-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-dark-accent-primary hover:text-dark-accent-primary"
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
    </div>
  )
}

// — Juan. 575 lines. We could split it. We didn't. The backlog is a dark place.
