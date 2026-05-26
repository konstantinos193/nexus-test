'use client'

import { useState, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js'
import { collectionsApi, ipfsApi, uploadImageToIpfs } from '@/lib/api/client'
import { NFTCollection } from '@/types'
import type { ShareAddressRow } from '@/components/features/create/create-types'
import { ROYALTY_SPLIT_MAX } from '@/components/features/create/create-types'

export type SubmitState  = 'idle' | 'uploading' | 'deploying' | 'signing' | 'confirming' | 'success' | 'error'
export type Step2State   = 'idle' | 'uploading' | 'done' | 'error'
export type MetadataStandard = 'Core' | 'Legacy' | 'Metaplex' | 'Programmable' | 'CNFT' | 'Compressed'

export interface MintPhase {
  name:          string
  phaseType:     'public' | 'allowlist'
  startDateTime: string
  endDateTime?:  string
  priceOverride?: string
  maxPerWallet?:  string
  allowlistRaw?:  string
}

// ── Borsh encoding helpers ────────────────────────────────────────────────────
// Mirrors the backend contracts.service.ts encoding exactly.
// Discriminator = first 8 bytes of sha256("global:initialize_collection").

const INIT_COLLECTION_DISC = Buffer.from([112, 62, 53, 139, 173, 152, 98, 93])
const PLATFORM_FEE_BPS = 500

const METADATA_STANDARD_VARIANT: Record<string, number> = {
  Legacy: 0, Metaplex: 0, Programmable: 1, Core: 2, CNFT: 3, Compressed: 3,
}

function encodeU64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b
}
function encodeI64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b
}
function encodeOptionI64(v: bigint | null): Buffer {
  return v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), encodeI64LE(v)])
}
function encodeOptionU8(v: number | null): Buffer {
  return v === null ? Buffer.from([0]) : Buffer.from([1, v & 0xff])
}
function encodeInitCollectionData(
  cfg: {
    maxSupply: bigint
    pricePerNft: bigint
    startTime: bigint
    endTime: bigint | null
    mintLimitPerWallet: number | null
    metadataStandardVariant: number
    freezeTradingUntilDate: bigint | null
    freezeTradingUntilSoldOut: boolean
  },
  platformFeeBps: number,
): Buffer {
  const feeBuf = Buffer.alloc(2)
  feeBuf.writeUInt16LE(platformFeeBps, 0)
  return Buffer.concat([
    INIT_COLLECTION_DISC,
    encodeU64LE(cfg.maxSupply),
    encodeU64LE(cfg.pricePerNft),
    encodeI64LE(cfg.startTime),
    encodeOptionI64(cfg.endTime),
    encodeOptionU8(cfg.mintLimitPerWallet),
    Buffer.from([cfg.metadataStandardVariant & 0xff]),
    encodeOptionI64(cfg.freezeTradingUntilDate),
    Buffer.from([cfg.freezeTradingUntilSoldOut ? 1 : 0]),
    feeBuf,
  ])
}

// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export function useCreateCollectionForm() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const walletAddress = publicKey?.toBase58() ?? null

  // ── Step navigation ───────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const nextStep = useCallback(() => setStep(s => (Math.min(4, s + 1) as 1 | 2 | 3 | 4)), [])
  const prevStep = useCallback(() => setStep(s => (Math.max(1, s - 1) as 1 | 2 | 3 | 4)), [])

  // ── Step 1: Collection Details ────────────────────────────────────────────
  const [collectionName,   setCollectionName]   = useState('')
  const [symbol,           setSymbol]           = useState('')
  const [description,      setDescription]      = useState('')
  const [imageFile,        setImageFile]        = useState<File | null>(null)
  const [bannerFile,       setBannerFile]       = useState<File | null>(null)
  const [metadataStandard, setMetadataStandard] = useState<MetadataStandard>('Core')
  const [royaltyPercent,   setRoyaltyPercent]   = useState<number>(5)
  const [royaltyWallet,    setRoyaltyWallet]    = useState('')

  // ── Step 2: Media & Metadata ──────────────────────────────────────────────
  const [imageFiles,      setImageFiles]      = useState<File[]>([])
  const [metadataFiles,   setMetadataFiles]   = useState<File[]>([])
  const [imagesBaseUri,   setImagesBaseUri]   = useState<string | null>(null)
  const [metadataBaseUri, setMetadataBaseUri] = useState<string | null>(null)
  const [step2State,      setStep2State]      = useState<Step2State>('idle')
  const [step2Error,      setStep2Error]      = useState<string | null>(null)

  // ── Step 3: Mint Phases ───────────────────────────────────────────────────
  const totalSupply = metadataFiles.length || imageFiles.length || 0
  const [mintPrice,     setMintPrice]     = useState<number | ''>('')
  const [freeMint,      setFreeMint]      = useState(false)
  const [phases,        setPhases]        = useState<MintPhase[]>([
    { name: 'Public Sale', phaseType: 'public', startDateTime: '' },
  ])
  const [fundReceivers, setFundReceivers] = useState<ShareAddressRow[]>([{ share: '100', address: '' }])

  const updateFundReceiver = useCallback((i: number, field: 'share' | 'address', value: string) => {
    setFundReceivers(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }, [])

  const addFundReceiver = useCallback(() => {
    setFundReceivers(prev => prev.length < ROYALTY_SPLIT_MAX ? [...prev, { share: '0', address: '' }] : prev)
  }, [])

  const removeFundReceiver = useCallback((i: number) => {
    setFundReceivers(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const distributeFundReceiversEvenly = useCallback(() => {
    setFundReceivers(prev => {
      if (!prev.length) return prev
      const each = Math.floor(100 / prev.length)
      const bonus = 100 - each * prev.length
      return prev.map((r, i) => ({ ...r, share: String(i === 0 ? each + bonus : each) }))
    })
  }, [])

  const autoFillFundReceiversRemainder = useCallback(() => {
    setFundReceivers(prev => {
      const total = prev.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
      const remaining = parseFloat(Math.max(0, 100 - total).toFixed(1))
      let filled = false
      return prev.map(r => {
        if (!filled && (parseFloat(r.share) || 0) === 0) { filled = true; return { ...r, share: String(remaining) } }
        return r
      })
    })
  }, [])

  const fundReceiverTotal = fundReceivers.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
  const fundReceiverError: string | null = Math.abs(fundReceiverTotal - 100) > 0.01 ? 'Shares must total 100%' : null

  // ── Step 4: Deploy ────────────────────────────────────────────────────────
  const [submitState,       setSubmitState]       = useState<SubmitState>('idle')
  const [error,             setError]             = useState<string | null>(null)
  const [createdCollection, setCreatedCollection] = useState<NFTCollection | null>(null)

  // ── Step 1: just advance ──────────────────────────────────────────────────
  const handleStep1Next = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    nextStep()
  }, [nextStep])

  // ── Step 2: upload both directories to IPFS ───────────────────────────────
  const handleMediaUpload = useCallback(async () => {
    setStep2Error(null)
    if (!imageFiles.length && !metadataFiles.length) {
      setStep2Error('Add at least one folder before uploading.')
      return
    }
    setStep2State('uploading')
    try {
      const [imgResult, metaResult] = await Promise.all([
        imageFiles.length    ? ipfsApi.uploadDirectory(imageFiles)    : Promise.resolve(null),
        metadataFiles.length ? ipfsApi.uploadDirectory(metadataFiles) : Promise.resolve(null),
      ])
      if (imgResult  && !imgResult.success)  throw new Error(imgResult.error  ?? 'Images upload failed')
      if (metaResult && !metaResult.success) throw new Error(metaResult.error ?? 'Metadata upload failed')
      setImagesBaseUri(imgResult?.data?.baseUri   ?? null)
      setMetadataBaseUri(metaResult?.data?.baseUri ?? null)
      setStep2State('done')
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'Upload failed')
      setStep2State('error')
    }
  }, [imageFiles, metadataFiles])

  // ── Step 4: deploy flow ───────────────────────────────────────────────────
  // 1. Upload PFP + banner to IPFS
  // 2. Fetch program config from backend
  // 3. Build + send initialize_collection tx directly from the frontend wallet
  // 4. Wait for on-chain confirmation
  // 5. POST all collection data + signature to backend to save in DB
  const handleDeploy = useCallback(async () => {
    setError(null)
    if (!connected || !walletAddress) {
      setError('Connect your wallet before deploying.')
      return
    }

    try {
      // Step 1: upload collection PFP + banner
      setSubmitState('uploading')
      const [pfpResult, bannerResult] = await Promise.all([
        imageFile  ? uploadImageToIpfs(imageFile)  : Promise.resolve(null),
        bannerFile ? uploadImageToIpfs(bannerFile) : Promise.resolve(null),
      ])
      if (pfpResult    && !pfpResult.success)    throw new Error(pfpResult.error    ?? 'PFP upload failed')
      if (bannerResult && !bannerResult.success) throw new Error(bannerResult.error ?? 'Banner upload failed')

      // Step 2: fetch program config (program ID, platform wallet) from backend
      setSubmitState('deploying')
      const configRes = await fetch(`${API_BASE_URL}/api/solana/config`)
      if (!configRes.ok) throw new Error('Could not fetch Solana config from backend')
      const configData = await configRes.json()
      const programId     = configData.data?.programId     as string | undefined
      const platformWalletAddr = configData.data?.platformWallet as string | undefined
      if (!programId) throw new Error('Backend did not return a program ID')

      // Step 3: derive collection PDA — seeds: ["collection", authority]
      const authority = new PublicKey(walletAddress)
      const [collectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection'), authority.toBuffer()],
        new PublicKey(programId),
      )

      // Step 4: build initialize_collection instruction
      const supply = typeof totalSupply === 'number' && totalSupply > 0 ? totalSupply : 10_000
      const priceLamports = freeMint
        ? 0n
        : BigInt(Math.round((typeof mintPrice === 'number' ? mintPrice : 0) * 1e9))

      const validPhases = phases.filter(p => p.startDateTime)
      const firstPhase  = validPhases[0]
      const lastPhase   = validPhases.at(-1)
      const now         = BigInt(Math.floor(Date.now() / 1000))
      const startTs     = firstPhase?.startDateTime
        ? BigInt(Math.floor(new Date(firstPhase.startDateTime).getTime() / 1000))
        : now
      const endTs       = lastPhase?.endDateTime
        ? BigInt(Math.floor(new Date(lastPhase.endDateTime).getTime() / 1000))
        : null

      const instructionData = encodeInitCollectionData(
        {
          maxSupply:                 BigInt(supply),
          pricePerNft:               priceLamports,
          startTime:                 startTs,
          endTime:                   endTs,
          mintLimitPerWallet:        null,
          metadataStandardVariant:   METADATA_STANDARD_VARIANT[metadataStandard] ?? 2,
          freezeTradingUntilDate:    null,
          freezeTradingUntilSoldOut: false,
        },
        PLATFORM_FEE_BPS,
      )

      const platformWallet = new PublicKey(platformWalletAddr ?? walletAddress)

      const instruction = new TransactionInstruction({
        programId: new PublicKey(programId),
        keys: [
          { pubkey: collectionPda,            isSigner: false, isWritable: true  },
          { pubkey: authority,                isSigner: true,  isWritable: true  },
          { pubkey: authority,                isSigner: false, isWritable: false }, // mint_authority
          { pubkey: authority,                isSigner: false, isWritable: true  }, // creator_wallet
          { pubkey: platformWallet,           isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
        ],
        data: instructionData,
      })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction()
      tx.recentBlockhash = blockhash
      tx.feePayer = authority
      tx.add(instruction)

      // Step 5: wallet signs + submits
      setSubmitState('signing')
      const signature = await sendTransaction(tx, connection)

      // Step 6: wait for confirmation
      setSubmitState('confirming')
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')

      // Step 7: save to backend DB
      const saveResult = await collectionsApi.deploy({
        name:             collectionName.trim(),
        symbol:           (symbol.trim() || collectionName.trim().slice(0, 4)).toUpperCase(),
        description:      description.trim(),
        creatorAddress:   walletAddress,
        metadataStandard,
        uri:              metadataBaseUri ?? undefined,
        totalSupply:      supply,
        mintPrice:        freeMint ? 0 : (typeof mintPrice === 'number' ? mintPrice : undefined),
        freeMint,
        royaltyPercent,
        royaltyWallet:    royaltyWallet.trim() || walletAddress,
        phases:           validPhases,
        fundReceivers:    fundReceivers.filter(r => r.address.trim()),
        collectionAddress: collectionPda.toBase58(),
        txSignature:      signature,
        ...(pfpResult?.data    ? { collectionImage: pfpResult.data.uri }    : {}),
        ...(bannerResult?.data ? { bannerImage:     bannerResult.data.uri } : {}),
      })

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error ?? 'Failed to save collection')
      }

      setCreatedCollection({ id: saveResult.data.collectionId } as NFTCollection)
      setSubmitState('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message.includes('User rejected') ? 'Transaction cancelled.' : message)
      setSubmitState('error')
    }
  }, [
    connected, walletAddress,
    collectionName, symbol, description,
    imageFile, bannerFile,
    metadataStandard, metadataBaseUri,
    totalSupply, mintPrice, freeMint,
    royaltyPercent, royaltyWallet,
    phases, fundReceivers, sendTransaction, connection,
  ])

  const isDeploying = ['uploading', 'deploying', 'signing', 'confirming'].includes(submitState)

  return {
    // Navigation
    step, nextStep, prevStep,

    // Step 1
    collectionName,   setCollectionName,
    symbol,           setSymbol,
    description,      setDescription,
    imageFile,        setImageFile,
    bannerFile,       setBannerFile,
    metadataStandard, setMetadataStandard,
    royaltyPercent,   setRoyaltyPercent,
    royaltyWallet,    setRoyaltyWallet,
    handleStep1Next,

    // Step 2
    imageFiles,     setImageFiles,
    metadataFiles,  setMetadataFiles,
    imagesBaseUri,  metadataBaseUri,
    step2State,     step2Error,
    handleMediaUpload,

    // Step 3
    totalSupply,
    mintPrice,   setMintPrice,
    freeMint,    setFreeMint,
    phases,      setPhases,
    fundReceivers, updateFundReceiver, addFundReceiver, removeFundReceiver,
    distributeFundReceiversEvenly, autoFillFundReceiversRemainder,
    fundReceiverTotal, fundReceiverError,

    // Step 4
    submitState, error, createdCollection,
    handleDeploy,
    isConnected:  connected,
    walletAddress,
    isDeploying,
    isSuccess: submitState === 'success',
  }
}
