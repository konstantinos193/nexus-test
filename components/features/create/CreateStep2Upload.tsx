'use client'

/**
 * Create flow — Step 2: Media & Metadata (Upload).
 * Images + metadata folders, IPFS upload, NFT preview.
 */

import { useState, useCallback } from 'react'
import type { NftPreviewItem } from './create-types'
import { downloadExampleCollection } from '@/lib/create/example-collection'

export interface CreateStep2UploadProps {
  imagesFolderFiles: File[]
  metadataFolderFiles: File[]
  baseUri: string | null
  baseUriUploading: boolean
  baseUriError: string | null
  collectionImage: string | null
  imagesDragOver: boolean
  metadataDragOver: boolean
  setImagesDragOver: (v: boolean) => void
  setMetadataDragOver: (v: boolean) => void
  onImagesClick: () => void
  onImagesDrop: (e: React.DragEvent) => void
  onImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onMetadataClick: () => void
  onMetadataDrop: (e: React.DragEvent) => void
  onMetadataChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  imagesInputRef: React.RefObject<HTMLInputElement | null>
  metadataInputRef: React.RefObject<HTMLInputElement | null>
  previewItems: NftPreviewItem[]
  onPreviewItemClick: (item: NftPreviewItem) => void
  howItWorksOpen: boolean
  setHowItWorksOpen: (open: boolean) => void
}

export default function CreateStep2Upload({
  imagesFolderFiles,
  metadataFolderFiles,
  baseUri,
  baseUriUploading,
  baseUriError,
  collectionImage,
  imagesDragOver,
  metadataDragOver,
  setImagesDragOver,
  setMetadataDragOver,
  onImagesClick,
  onImagesDrop,
  onImagesChange,
  onMetadataClick,
  onMetadataDrop,
  onMetadataChange,
  imagesInputRef,
  metadataInputRef,
  previewItems,
  onPreviewItemClick,
  howItWorksOpen,
  setHowItWorksOpen,
}: CreateStep2UploadProps) {
  const [downloading, setDownloading] = useState(false)
  const onDownloadExample = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadExampleCollection()
    } finally {
      setDownloading(false)
    }
  }, [])

  return (
    <div className="nft-create-step-main nft-create-step2">
      <h2 className="nft-create-step2-title">Media & Metadata</h2>
      <p className="nft-create-step2-sub">Add your images and metadata folders, then upload to IPFS.</p>
      <p className="nft-create-step2-download-row">
        <button
          type="button"
          className="nft-create-btn-secondary nft-create-step2-download-example"
          onClick={onDownloadExample}
          disabled={downloading}
        >
          {downloading ? 'Preparing…' : 'Download example collection'}
        </button>
        <span className="nft-create-step2-download-hint">See how images and metadata should look</span>
      </p>

      <div className="nft-create-step2-flow">
        <div className={`nft-create-step2-flow-item ${imagesFolderFiles.length > 0 ? 'done' : 'active'}`}>
          <span className="nft-create-step2-flow-num">1</span>
          <span className="nft-create-step2-flow-label">Images</span>
          {imagesFolderFiles.length > 0 && <span className="nft-create-step2-flow-check" aria-hidden>✓</span>}
        </div>
        <span className="nft-create-step2-flow-arrow" aria-hidden>→</span>
        <div className={`nft-create-step2-flow-item ${metadataFolderFiles.length > 0 ? 'done' : imagesFolderFiles.length > 0 ? 'active' : ''}`}>
          <span className="nft-create-step2-flow-num">2</span>
          <span className="nft-create-step2-flow-label">Metadata</span>
          {metadataFolderFiles.length > 0 && <span className="nft-create-step2-flow-check" aria-hidden>✓</span>}
        </div>
        <span className="nft-create-step2-flow-arrow" aria-hidden>→</span>
        <div className={`nft-create-step2-flow-item ${baseUri ? 'done' : baseUriUploading ? 'active' : ''}`}>
          <span className="nft-create-step2-flow-num">3</span>
          <span className="nft-create-step2-flow-label">Upload</span>
          {baseUri && <span className="nft-create-step2-flow-check" aria-hidden>✓</span>}
        </div>
      </div>

      <div className="nft-create-step2-cards">
        <div className="nft-create-step2-card">
          <div
            role="button"
            tabIndex={0}
            className={`nft-create-upload nft-create-step2-dropzone ${imagesFolderFiles.length > 0 ? 'nft-create-step2-dropzone--done' : ''} ${imagesDragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setImagesDragOver(true) }}
            onDragLeave={() => setImagesDragOver(false)}
            onDrop={onImagesDrop}
            onClick={onImagesClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImagesClick() } }}
            aria-label="Select images folder"
          >
            <input
              ref={imagesInputRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              multiple
              onChange={onImagesChange}
            />
            {imagesFolderFiles.length > 0 ? (
              <>
                <div className="nft-create-step2-dropzone-title">{imagesFolderFiles.length} image{imagesFolderFiles.length !== 1 ? 's' : ''} ready</div>
                <div className="nft-create-step2-dropzone-hint">Drop again to replace</div>
                {collectionImage && (
                  <div className="nft-create-step2-dropzone-preview">
                    <img src={collectionImage} alt="Preview" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="nft-create-step2-dropzone-title">Images folder</div>
                <div className="nft-create-step2-dropzone-hint">PNG / JPG · 0.png, 1.png, …</div>
              </>
            )}
          </div>
        </div>
        <div className="nft-create-step2-card">
          <div
            role="button"
            tabIndex={0}
            className={`nft-create-upload nft-create-step2-dropzone ${metadataFolderFiles.length > 0 ? 'nft-create-step2-dropzone--done' : ''} ${metadataDragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setMetadataDragOver(true) }}
            onDragLeave={() => setMetadataDragOver(false)}
            onDrop={onMetadataDrop}
            onClick={onMetadataClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMetadataClick() } }}
            aria-label="Select metadata folder"
          >
            <input
              ref={metadataInputRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              multiple
              onChange={onMetadataChange}
            />
            {metadataFolderFiles.length > 0 ? (
              <>
                <div className="nft-create-step2-dropzone-title">{metadataFolderFiles.length} metadata file{metadataFolderFiles.length !== 1 ? 's' : ''} ready</div>
                <div className="nft-create-step2-dropzone-hint">Drop again to replace</div>
              </>
            ) : (
              <>
                <div className="nft-create-step2-dropzone-title">Metadata folder</div>
                <div className="nft-create-step2-dropzone-hint">JSON · 0.json, 1.json, …</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="nft-create-step2-status">
        {baseUriUploading && (
          <span className="nft-create-step2-status-msg nft-create-step2-status-msg--uploading">Uploading…</span>
        )}
        {baseUri && !baseUriUploading && (
          <span className="nft-create-step2-status-msg nft-create-step2-status-msg--done">✓ Ready</span>
        )}
        {baseUriError && (
          <span className="nft-create-inline-error nft-create-step2-error" role="alert">{baseUriError}</span>
        )}
      </div>

      {previewItems.length > 0 && (
        <div className="nft-create-step2-preview">
          <h3 className="nft-create-step2-preview-title">Preview · {previewItems.length} item{previewItems.length !== 1 ? 's' : ''} <span className="nft-create-step2-preview-hint">(click for details)</span></h3>
          <div className="nft-create-step2-preview-grid">
            {previewItems.map((item) => (
              <button
                key={item.stem}
                type="button"
                className="nft-create-step2-preview-card"
                onClick={() => onPreviewItemClick(item)}
                aria-label={`View details for ${item.name}`}
              >
                <div className="nft-create-step2-preview-card-image">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <span className="nft-create-step2-preview-card-placeholder">No image</span>
                  )}
                </div>
                <div className="nft-create-step2-preview-card-body">
                  <div className="nft-create-step2-preview-card-name">{item.name}</div>
                  {item.attributes.length > 0 && (
                    <div className="nft-create-step2-preview-card-attrs">
                      {item.attributes.slice(0, 2).map((a, j) => (
                        <span key={j} className="nft-create-step2-preview-attr" title={`${a.trait_type}: ${a.value}`}>
                          {a.trait_type}: {a.value}
                        </span>
                      ))}
                      {item.attributes.length > 2 && (
                        <span className="nft-create-step2-preview-attr-more">+{item.attributes.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <details
        className="nft-create-step2-details"
        open={howItWorksOpen}
        onToggle={(e) => setHowItWorksOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="nft-create-step2-details-summary">How it works</summary>
        <div className="nft-create-upload-ipfs-note nft-create-step2-how-note">
          <p>Your images are uploaded to permanent, decentralized storage first.</p>
          <p>We then update your metadata automatically so each NFT is linked to the correct image. When uploads finish, you&apos;ll see a single link—your collection&apos;s metadata URI—which you&apos;ll use in the next step when you deploy.</p>
        </div>
      </details>
    </div>
  )
}
