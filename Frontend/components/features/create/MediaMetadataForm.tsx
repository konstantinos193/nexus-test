'use client'

/**
 * MediaMetadataForm - Step 2: NFT images and metadata folder upload to IPFS.
 * Two dramatic drag-drop zones, a local NFT preview grid before upload,
 * a gradient upload CTA, and a full success panel with copy-able URIs after.
 * (Because "upload complete" deserves more than a green dot and a prayer.)
 *
 * All state is local — the hook only owns step2State, imagesBaseUri, metadataBaseUri.
 * Object URLs are built here, displayed here, and revoked here. IPFS never re-fetches.
 * (Your bandwidth is sacred. We respect it.)
 *
 * @author Juan - The developer who turned a boring upload form into an NFT gallery
 * (Coded with care, humor, and definitely too much coffee this time)
 */

// React hooks — the usual suspects
import { useCallback, useEffect, useRef, useState } from 'react'

// Icons — every section earns its icon here
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Clock,
  CloudUpload,
  Copy,
  Download,
  FileJson,
  FolderUp,
  Image,
  RefreshCw,
  X,
} from 'lucide-react'

// ZIP builder — for generating the example collection download on the fly
// jszip is already a dep (used elsewhere), so no extra weight here
import JSZip from 'jszip'

// UI — one button component to keep things consistent
import Button from '@/components/ui/Button'

// Types — Step2State from the hook, NftPreviewItem from the types barrel
import type { Step2State } from '@/hooks/useCreateCollectionForm'
import type { NftPreviewItem } from '@/components/features/create/create-types'

// ── Constants ─────────────────────────────────────────────────────────────────

// Max number of NFT preview cards to build from local files.
// 8 is enough to show the pattern without burning RAM on a 10,000-item collection.
const PREVIEW_LIMIT = 8

// ── Example collection download ───────────────────────────────────────────────

// Colours for the three sample NFTs — distinct enough to be obvious, pleasant enough
// that nobody cries when they see the example. (Design by vibes, as usual.)
const EXAMPLE_COLORS = ['#6366f1', '#ec4899', '#10b981'] as const
const EXAMPLE_TRAITS = [
  [{ trait_type: 'Background', value: 'Indigo' }, { trait_type: 'Rarity', value: 'Common' }],
  [{ trait_type: 'Background', value: 'Pink'   }, { trait_type: 'Rarity', value: 'Uncommon' }],
  [{ trait_type: 'Background', value: 'Emerald'}, { trait_type: 'Rarity', value: 'Rare' }],
] as const

// Renders a 400×400 canvas NFT for the given index and colour, returns a PNG Blob.
// Canvas is a browser API so this is fine in a client component — no SSR concerns.
function renderExamplePng(index: number, bgColor: string): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!

    // Solid background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 400, 400)

    // Subtle grid overlay — makes it look less like a rectangle and more like Art™
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 400; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(400, i); ctx.stroke()
    }

    // Token number — the headline act
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = 'bold 96px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`#${index}`, 200, 175)

    // "Example NFT" label below
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '28px sans-serif'
    ctx.fillText('Example NFT', 200, 290)

    // Watermark — so nobody accidentally ships this to mainnet
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '16px monospace'
    ctx.fillText('SAMPLE · DO NOT SHIP', 200, 360)

    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}

// Builds and triggers a download of example-collection.zip — two folders,
// three NFTs each, naming convention matches what the upload zones expect.
async function downloadExampleCollection() {
  const zip = new JSZip()
  const images   = zip.folder('images')!
  const metadata = zip.folder('metadata')!

  for (let i = 0; i < 3; i++) {
    // PNG image — generated on a canvas so no external assets needed
    const blob = await renderExamplePng(i, EXAMPLE_COLORS[i])
    images.file(`${i}.png`, blob)

    // Metaplex-compatible metadata JSON — the exact structure the program expects
    const meta = {
      name:        `Example NFT #${i}`,
      symbol:      'EXAMPLE',
      description: `Example NFT #${i} — replace this with your real description.`,
      image:       `${i}.png`,
      attributes:  EXAMPLE_TRAITS[i],
      properties: {
        files:    [{ uri: `${i}.png`, type: 'image/png' }],
        category: 'image',
      },
    }
    metadata.file(`${i}.json`, JSON.stringify(meta, null, 2))
  }

  // Trigger download — no server round-trip, no blob storage, just vibes and RAM
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'example-collection.zip'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Sorts files by their numeric stem (0, 1, 2…) — mixed naming is chaos otherwise
function sortByNumericName(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const numA = parseInt(a.name, 10)
    const numB = parseInt(b.name, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.name.localeCompare(b.name)
  })
}

// Reads all files out of a dropped FileSystemEntry (handles nested folders too)
async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise<File[]>((resolve) => {
      ;(entry as FileSystemFileEntry).file(
        (f) => resolve([f]),
        () => resolve([]),
      )
    })
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]))
    })
    const nested = await Promise.all(entries.map(readEntry))
    return nested.flat()
  }
  return []
}

// Builds up to `limit` NftPreviewItem objects from local File references.
// JSON parse errors are swallowed per-item — one bad file can't ruin the grid.
async function buildNftPreviews(
  imageFiles: File[],
  metadataFiles: File[],
  limit: number = PREVIEW_LIMIT,
): Promise<NftPreviewItem[]> {
  // Index metadata by stem (filename without extension) for O(1) lookup
  const metaByName = new Map(
    metadataFiles.map((f) => [f.name.replace(/\.json$/i, ''), f]),
  )

  const sorted = sortByNumericName(imageFiles).slice(0, limit)

  return Promise.all(
    sorted.map(async (imgFile) => {
      const stem = imgFile.name.replace(/\.[^.]+$/, '')
      const metaFile = metaByName.get(stem)

      let name = `#${stem}`
      let attributes: Array<{ trait_type: string; value: string }> = []

      if (metaFile) {
        try {
          const text = await metaFile.text()
          const json = JSON.parse(text)
          if (json.name) name = json.name
          if (Array.isArray(json.attributes)) attributes = json.attributes
        } catch {
          // bad JSON — keep fallback name and empty attributes
        }
      }

      return { stem, name, imageUrl: URL.createObjectURL(imgFile), attributes }
    }),
  )
}

// Middle-ellipsis truncation for IPFS URIs in the success panel
function truncateUri(uri: string, maxChars = 48): string {
  if (uri.length <= maxChars) return uri
  const half = Math.floor((maxChars - 3) / 2)
  return `${uri.slice(0, half)}…${uri.slice(-half)}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Detail modal — shown when a preview card is clicked
function NftDetailModal({ item, onClose }: { item: NftPreviewItem; onClose: () => void }) {
  // Lock the html element — Next.js scrolls on documentElement, not body
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = '' }
  }, [])

  // Close on ESC key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    // Backdrop is the scroll container — fixed + overflow-y-auto means the
    // blurred overlay scrolls within itself if the card is very tall.
    // The page never scrolls; the background blur stays full-screen.
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal card — no internal scroll, just flows to its natural height */}
        <div
          className="relative rounded-2xl border border-dark-border-primary bg-dark-bg-secondary w-full max-w-md overflow-hidden shadow-dark-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image section — fixed height */}
          <div className="relative h-56 sm:h-64 bg-dark-bg-tertiary">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />

            {/* Token badge */}
            <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-mono text-white">
              #{item.stem}
            </span>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details — no overflow, traits just flow */}
          <div className="p-5 space-y-4">
            <h3 className="text-lg font-bold text-dark-text-primary">{item.name}</h3>

            {item.attributes.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider mb-3">
                  Traits · {item.attributes.length}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {item.attributes.map((attr, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-dark-border-secondary bg-dark-bg-tertiary px-3 py-2.5"
                    >
                      <p className="text-[10px] font-medium text-dark-text-tertiary uppercase tracking-wider truncate">
                        {attr.trait_type}
                      </p>
                      <p className="text-sm font-semibold text-dark-text-primary truncate mt-0.5">
                        {String(attr.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-dark-text-tertiary">No traits found in metadata.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Single NFT preview card — image, token badge, name, trait count
function NftPreviewCard({ item, onClick }: { item: NftPreviewItem; onClick: () => void }) {
  return (
    <div
      className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary overflow-hidden group hover:border-dark-accent-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-dark-bg-tertiary">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Token number badge — absolute top-left */}
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white leading-none">
          #{item.stem}
        </span>
        {/* "Click for traits" hint — appears on hover */}
        <div className="absolute inset-0 bg-dark-accent-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
          <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            View traits
          </span>
        </div>
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-dark-text-primary truncate">{item.name}</p>
        {item.attributes.length > 0 && (
          <p className="text-[10px] text-dark-text-tertiary mt-0.5">
            {item.attributes.length} trait{item.attributes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// Skeleton placeholder while previews are being built
function PreviewSkeleton() {
  return (
    <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary overflow-hidden animate-pulse">
      <div className="aspect-square bg-dark-bg-tertiary" />
      <div className="p-2 space-y-1.5">
        <div className="h-2.5 bg-dark-bg-tertiary rounded w-3/4" />
        <div className="h-2 bg-dark-bg-tertiary rounded w-1/2" />
      </div>
    </div>
  )
}

interface NftPreviewGridProps {
  items:        NftPreviewItem[]
  label:        string
  labelAccent?: boolean // adds green checkmark + success colouring to label
  building?:    boolean
  totalCount:   number  // total files count (may exceed PREVIEW_LIMIT)
  mismatch?:    boolean // show amber warning when image/metadata counts differ
  onCardClick:  (item: NftPreviewItem) => void
}

// Grid of NFT preview cards with a labelled header
function NftPreviewGrid({ items, label, labelAccent, building, totalCount, mismatch, onCardClick }: NftPreviewGridProps) {
  const shownCount = Math.min(items.length, PREVIEW_LIMIT)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {labelAccent
            ? <CheckCircle2 className="w-3.5 h-3.5 text-dark-accent-success" />
            : <Image className="w-3.5 h-3.5 text-dark-text-tertiary" />
          }
          <span className={`text-xs font-semibold uppercase tracking-wider ${labelAccent ? 'text-dark-accent-success' : 'text-dark-text-tertiary'}`}>
            {label}
          </span>
        </div>
        {totalCount > 0 && (
          <span className="text-[10px] text-dark-text-tertiary">
            {shownCount} of {totalCount} shown
          </span>
        )}
      </div>

      {/* Mismatch warning */}
      {mismatch && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          File count mismatch — make sure every image has a matching JSON file.
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {building && items.length === 0
          ? Array.from({ length: 4 }).map((_, i) => <PreviewSkeleton key={i} />)
          : items.map((item) => (
              <NftPreviewCard key={item.stem} item={item} onClick={() => onCardClick(item)} />
            ))
        }
      </div>
    </div>
  )
}

interface IpfsSuccessPanelProps {
  imageCount:      number
  imagesBaseUri:   string | null
  metadataBaseUri: string | null
  uploadedAt:      Date | null
  copied:          'images' | 'metadata' | null
  onCopy:          (which: 'images' | 'metadata') => void
  onReplace:       () => void
}

// Full success card shown after upload — URIs, copy buttons, timestamp
function IpfsSuccessPanel({
  imageCount, imagesBaseUri, metadataBaseUri, uploadedAt, copied, onCopy, onReplace,
}: IpfsSuccessPanelProps) {
  const timeLabel = uploadedAt
    ? uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="rounded-2xl border border-dark-accent-success/25 bg-dark-accent-success/5 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-dark-accent-success/15 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-5 h-5 text-dark-accent-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-dark-text-primary leading-tight">
            {imageCount} NFT{imageCount !== 1 ? 's' : ''} uploaded to IPFS
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3 text-dark-text-tertiary" />
            <span className="text-xs text-dark-text-tertiary">
              {timeLabel ? `Uploaded at ${timeLabel}` : 'Pinned and ready'}
            </span>
          </div>
        </div>
        {/* Replace files link */}
        <button
          type="button"
          onClick={onReplace}
          className="flex items-center gap-1 text-xs text-dark-text-tertiary hover:text-dark-text-secondary underline underline-offset-2 shrink-0 pt-0.5"
        >
          <RefreshCw className="w-3 h-3" />
          Replace
        </button>
      </div>

      {/* URI rows */}
      <div className="space-y-2">
        {/* Images URI */}
        {imagesBaseUri && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-dark-bg-primary/50 border border-dark-border-secondary">
            <Image className="w-3.5 h-3.5 text-dark-accent-primary shrink-0" />
            <span className="text-[10px] font-medium text-dark-text-tertiary uppercase tracking-wider shrink-0">Images</span>
            <code className="text-xs font-mono text-dark-accent-primary truncate flex-1">
              {truncateUri(imagesBaseUri)}
            </code>
            <button
              type="button"
              onClick={() => onCopy('images')}
              className="shrink-0 text-dark-text-tertiary hover:text-dark-text-secondary transition-colors"
              title="Copy images URI"
            >
              {copied === 'images'
                ? <CheckCheck className="w-3.5 h-3.5 text-dark-accent-success" />
                : <Copy className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        )}

        {/* Metadata URI */}
        {metadataBaseUri && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-dark-bg-primary/50 border border-dark-border-secondary">
            <FileJson className="w-3.5 h-3.5 text-dark-accent-secondary shrink-0" />
            <span className="text-[10px] font-medium text-dark-text-tertiary uppercase tracking-wider shrink-0">Metadata</span>
            <code className="text-xs font-mono text-dark-accent-secondary truncate flex-1">
              {truncateUri(metadataBaseUri)}
            </code>
            <button
              type="button"
              onClick={() => onCopy('metadata')}
              className="shrink-0 text-dark-text-tertiary hover:text-dark-text-secondary transition-colors"
              title="Copy metadata URI"
            >
              {copied === 'metadata'
                ? <CheckCheck className="w-3.5 h-3.5 text-dark-accent-success" />
                : <Copy className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── FolderZone ─────────────────────────────────────────────────────────────────

interface FolderZoneProps {
  label:    string
  hint:     string
  files:    File[]
  onFiles:  (f: File[]) => void
  icon:     React.ReactNode
  accentClass: string // Tailwind class for the icon glow colour (e.g. 'text-dark-accent-primary')
  disabled: boolean
  baseUri:  string | null
}

function FolderZone({ label, hint, files, onFiles, icon, accentClass, disabled, baseUri }: FolderZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // webkitdirectory makes the click-to-browse open a folder picker, not a file picker
  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  function processFileList(list: FileList | null) {
    if (!list) return
    onFiles(sortByNumericName(Array.from(list)))
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const items = Array.from(e.dataTransfer.items)
    const entries = items
      .map((i) => i.webkitGetAsEntry())
      .filter((en): en is FileSystemEntry => en !== null)
    if (entries.length > 0) {
      const all = (await Promise.all(entries.map(readEntry))).flat()
      onFiles(sortByNumericName(all))
    } else {
      processFileList(e.dataTransfer.files)
    }
  }

  const hasFiles = files.length > 0
  const isDone   = !!baseUri

  // Shared border + background logic
  const zoneClasses = [
    'relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center',
    disabled && !isDone ? 'opacity-50 pointer-events-none' : '',
    isDone   ? 'border-dark-accent-success/30 bg-dark-accent-success/5 py-4 pointer-events-none opacity-70' : '',
    !isDone && dragOver  ? 'border-dark-accent-primary bg-dark-accent-primary/5 shadow-glow' : '',
    !isDone && !dragOver && !hasFiles ? 'border-dark-border-secondary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-tertiary min-h-48 py-12' : '',
    !isDone && !dragOver && hasFiles  ? 'border-dark-border-accent bg-dark-bg-secondary py-8' : '',
  ].join(' ')

  return (
    <div className="flex flex-col gap-2">
      {/* Zone label row */}
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-dark-text-primary">{label}</span>
        {isDone && (
          <span className="ml-auto flex items-center gap-1 text-xs text-dark-accent-success">
            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
          </span>
        )}
        {hasFiles && !isDone && (
          <span className="ml-auto text-xs text-dark-text-tertiary">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !isDone) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !isDone && inputRef.current?.click()}
        className={zoneClasses}
      >
        {/* No accept filter — webkitdirectory + accept is inconsistent across browsers */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => processFileList(e.target.files)}
        />

        {/* ── Idle state — no files yet ── */}
        {!hasFiles && !isDone && (
          <>
            <div className={`rounded-2xl p-3 mb-3 transition-colors ${dragOver ? 'bg-dark-accent-primary/20' : 'bg-dark-bg-tertiary'}`}>
              <div className={`w-12 h-12 flex items-center justify-center ${accentClass} transition-colors`}>
                <FolderUp className="w-full h-full" />
              </div>
            </div>
            <p className={`text-base font-semibold transition-colors ${dragOver ? 'text-dark-accent-primary' : 'text-dark-text-secondary'}`}>
              Drop your folder here
            </p>
            <p className="text-sm text-dark-text-tertiary mt-1">{hint}</p>
            <p className="text-xs text-dark-text-tertiary/60 mt-2">or click to browse</p>
          </>
        )}

        {/* ── Files selected, not yet uploaded ── */}
        {hasFiles && !isDone && (
          <>
            <p className="text-3xl font-bold text-dark-text-primary tabular-nums">{files.length}</p>
            <p className="text-sm text-dark-text-secondary mt-0.5">file{files.length !== 1 ? 's' : ''} selected</p>
            <p className="text-xs text-dark-text-tertiary mt-1">{hint}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFiles([]); inputRef.current?.click() }}
              className={`text-xs mt-3 underline underline-offset-2 ${accentClass} hover:opacity-80`}
            >
              Change folder
            </button>
          </>
        )}

        {/* ── Done state — compact confirmation ── */}
        {isDone && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-dark-accent-success" />
            <span className="text-sm font-medium text-dark-accent-success">{files.length} file{files.length !== 1 ? 's' : ''} — stored on IPFS</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Props interface ────────────────────────────────────────────────────────────

interface MediaMetadataFormProps {
  imageFiles:       File[]
  setImageFiles:    (f: File[]) => void
  metadataFiles:    File[]
  setMetadataFiles: (f: File[]) => void
  imagesBaseUri:    string | null
  metadataBaseUri:  string | null
  step2State:       Step2State
  step2Error:       string | null
  uploadProgress:   number
  onUpload:         () => void
  onNext:           () => void
  onBack:           () => void
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MediaMetadataForm({
  imageFiles, setImageFiles,
  metadataFiles, setMetadataFiles,
  imagesBaseUri, metadataBaseUri,
  step2State, step2Error, uploadProgress,
  onUpload, onNext, onBack,
}: MediaMetadataFormProps) {

  // ── Local state ──────────────────────────────────────────────────────────────

  const [nftPreviews,     setNftPreviews]     = useState<NftPreviewItem[]>([])
  const [previewBuilding, setPreviewBuilding] = useState(false)
  const [copied,          setCopied]          = useState<'images' | 'metadata' | null>(null)
  const [localReplacing,  setLocalReplacing]  = useState(false)
  const [uploadedAt,      setUploadedAt]      = useState<Date | null>(null)
  const [selectedNft,     setSelectedNft]     = useState<NftPreviewItem | null>(null)

  // Refs — prev state for transition detection, timer for copy reset
  const prevStep2State = useRef<Step2State>('idle')
  const copyTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isUploading   = step2State === 'uploading'
  const isDone        = step2State === 'done'
  const hasAny        = imageFiles.length > 0 || metadataFiles.length > 0
  const canNext       = isDone
  const showUploadUI  = !isDone || localReplacing
  const showSuccessUI = isDone && !localReplacing
  const mismatch      = imageFiles.length > 0 && metadataFiles.length > 0
                     && imageFiles.length !== metadataFiles.length

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Build NFT previews whenever files change — local only, no network
  useEffect(() => {
    if (imageFiles.length === 0) {
      setNftPreviews([])
      setPreviewBuilding(false)
      return
    }
    setPreviewBuilding(true)
    let cancelled = false

    buildNftPreviews(imageFiles, metadataFiles).then((items) => {
      if (cancelled) {
        // Component re-ran before we finished — revoke the URLs we just created
        items.forEach((p) => URL.revokeObjectURL(p.imageUrl))
        return
      }
      setNftPreviews(items)
      setPreviewBuilding(false)
    })

    return () => { cancelled = true }
  }, [imageFiles, metadataFiles])

  // Revoke object URLs of the OLD preview set whenever previews are replaced
  useEffect(() => {
    return () => { nftPreviews.forEach((p) => URL.revokeObjectURL(p.imageUrl)) }
  }, [nftPreviews])

  // Watch step2State transitions to capture uploadedAt and end replace mode
  useEffect(() => {
    const prev = prevStep2State.current
    if (prev !== 'done' && step2State === 'done') {
      setUploadedAt(new Date())
      if (localReplacing) setLocalReplacing(false)
    }
    prevStep2State.current = step2State
  }, [step2State, localReplacing])

  // Cleanup copy timer on unmount so it doesn't fire on dead state
  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current) }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCopy = useCallback((which: 'images' | 'metadata') => {
    const uri = which === 'images' ? imagesBaseUri : metadataBaseUri
    if (!uri) return
    try { navigator.clipboard.writeText(uri) } catch { /* clipboard unavailable */ }
    setCopied(which)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(null), 2000)
  }, [imagesBaseUri, metadataBaseUri])

  function handleReplace() {
    setLocalReplacing(true)
    // Don't clear files — previews remain visible above the re-shown drop zones
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7">

      {/* ── A. Section header ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-dark-text-primary">Media & Metadata</h2>

          {/* Download example ZIP — gives newcomers a working template to copy.
              Canvas generates the PNGs on the fly so no static assets needed. */}
          <button
            type="button"
            onClick={downloadExampleCollection}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg
                       border border-dark-border-secondary bg-dark-bg-secondary
                       text-xs font-medium text-dark-text-secondary
                       hover:border-dark-accent-primary/50 hover:text-dark-accent-primary
                       transition-colors duration-150"
          >
            <Download className="w-3.5 h-3.5" />
            Download example collection
          </button>
        </div>
        <p className="text-sm text-dark-text-tertiary mt-1">
          Upload your NFT images and metadata files to IPFS. Name them starting from 0 —{' '}
          <span className="font-mono text-dark-text-secondary">0.png, 1.png…</span> and{' '}
          <span className="font-mono text-dark-text-secondary">0.json, 1.json…</span>.
          A live preview loads instantly from your local files before anything hits the network.
        </p>
      </div>

      {/* ── B. Error banner ───────────────────────────────────────────────────── */}
      {step2Error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {step2Error}
        </div>
      )}

      {/* ── C. Pre-upload NFT preview grid ───────────────────────────────────── */}
      {!showSuccessUI && (nftPreviews.length > 0 || previewBuilding) && (
        <NftPreviewGrid
          items={nftPreviews}
          label="Collection Preview — verify your files look correct"
          building={previewBuilding}
          totalCount={imageFiles.length}
          mismatch={mismatch}
          onCardClick={setSelectedNft}
        />
      )}

      {/* ── D. Folder zones ───────────────────────────────────────────────────── */}
      {showUploadUI && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FolderZone
            label="Images Folder"
            hint="0.png, 1.png, 2.png…"
            files={imageFiles}
            onFiles={setImageFiles}
            icon={<Image className="w-4 h-4 text-dark-accent-primary" />}
            accentClass="text-dark-accent-primary"
            disabled={isUploading}
            baseUri={imagesBaseUri}
          />
          <FolderZone
            label="Metadata Folder"
            hint="0.json, 1.json, 2.json…"
            files={metadataFiles}
            onFiles={setMetadataFiles}
            icon={<FileJson className="w-4 h-4 text-dark-accent-secondary" />}
            accentClass="text-dark-accent-secondary"
            disabled={isUploading}
            baseUri={metadataBaseUri}
          />
        </div>
      )}

      {/* ── E. Large gradient Upload CTA ─────────────────────────────────────── */}
      {showUploadUI && (
        <button
          type="button"
          onClick={onUpload}
          disabled={!hasAny || isUploading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4
                     rounded-2xl bg-gradient-accent text-white font-bold text-base
                     hover:shadow-glow-lg hover:opacity-90 active:opacity-75
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isUploading
            ? <><span className="tabular-nums font-mono">{uploadProgress}%</span> Uploading to IPFS…</>
            : <><CloudUpload className="w-5 h-5" /> Upload to IPFS</>
          }
        </button>
      )}

      {/* ── F. IPFS success panel ─────────────────────────────────────────────── */}
      {showSuccessUI && (
        <IpfsSuccessPanel
          imageCount={imageFiles.length || metadataFiles.length}
          imagesBaseUri={imagesBaseUri}
          metadataBaseUri={metadataBaseUri}
          uploadedAt={uploadedAt}
          copied={copied}
          onCopy={handleCopy}
          onReplace={handleReplace}
        />
      )}

      {/* ── G. Post-upload NFT review grid ───────────────────────────────────── */}
      {showSuccessUI && nftPreviews.length > 0 && (
        <NftPreviewGrid
          items={nftPreviews}
          label="Uploaded to IPFS"
          labelAccent
          totalCount={imageFiles.length}
          mismatch={false}
          onCardClick={setSelectedNft}
        />
      )}

      {/* ── NFT detail modal ──────────────────────────────────────────────────── */}
      {selectedNft && (
        <NftDetailModal item={selectedNft} onClose={() => setSelectedNft(null)} />
      )}

      {/* ── H. Divider + nav actions ──────────────────────────────────────────── */}
      <div className="border-t border-dark-border-primary" />

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button type="button" variant="primary" disabled={!canNext} onClick={onNext}>
          Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

    </div>
  )
}

// Coded by Juan - drag a folder, see your NFTs live, upload to IPFS, get a URI. That's Step 2.
// P.S. - Object URLs are temporary. IPFS is forever. (At least until the pin expires. Shh.)
