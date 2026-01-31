/**
 * Wallet session keys — clear on disconnect / wallet change.
 * Used for: JWT session, cached whitelist, mint counters.
 */

const PREFIX = 'nexus-wallet-'

export const SESSION_KEYS = {
  /** Cached whitelist / allowlist status per drop */
  allowlist: (dropId: string) => `${PREFIX}allowlist-${dropId}`,
  /** Auth / JWT if you add sign-message login later */
  auth: `${PREFIX}auth`,
  /** Any mint-related cache */
  mintCache: (dropId: string) => `${PREFIX}mint-${dropId}`,
} as const

/** Keys to clear on disconnect (pattern or exact). Clear all nexus-wallet-* for simplicity. */
export function clearWalletSession(): void {
  if (typeof window === 'undefined') return
  const keysToRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key?.startsWith(PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => window.localStorage.removeItem(k))
}
