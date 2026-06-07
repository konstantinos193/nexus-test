/**
 * confirm.ts - HTTP-polling transaction confirmation
 * Replaces connection.confirmTransaction(), which depends on WebSocket subscriptions.
 * WebSockets to the RPC node are unreliable in some environments — this never hangs.
 *
 * The approach: poll getSignatureStatuses() via HTTP every 1.5 s, bail out
 * if the block height expires before the transaction is seen as confirmed.
 * 90 s total timeout as a hard backstop for the truly eternal edge cases.
 *
 * @author Juan - The developer who grew tired of watching confirmTransaction hang
 * (Coded with respect for WebSocket protocols and zero trust in their availability)
 */

// Solana web3.js primitives — connection, types, and the blessed concept of finality.
import { Connection, TransactionSignature } from '@solana/web3.js'

// How long to wait between status polls. 1.5 s is fast enough to feel responsive,
// slow enough not to hammer the RPC node into a defensive posture.
const POLL_INTERVAL_MS = 1_500

// Maximum number of poll attempts before giving up entirely.
// 120 attempts × 1.5 s ≈ 180 seconds (3 minutes). Increased for slow networks/devnet.
const MAX_RETRIES = 120

/**
 * pollForConfirmation
 *
 * Waits for a transaction to reach 'confirmed' commitment by polling the RPC
 * over plain HTTP. No WebSocket required, no subscription, no drama.
 *
 * Throws if:
 * - The transaction fails on-chain (status.err is set)
 * - The block height exceeds lastValidBlockHeight before confirmation (expired)
 * - 90 seconds pass without any confirmation (hard timeout)
 *
 * @param connection          - Active Solana connection (HTTP endpoint is all we need)
 * @param signature           - The transaction signature to watch
 * @param blockhash           - The blockhash used in the transaction (for expiry check)
 * @param lastValidBlockHeight - The last block height at which the tx is still valid
 */
export async function pollForConfirmation(
  connection: Connection,
  signature: TransactionSignature,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<void> {
  // blockhash is accepted for API symmetry with confirmTransaction().
  // Block height expiry is checked directly — blockhash isn't needed after that.
  void blockhash
  console.log('[pollForConfirmation] Starting confirmation poll for sig:', signature, 'lastValidBlockHeight:', lastValidBlockHeight)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`[pollForConfirmation] Attempt ${attempt + 1}/${MAX_RETRIES}`)

    // Check if the transaction's validity window has passed before asking about status.
    // If the chain has moved past lastValidBlockHeight, this tx will never be included.
    const currentHeight = await connection.getBlockHeight('confirmed')
    console.log(`[pollForConfirmation] Current block height: ${currentHeight}, lastValid: ${lastValidBlockHeight}`)

    if (currentHeight > lastValidBlockHeight) {
      console.error('[pollForConfirmation] ❌ Transaction expired: block height exceeded')
      throw new Error(
        'Transaction expired: block height exceeded before confirmation. ' +
        'The network may be congested — please try again.',
      )
    }

    // Ask the RPC for this transaction's current status.
    // searchTransactionHistory: true covers the case where it was included in an
    // older block that isn't in the recent slots cache.
    console.log('[pollForConfirmation] Fetching signature status...')
    const { value: statuses } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })

    const status = statuses[0]
    console.log('[pollForConfirmation] Status response:', {
      exists: !!status,
      confirmationStatus: status?.confirmationStatus,
      err: status?.err,
      slot: status?.slot,
      confirmations: status?.confirmations,
    })

    // If the transaction was processed but failed on-chain, surface the error now.
    // No point waiting — a failed transaction won't become a successful one.
    if (status?.err) {
      console.error('[pollForConfirmation] ❌ Transaction failed on-chain:', status.err)
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`)
    }

    // 'confirmed' or 'finalized' means we're done. 'processed' is too early — that's
    // just "a node has seen it", not "a supermajority has agreed on it".
    if (
      status?.confirmationStatus === 'confirmed' ||
      status?.confirmationStatus === 'finalized'
    ) {
      console.log('[pollForConfirmation] ✅ Transaction confirmed at status:', status.confirmationStatus)
      return
    }

    // Not confirmed yet. Wait, then try again. The blockchain moves at its own pace.
    console.log(`[pollForConfirmation] Waiting ${POLL_INTERVAL_MS}ms before next attempt...`)
    await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  // We've exhausted all retries without a confirmation or expiry.
  // Something is very wrong with the network or the transaction.
  console.error('[pollForConfirmation] ❌ Timed out after exhausting retries')
  throw new Error(
    'Transaction confirmation timed out after 3 minutes. ' +
    'The transaction may still be processing on the network. ' +
    'Check your wallet or the signature on-chain to verify.',
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Reluctant foe of WebSocket subscriptions, champion of boring HTTP polling
// Note: This function does not use WebSockets. That is the entire point of its existence.
//       If the transaction hangs again, the problem is elsewhere. (Probably IPFS.)
// ─────────────────────────────────────────────────────────────────────────────
