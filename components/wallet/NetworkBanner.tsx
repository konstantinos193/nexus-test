'use client'

import { useNetworkCheck } from '@/hooks/useNetworkCheck'

/**
 * Shows a warning banner when the wallet/RPC is on the wrong network.
 * Disable mint and ask user to switch.
 */
export default function NetworkBanner() {
  const { isWrongNetwork, isChecking, error, expectedNetworkName } = useNetworkCheck()

  if (isChecking || !isWrongNetwork || !error) return null

  return (
    <div
      role="alert"
      style={{
        padding: '12px 16px',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: 8,
        color: '#fca5a5',
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'center',
      }}
    >
      {error} Switch to <strong>{expectedNetworkName}</strong> in your wallet settings.
    </div>
  )
}
