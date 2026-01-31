/**
 * User-friendly wallet/transaction error messages.
 * Never show raw error dumps in production.
 */

export function mapWalletErrorToMessage(error: unknown): string {
  if (error == null) return 'Something went wrong'
  const msg = error instanceof Error ? error.message : String(error)
  const lower = msg.toLowerCase()

  if (lower.includes('user rejected') || lower.includes('rejected') || lower.includes('denied'))
    return 'Signature rejected'
  if (lower.includes('wallet not installed') || lower.includes('phantom') && lower.includes('install'))
    return 'Install Phantom or another supported wallet'
  if (lower.includes('not installed') || lower.includes('no provider'))
    return 'Wallet not installed'
  if (lower.includes('network') || lower.includes('rpc') || lower.includes('fetch'))
    return 'Network busy — try again'
  if (lower.includes('insufficient') || lower.includes('not enough') || lower.includes('balance'))
    return 'Not enough SOL'
  if (lower.includes('blockhash') || lower.includes('expired'))
    return 'Transaction expired — try again'
  if (lower.includes('simulation failed'))
    return 'Transaction would fail — check balance and try again'

  return 'Something went wrong — try again'
}
