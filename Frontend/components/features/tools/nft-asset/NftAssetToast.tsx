'use client'

/**
 * NftAssetToast.tsx - The little popup that says success or error.
 * We keep it polite (aria-live="polite") because screaming at the user is bad UX.
 * We scream internally instead. The animation lives in nft-asset-tool.css.
 *
 * @author Juan – toast chef, bearer of bad news, reformed custom-CSS addict
 */

// The only prop types this component needs – type-safe happiness or despair
export interface NftAssetToastProps {
  type: 'success' | 'error'
  message: string
}

export default function NftAssetToast({ type, message }: NftAssetToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ animation: 'nft-asset-toast-in 0.2s ease-out' }}
      className={[
        'fixed bottom-6 right-6 z-50 max-w-xs rounded-xl border px-4 py-3 text-sm font-medium shadow-dark-lg',
        type === 'success'
          ? 'border-dark-accent-success/30 bg-dark-bg-secondary text-dark-accent-success'
          : 'border-dark-accent-error/30 bg-dark-bg-secondary text-dark-accent-error',
      ].join(' ')}
    >
      {message}
    </div>
  )
}

// — Juan. Green = hope. Red = we told you so.
