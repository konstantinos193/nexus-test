/**
 * nft-asset-utils.ts
 * Pure helpers and types for the NFT Layer Generator. No React, no side effects, just math and pain.
 * Used by NftAssetToolPageContent and every section that needs to know "is this combo excluded?"
 *
 * @author Juan – utility janitor and type tyrant
 */

/** One layer = one trait folder. order: 0 = bottom (drawn first), higher = on top. */
export interface LayerFolder {
  id: string
  /** Display name = trait_type in metadata. Don't name it "Layer" or we cry. */
  name: string
  files: File[]
  /** 0 = bottom (drawn first), higher = on top */
  order: number
}

/** Rule: when Layer A has value A and Layer B has value B, exclude this combination. Yes, we're gatekeeping combos. */
export interface ExclusionRule {
  id: string
  layerAId: string
  valueA: string
  layerBId: string
  valueB: string
}

/** Rarity by layer: layerId -> valueDisplayName -> percentage string. "30" means 30%. We're not monsters. */
export type RarityByLayer = Record<string, Record<string, string>>

/** Override display names so metadata doesn't say "ugly_face_01" in public */
export type ValueNameOverrides = Record<string, Record<string, string>>

/** The only image types we accept. Everything else is a lie. */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

/** Turn "ugly_face_01.png" into "ugly face 01". The rest stays "Unknown" so we can blame the user. */
export function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').trim()
  const withSpaces = base.replace(/[-_]+/g, ' ').trim()
  return withSpaces || base || 'Unknown'
}

/** Filter to only image files. Yes, we reject your .bmp. This is 2025. */
export function filterImageFiles(files: FileList | File[]): File[] {
  const list = Array.from(files)
  return list.filter((f) => IMAGE_TYPES.includes(f.type?.toLowerCase()))
}

/** Windows backslashes → forward slashes, then split. Because Windows is a lifestyle choice we don't judge (we judge). */
function pathSegments(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(Boolean)
}

/**
 * Group files by folder so each trait folder becomes one layer.
 * If you selected one parent folder with Backgrounds/, Body/, etc., we group by the second path segment. Otherwise we wing it.
 */
export function groupByFolder(files: File[]): Map<string, File[]> {
  const list = files.filter(
    (f) =>
      (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
      (f.name && (f.name.includes('/') || f.name.includes('\\')))
  )
  if (list.length === 0) return new Map()
  const segments = list.map((f) => {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
    return pathSegments(path)
  })
  const firstSegments = segments.map((s) => s[0])
  const allSameFirst =
    firstSegments.every((s) => s === firstSegments[0]) && segments.every((s) => s.length >= 2)
  const groupByIndex = allSameFirst ? 1 : 0

  const map = new Map<string, File[]>()
  for (const f of files) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
    const parts = pathSegments(path)
    const folder = parts[groupByIndex] ?? parts[0] ?? 'Layer'
    if (!map.has(folder)) map.set(folder, [])
    map.get(folder)!.push(f)
  }
  return map
}

/** Build metadata blob for /create. 0.json, 1.json, … – the format the Create page actually expects so we don't get support tickets. */
export function buildTokenMetadata(
  index: number,
  collectionNameBase: string,
  attributes: Array<{ trait_type: string; value: string }>,
  opts: { description?: string; externalUrl?: string }
): Record<string, unknown> {
  const imageFilename = `${index}.png`
  const meta: Record<string, unknown> = {
    name: `${collectionNameBase} #${index}`,
    image: imageFilename,
    attributes,
    properties: {
      files: [{ uri: imageFilename, type: 'image/png' }],
      category: 'image',
    },
  }
  if (opts.description?.trim()) meta.description = opts.description.trim()
  if (opts.externalUrl?.trim()) meta.external_url = opts.externalUrl.trim()
  return meta
}

/** Draw layers onto a canvas in order (first = bottom). Returns PNG blob. If canvas fails, it's not us, it's the browser. */
export async function compositeLayers(
  layers: LayerFolder[],
  combinationIndices: number[],
  width: number,
  height: number
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d not available')

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    const fileIndex = combinationIndices[i]
    const file = layer.files[fileIndex]
    if (!file) continue
    const img = await loadImage(file)
    ctx.drawImage(img, 0, 0, width, height)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
      1
    )
  })
}

/** Load a File into an HTMLImageElement. We revoke the object URL so the GC can sleep at night. */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load ${file.name}`))
    }
    img.src = url
  })
}

/** Turn a flat index into per-layer indices. Total combos = product of layer lengths. Math. It's not personal. */
export function getCombinationIndices(flatIndex: number, layerLengths: number[]): number[] {
  const indices: number[] = []
  for (let i = 0; i < layerLengths.length; i++) {
    const product = layerLengths.slice(0, i).reduce((a, b) => a * b, 1)
    indices.push(Math.floor(flatIndex / product) % layerLengths[i])
  }
  return indices
}

/** Unique display values for a layer, derived from filenames. Duplicates? We've seen things. */
export function getLayerValues(layer: LayerFolder): string[] {
  const seen = new Set<string>()
  return layer.files
    .map((f) => nameFromFilename(f.name))
    .filter((v) => {
      if (seen.has(v)) return false
      seen.add(v)
      return true
    })
}

/** Is this combo banned by an exclusion rule? One match and we say yes. We don't mess around. */
export function isCombinationExcluded(
  sortedLayers: LayerFolder[],
  indices: number[],
  rules: ExclusionRule[]
): boolean {
  if (rules.length === 0) return false
  const layerIdToIndex = new Map(sortedLayers.map((l, i) => [l.id, i]))
  const values = sortedLayers.map((layer, i) =>
    nameFromFilename(layer.files[indices[i]]?.name ?? '')
  )
  for (const rule of rules) {
    const idxA = layerIdToIndex.get(rule.layerAId)
    const idxB = layerIdToIndex.get(rule.layerBId)
    if (idxA == null || idxB == null) continue
    if (values[idxA] === rule.valueA && values[idxB] === rule.valueB) return true
  }
  return false
}

/** Rarity weight for a combo = product of trait % per layer. Missing % = 1. We're generous like that. */
export function getCombinationWeight(
  sortedLayers: LayerFolder[],
  indices: number[],
  rarityByLayer: RarityByLayer
): number {
  let w = 1
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i]
    const valueName = nameFromFilename(sortedLayers[i].files[indices[i]]?.name ?? '')
    const pct = rarityByLayer[layer.id]?.[valueName]
    const num = pct != null && pct.trim() !== '' ? parseFloat(pct) : NaN
    w *= Number.isFinite(num) && num >= 0 ? num / 100 : 1
  }
  return w
}

/** Did the user set at least one rarity % anywhere? If not, we treat everything as equal and move on. */
export function hasRarity(rarityByLayer: RarityByLayer): boolean {
  for (const layerId of Object.keys(rarityByLayer)) {
    const vals = rarityByLayer[layerId]
    if (!vals) continue
    for (const v of Object.values(vals)) {
      if (v != null && String(v).trim() !== '') return true
    }
  }
  return false
}

/** Display name for a trait value: use override if set, else the original. Metadata polish. */
export function getDisplayName(
  layerId: string,
  originalValue: string,
  overrides: ValueNameOverrides
): string {
  const override = overrides[layerId]?.[originalValue]?.trim()
  return override !== undefined && override !== '' ? override : originalValue
}

/** Generate a unique rule id. Collisions? In this economy? */
export function newRuleId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Format ETA for progress. "< 1 s", "~45 s", "~2 min 30 s". We lie a little. */
export function formatEta(etaMs: number): string {
  if (etaMs < 1000) return '< 1 s'
  if (etaMs < 60_000) return `~${Math.round(etaMs / 1000)} s`
  const min = Math.floor(etaMs / 60_000)
  const sec = Math.round((etaMs % 60_000) / 1000)
  return sec > 0 ? `~${min} min ${sec} s` : `~${min} min`
}

// — Juan. Pure functions. No React. No tears. (Some tears.)
