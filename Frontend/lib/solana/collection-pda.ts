/**
 * collection-pda.ts — Resolve the on-chain Collection account from a stored address.
 *
 * The collection PDA is seeded with ["collection", mintSeed] where mintSeed is a
 * generated keypair pubkey set at deploy time.
 *
 * Older deploys saved the collection PDA itself as mintAddress. Newer/synced records
 * store the mint seed pubkey. resolveCollectionPda handles both.
 */
import { Connection, PublicKey } from '@solana/web3.js'

const COLLECTION_SEED = Buffer.from('collection')

export const MINT_SPLIT_CONFIG_DISC = Buffer.from([169, 57, 103, 31, 150, 143, 133, 25])

export function deriveCollectionPda(mintSeed: PublicKey, programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [COLLECTION_SEED, mintSeed.toBuffer()],
    programId,
  )
  return pda
}

/**
 * Returns the collection account address that exists on-chain for this stored value.
 */
export async function resolveCollectionPda(
  connection: Connection,
  storedAddress: string | PublicKey,
  programId: PublicKey,
): Promise<PublicKey> {
  const stored = typeof storedAddress === 'string'
    ? new PublicKey(storedAddress)
    : storedAddress

  const directInfo = await connection.getAccountInfo(stored)
  if (directInfo?.owner.equals(programId)) {
    return stored
  }

  const derived = deriveCollectionPda(stored, programId)
  const derivedInfo = await connection.getAccountInfo(derived)
  if (derivedInfo?.owner.equals(programId)) {
    return derived
  }

  throw new Error(
    'Collection account not found on-chain. The stored address may be invalid or the deployment may not have finalized.',
  )
}

/** Decode active split recipients from a MintSplitConfig account. */
export function decodeMintSplitRecipients(data: Buffer): PublicKey[] {
  if (data.length < 8 + 1 + 320 + 10) return []
  if (!data.subarray(0, 8).equals(MINT_SPLIT_CONFIG_DISC)) return []

  const num = data[8]
  const recipients: PublicKey[] = []
  for (let i = 0; i < num && i < 10; i++) {
    recipients.push(new PublicKey(data.subarray(9 + i * 32, 9 + (i + 1) * 32)))
  }
  return recipients
}