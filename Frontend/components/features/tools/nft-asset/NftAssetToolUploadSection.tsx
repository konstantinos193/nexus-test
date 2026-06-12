'use client'

/**
 * NftAssetToolUploadSection.tsx - The drop zone and layer list.
 * Drag-and-drop reorder, rename, delete. All state lives upstairs; we just render it.
 * So many props we could've used a context – but we didn't. This is the way.
 * (The prop-drilling way. At least it's honest.)
 *
 * @author Juan – upload wrangler, prop plumber, and drag-event survivor
 */

// The ref we need for the hidden file input
import { useRef } from 'react'

// Lucide icons for the drag handle, folder button, and delete action
import { Trash2, FolderUp, GripVertical } from 'lucide-react'

// The layer type – all we know about a layer lives here
import type { LayerFolder } from './nft-asset-utils'

export interface NftAssetToolUploadSectionProps {
  layers: LayerFolder[]
  sortedLayersStable: LayerFolder[]
  totalCombinations: number
  validCombinationCount: number
  exclusionRulesCount: number
  dragOver: boolean
  setDragOver: (v: boolean) => void
  onDrop: (e: React.DragEvent) => void
  onDirectoryChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReorder: (layerId: string, toIndex: number) => void
  onLayerNameChange: (id: string, name: string) => void
  onMoveLayer: (id: string, direction: -1 | 1) => void
  onRemoveLayer: (id: string) => void
  layerDragId: string | null
  setLayerDragId: (id: string | null) => void
  layerDropIndex: number | null
  setLayerDropIndex: (index: number | null) => void
}

export default function NftAssetToolUploadSection({
  layers,
  sortedLayersStable,
  totalCombinations,
  validCombinationCount,
  exclusionRulesCount,
  dragOver,
  setDragOver,
  onDrop,
  onDirectoryChange,
  onReorder,
  onLayerNameChange,
  onMoveLayer,
  onRemoveLayer,
  layerDragId,
  setLayerDragId,
  layerDropIndex,
  setLayerDropIndex,
}: NftAssetToolUploadSectionProps) {
  const dirInputRef = useRef<HTMLInputElement>(null)

  // What the drop zone says depending on current state
  let uploadSummary: string
  if (layers.length === 0) {
    uploadSummary = 'Drop folder or click to select'
  } else if (exclusionRulesCount > 0) {
    uploadSummary = `${layers.length} layers · ${validCombinationCount.toLocaleString()} valid of ${totalCombinations.toLocaleString()}`
  } else {
    uploadSummary = `${layers.length} layers · ${totalCombinations.toLocaleString()} combinations`
  }

  return (
    <section aria-labelledby="layers-heading" className="space-y-5">
      <div>
        <h2 id="layers-heading" className="text-base font-semibold text-dark-text-primary">
          Collection folder
        </h2>
        <p className="mt-1 text-sm text-dark-text-tertiary">
          One folder with trait subfolders inside (e.g. Backgrounds, Body, Eyes). Each subfolder ={' '}
          one layer.
        </p>
      </div>

      {/* Drop zone – border changes color on drag and when populated */}
      <div
        className={[
          'nft-upload-zone-accent relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragOver
            ? 'border-dark-accent-primary/60 bg-dark-accent-primary/5'
            : layers.length > 0
              ? 'border-dark-border-secondary bg-dark-bg-secondary'
              : 'border-dark-border-primary bg-dark-bg-secondary hover:border-dark-border-accent',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* Hidden file input – triggered by the button below */}
        <input
          ref={dirInputRef}
          type="file"
          className="sr-only"
          aria-hidden
          {...({
            webkitdirectory: '',
            directory: '',
            multiple: true,
          } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={onDirectoryChange}
        />

        {layers.length === 0 ? (
          /* Empty state: icon + instructions */
          <div className="flex flex-col items-center gap-3">
            <FolderUp
              size={32}
              className="text-dark-text-tertiary"
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-dark-text-primary">{uploadSummary}</p>
              <p className="mt-0.5 text-xs text-dark-text-tertiary">
                Folder that contains Backgrounds, Body, Eyes, etc.
              </p>
            </div>
          </div>
        ) : (
          /* Has layers: just show summary text */
          <p className="text-sm font-semibold text-dark-text-primary">{uploadSummary}</p>
        )}

        <button
          type="button"
          onClick={() => dirInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-dark-border-primary bg-dark-bg-primary px-4 py-2 text-sm font-medium text-dark-text-secondary transition-colors hover:border-dark-border-secondary hover:text-dark-text-primary"
        >
          <FolderUp size={16} aria-hidden />
          Select folder
        </button>
      </div>

      {/* Layer list – only shown when we have layers to show */}
      {layers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-dark-text-tertiary">
            <strong className="text-dark-text-secondary">1 = furthest back</strong> (drawn first),
            last = front. Drag the handle to reorder.
          </p>

          <ul className="space-y-1.5" role="list">
            {sortedLayersStable.map((layer, index) => (
              <li
                key={layer.id}
                data-index={index}
                className={[
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  layerDragId === layer.id ? 'opacity-40' : '',
                  layerDropIndex === index
                    ? 'border-dark-accent-primary/50 bg-dark-accent-primary/5'
                    : 'border-dark-border-primary bg-dark-bg-secondary',
                ].join(' ')}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setLayerDropIndex(index)
                }}
                onDragLeave={() => setLayerDropIndex(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) onReorder(id, index)
                }}
              >
                {/* Layer number badge */}
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dark-bg-primary text-xs font-bold text-dark-text-tertiary"
                  aria-label={`Layer ${index + 1}, furthest back is 1`}
                >
                  {index + 1}
                </span>

                {/* Drag handle */}
                <span
                  className="cursor-grab text-dark-text-tertiary hover:text-dark-text-secondary active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    setLayerDragId(layer.id)
                    e.dataTransfer.setData('text/plain', layer.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setLayerDragId(null)
                    setLayerDropIndex(null)
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Drag to reorder layer"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && index < layers.length - 1) {
                      e.preventDefault()
                      onReorder(layer.id, index + 1)
                    } else if (e.key === 'ArrowUp' && index > 0) {
                      e.preventDefault()
                      onReorder(layer.id, index - 1)
                    }
                  }}
                >
                  <GripVertical size={16} />
                </span>

                {/* Layer name input + file count */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => onLayerNameChange(layer.id, e.target.value)}
                    placeholder="Trait type (e.g. Background)"
                    title="Trait type in metadata"
                    className="min-w-0 flex-1 rounded-md border border-dark-border-primary bg-dark-bg-primary px-2.5 py-1.5 text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:border-dark-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                  />
                  <span className="shrink-0 text-xs text-dark-text-tertiary">
                    {layer.files.length} files
                  </span>
                </div>

                {/* Move up / down / delete */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveLayer(layer.id, -1)}
                    disabled={index <= 0}
                    aria-label="Move down (draw later)"
                    className="rounded p-1.5 text-dark-text-tertiary transition-colors hover:bg-dark-bg-hover hover:text-dark-text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveLayer(layer.id, 1)}
                    disabled={index >= layers.length - 1}
                    aria-label="Move up (draw sooner)"
                    className="rounded p-1.5 text-dark-text-tertiary transition-colors hover:bg-dark-bg-hover hover:text-dark-text-secondary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveLayer(layer.id)}
                    aria-label="Remove layer"
                    className="rounded p-1.5 text-dark-text-tertiary transition-colors hover:bg-dark-accent-error/10 hover:text-dark-accent-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// — Juan. Drag to reorder. We believe in you. (We've seen the folder structure.)
