export const WALLET_STORAGE_KEY = 'nexus-wallet'

/**
 * True when running on a mobile device (phone/tablet).
 * Used to disable autoConnect on mobile to avoid redirect/reload loops
 * when the wallet app opens and the in-app browser reloads on return.
 * Only safe to call on the client (returns false when window is undefined).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}
