'use client'

/**
 * NftAssetToolUploadSection.tsx
 * The drop zone and the list of layers. Drag-and-drop reorder, rename, delete. So many props
 * we could've used a context – but we didn't. This is the way. (The painful way.)
 *
 * @author Juan – upload wrangler and prop plumber
 */

import { useRef } from 'react'
import { Trash2, FolderUp, GripVertical } from 'lucide-react'
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

  let uploadText: string
  if (layers.length === 0) {
    uploadText = 'Drop folder or click to select'
  } else if (exclusionRulesCount > 0) {
    uploadText = `${layers.length} layers · ${validCombinationCount} valid of ${totalCombinations}`
  } else {
    uploadText = `${layers.length} layers · ${totalCombinations} combinations`
  }

  return (
    <section
      className="nft-asset-tool-section nft-asset-tool-section-upload"
      aria-labelledby="layers-heading"
    >
      <h2 id="layers-heading" className="nft-asset-tool-section-title">
        Collection folder
      </h2>
      <p className="nft-asset-tool-section-desc">
        One folder with trait subfolders inside (e.g. Backgrounds, Body, Eyes). Each subfolder = one
        layer.
      </p>
      <div
        className={`nft-asset-tool-upload-zone ${layers.length > 0 ? 'done' : ''} ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {layers.length === 0 ? (
          <div className="nft-asset-tool-upload-empty">
            <FolderUp size={32} className="nft-asset-tool-upload-empty-icon" aria-hidden />
            <div className="nft-asset-tool-upload-empty-copy">
              <p className="nft-asset-tool-upload-text">{uploadText}</p>
              <p className="nft-asset-tool-upload-sub">Folder that contains Backgrounds, Body, Eyes, etc.</p>
            </div>
          </div>
        ) : (
          <p className="nft-asset-tool-upload-text">{uploadText}</p>
        )}
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
        <button
          type="button"
          className="nft-asset-tool-btn nft-asset-tool-btn-add-folder"
          onClick={() => dirInputRef.current?.click()}
        >
          <FolderUp size={18} aria-hidden />
          Select folder
        </button>
      </div>

      {layers.length > 0 && (
        <>
          <p className="nft-asset-tool-upload-hint nft-asset-tool-layer-drag-hint">
            <strong>1 = furthest back</strong> (drawn first), last number = front (top). Drag the
            handle to reorder.
          </p>
          <ul className="nft-asset-tool-layers-list">
            {sortedLayersStable.map((layer, index) => (
              <li
                key={layer.id}
                className={`nft-asset-tool-layer-row ${layerDragId === layer.id ? 'dragging' : ''} ${layerDropIndex === index ? 'drop-target' : ''}`}
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
                data-index={index}
              >
                <span
                  className="nft-asset-tool-layer-num"
                  aria-label={`Layer ${index + 1}, furthest back is 1`}
                >
                  {index + 1}
                </span>
                <span
                  className="nft-asset-tool-layer-grip"
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
                  <GripVertical size={18} />
                </span>
                <div className="nft-asset-tool-layer-info">
                  <input
                    type="text"
                    className="nft-asset-tool-input nft-asset-tool-layer-name"
                    value={layer.name}
                    onChange={(e) => onLayerNameChange(layer.id, e.target.value)}
                    placeholder="Trait type (e.g. Background)"
                    title="Trait type in metadata (e.g. Background, Body)"
                  />
                  <span className="nft-asset-tool-layer-files">{layer.files.length} files</span>
                </div>
                <div className="nft-asset-tool-layer-actions">
                  <button
                    type="button"
                    className="nft-asset-tool-btn nft-asset-tool-btn-remove"
                    onClick={() => onMoveLayer(layer.id, -1)}
                    disabled={index <= 0}
                    aria-label="Move down (draw later)"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="nft-asset-tool-btn nft-asset-tool-btn-remove"
                    onClick={() => onMoveLayer(layer.id, 1)}
                    disabled={index >= layers.length - 1}
                    aria-label="Move up (draw sooner)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="nft-asset-tool-btn nft-asset-tool-btn-remove"
                    onClick={() => onRemoveLayer(layer.id)}
                    aria-label="Remove layer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// — Juan. Drag to reorder. We believe in you. (We've seen the folder structure.)
