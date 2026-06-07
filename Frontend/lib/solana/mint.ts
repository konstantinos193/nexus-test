/**
 * mint.ts — Builds the Borsh-encoded instruction data for the `mint` instruction.
 * Discriminator taken directly from the IDL (nexus_launchpad.json) — no runtime SHA-256 needed.
 * For public mints: allowlist_proof is an empty Vec, allowlist_leaf_index is 0.
 */
export function buildMintData(quantity: number): Buffer {
  console.log('[buildMintData] Building for quantity:', quantity)
  const disc     = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])
  console.log('[buildMintData] Discriminator:', disc.toString('hex'))
  const qty      = Buffer.from([quantity])
  console.log('[buildMintData] Quantity buffer:', qty.toString('hex'))
  const proofLen = Buffer.alloc(4)
  proofLen.writeUInt32LE(0, 0)
  console.log('[buildMintData] Proof length (empty):', proofLen.toString('hex'))
  const leafIdx  = Buffer.alloc(4)
  leafIdx.writeUInt32LE(0, 0)
  console.log('[buildMintData] Leaf index (0):', leafIdx.toString('hex'))
  const result = Buffer.concat([disc, qty, proofLen, leafIdx])
  console.log('[buildMintData] Final buffer:', result.toString('hex'), `(length=${result.length})`)
  return result
}
