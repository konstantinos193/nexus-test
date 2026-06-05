/**
 * mint.ts — Builds the Borsh-encoded instruction data for the `mint` instruction.
 * Discriminator taken directly from the IDL (nexus_launchpad.json) — no runtime SHA-256 needed.
 * For public mints: allowlist_proof is an empty Vec, allowlist_leaf_index is 0.
 */
export function buildMintData(quantity: number): Buffer {
  const disc     = Buffer.from([51, 57, 225, 47, 182, 146, 137, 166])
  const qty      = Buffer.from([quantity])
  const proofLen = Buffer.alloc(4)
  proofLen.writeUInt32LE(0, 0)
  const leafIdx  = Buffer.alloc(4)
  leafIdx.writeUInt32LE(0, 0)
  return Buffer.concat([disc, qty, proofLen, leafIdx])
}
