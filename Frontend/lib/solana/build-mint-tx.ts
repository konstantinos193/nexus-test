import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import { buildMintData } from '@/lib/solana/mint'
import {
  decodeMintSplitRecipients,
  deriveCollectionPda,
  MINT_SPLIT_CONFIG_DISC,
  resolveCollectionPda,
} from '@/lib/solana/collection-pda'
import {
  decodeCollectionMintSeed,
  uiStandardFromAccount,
} from '@/lib/solana/collection-account'
import {
  MPL_CORE_PROGRAM_ID,
  STANDARD_LABELS,
  STANDARD_MINT_SUPPORT,
  type UiMetadataStandard,
} from '@/lib/solana/standards'

export interface MintTxParams {
  connection: Connection
  programId: PublicKey
  buyer: PublicKey
  creatorAddress: string
  platformWallet: string
  storedMintAddress: string
  quantity: number
}

export interface MintTxResult {
  instruction: TransactionInstruction
  /** Extra signers the wallet must include (Core asset keypairs, etc.) */
  extraSigners: Keypair[]
  standard: UiMetadataStandard
}

export async function buildMintInstruction(params: MintTxParams): Promise<MintTxResult> {
  const {
    connection, programId, buyer, creatorAddress, platformWallet,
    storedMintAddress, quantity,
  } = params

  const collectionPda = await resolveCollectionPda(connection, storedMintAddress, programId)
  const collectionInfo = await connection.getAccountInfo(collectionPda)
  if (!collectionInfo) throw new Error('Collection account not found on-chain.')

  const standard = uiStandardFromAccount(collectionInfo.data)
  if (!standard) throw new Error('Unknown metadata standard on this collection.')

  if (STANDARD_MINT_SUPPORT[standard] !== 'live') {
    throw new Error(
      `${STANDARD_LABELS[standard]} minting is not live yet. ` +
      `The create page lets you deploy this standard, but the on-chain minter for it is still being wired up. ` +
      `Redeploy with Core for now, or wait for the ${standard} CPI path.`,
    )
  }

  const mintSeed = decodeCollectionMintSeed(collectionInfo.data)
  const coreCollection = mintSeed // Core collection address == mint seed

  const [walletTracker] = PublicKey.findProgramAddressSync(
    [Buffer.from('wallet_mint'), collectionPda.toBuffer(), buyer.toBuffer()],
    programId,
  )

  const [mintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('mint_authority'), mintSeed.toBuffer()],
    programId,
  )

  const keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] = [
    { pubkey: collectionPda, isSigner: false, isWritable: true },
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: new PublicKey(creatorAddress), isSigner: false, isWritable: true },
    { pubkey: new PublicKey(platformWallet), isSigner: false, isWritable: true },
    { pubkey: walletTracker, isSigner: false, isWritable: true },
  ]

  const [splitConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from('split'), collectionPda.toBuffer()],
    programId,
  )
  const splitInfo = await connection.getAccountInfo(splitConfig)
  const isValidSplitConfig = splitInfo !== null &&
    splitInfo.data.length >= 8 &&
    splitInfo.data.subarray(0, 8).equals(MINT_SPLIT_CONFIG_DISC)

  if (isValidSplitConfig) {
    keys.push({ pubkey: splitConfig, isSigner: false, isWritable: false })
  }

  keys.push(
    { pubkey: coreCollection, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(MPL_CORE_PROGRAM_ID), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  )

  const extraSigners: Keypair[] = []

  if (isValidSplitConfig && splitInfo) {
    keys.push({ pubkey: buyer, isSigner: true, isWritable: true })
    for (const recipient of decodeMintSplitRecipients(splitInfo.data)) {
      keys.push({ pubkey: recipient, isSigner: false, isWritable: true })
    }
  }

  // One fresh asset keypair per NFT (remaining_accounts after split accounts)
  for (let i = 0; i < quantity; i++) {
    const asset = Keypair.generate()
    extraSigners.push(asset)
    keys.push({ pubkey: asset.publicKey, isSigner: true, isWritable: true })
  }

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: buildMintData(quantity),
  })

  return { instruction: ix, extraSigners, standard }
}

/** PDA helper used by deploy — collection from mint seed */
export { deriveCollectionPda }