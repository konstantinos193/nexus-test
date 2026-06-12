import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
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

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

function deriveMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return pda
}

function deriveMasterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )
  return pda
}

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
  /** Instructions to prepend to the transaction (e.g. ATA creation for Legacy mints) */
  preInstructions: TransactionInstruction[]
  /** Extra signers the wallet must include (Core asset keypairs, Legacy mint keypairs, etc.) */
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

  // Named accounts: core_collection, mint_authority, mpl_core_program, system_program.
  // mpl_core_program is a required named account in MintNFT regardless of standard.
  keys.push(
    { pubkey: coreCollection, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(MPL_CORE_PROGRAM_ID), isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  )

  const extraSigners: Keypair[] = []
  const preInstructions: TransactionInstruction[] = []

  // Split accounts come before per-NFT remaining_accounts (same for all standards).
  if (isValidSplitConfig && splitInfo) {
    keys.push({ pubkey: buyer, isSigner: true, isWritable: true })
    for (const recipient of decodeMintSplitRecipients(splitInfo.data)) {
      keys.push({ pubkey: recipient, isSigner: false, isWritable: true })
    }
  }

  if (standard === 'Core') {
    // One fresh asset keypair per NFT.
    for (let i = 0; i < quantity; i++) {
      const asset = Keypair.generate()
      extraSigners.push(asset)
      keys.push({ pubkey: asset.publicKey, isSigner: true, isWritable: true })
    }
  } else if (standard === 'Legacy') {
    // remaining_accounts for Legacy (after split accounts):
    //   [0]: token_metadata_program
    //   [1]: token_program
    //   per NFT i: [2 + i*4 .. 2 + i*4 + 4]
    //     mint (signer, writable), metadata PDA, master edition PDA, buyer ATA
    keys.push(
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    )

    for (let i = 0; i < quantity; i++) {
      const mint = Keypair.generate()
      extraSigners.push(mint)

      const metadata = deriveMetadataPda(mint.publicKey)
      const masterEdition = deriveMasterEditionPda(mint.publicKey)
      const ata = getAssociatedTokenAddressSync(mint.publicKey, buyer)

      // Create the ATA idempotently before the mint instruction executes.
      preInstructions.push(
        createAssociatedTokenAccountIdempotentInstruction(buyer, ata, buyer, mint.publicKey),
      )

      keys.push(
        { pubkey: mint.publicKey, isSigner: true, isWritable: true },
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: masterEdition, isSigner: false, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
      )
    }
  }

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: buildMintData(quantity),
  })

  return { instruction: ix, preInstructions, extraSigners, standard }
}

/** PDA helper used by deploy — collection from mint seed */
export { deriveCollectionPda }