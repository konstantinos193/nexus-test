'use client'

/**
 * NftAssetToast.tsx
 * The little popup that says "success" or "error." We keep it polite (aria-live="polite")
 * because screaming at the user is bad UX. We scream internally instead.
 *
 * @author Juan – toast chef and bearer of bad news
 */

export interface NftAssetToastProps {
  type: 'success' | 'error'
  message: string
}

export default function NftAssetToast({ type, message }: NftAssetToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`nft-asset-tool-toast nft-asset-tool-toast--${type}`}
    >
      {message}
    </div>
  )
}

// — Juan. Green = hope. Red = we told you so.
