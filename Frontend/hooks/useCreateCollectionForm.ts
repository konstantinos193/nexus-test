'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js'
import { collectionsApi, ipfsApi, uploadImageToIpfs } from '@/lib/api/client'
import { pollForConfirmation } from '@/lib/solana/confirm'
import { NFTCollection } from '@/types'
import { type ShareAddressRow, type CreateDraftPayload, ROYALTY_SPLIT_MAX, DRAFT_STORAGE_KEY } from '@/components/features/create/create-types'

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

// ── Borsh helpers ─────────────────────────────────────────────────────────────

const METADATA_STANDARD_VARIANT: Record<string, number> = {
  Legacy: 0, Metaplex: 0, Programmable: 1, Core: 2, CNFT: 3, Compressed: 3,
}

const PLATFORM_FEE_BPS = 100

// Compute Anchor instruction discriminator at runtime: sha256("global:<name>")[0..8]
async function anchorDiscriminator(name: string): Promise<Buffer> {
  const preimage = new TextEncoder().encode(`global:${name}`)
  const hash = await crypto.subtle.digest('SHA-256', preimage)
  return Buffer.from(new Uint8Array(hash).slice(0, 8))
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
function encodeBorshString(s: string): Buffer {
  const bytes = Buffer.from(s, 'utf8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(bytes.length, 0)
  return Buffer.concat([len, bytes])
}

// Encode create_collection instruction data.
// Signature: create_collection(metadata_uri: String, config: CollectionConfig, platform_fee_bps: u16)
async function buildCreateCollectionData(params: {
  metadataUri: string
  maxSupply: bigint
  pricePerNft: bigint
  startTime: bigint
  endTime: bigint | null
  metadataStandardVariant: number
  platformFeeBps: number
}): Promise<Buffer> {
  const disc = await anchorDiscriminator('create_collection')

  const feeBuf = Buffer.alloc(2)
  feeBuf.writeUInt16LE(params.platformFeeBps, 0)

  return Buffer.concat([
    disc,
    encodeBorshString(params.metadataUri.slice(0, 128)), // metadata_uri (max 128 bytes on-chain)
    // CollectionConfig fields (AnchorSerialize order):
    encodeU64LE(params.maxSupply),                // max_supply
    encodeU64LE(params.pricePerNft),              // price_per_nft
    encodeI64LE(params.startTime),                // start_time
    encodeOptionI64(params.endTime),              // end_time: Option<i64>
    Buffer.from([0x00]),                          // mint_limit_per_wallet: None
    Buffer.from([params.metadataStandardVariant]),// metadata_standard (u8 enum variant)
    Buffer.from([0x00]),                          // freeze_trading_until_date: None
    Buffer.from([0x00]),                          // freeze_trading_until_sold_out: false
    feeBuf,                                       // platform_fee_bps
  ])
}

// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export function useCreateCollectionForm() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const walletAddress = publicKey?.toBase58() ?? null

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const nextStep = useCallback(() => setStep(s => (Math.min(4, s + 1) as 1 | 2 | 3 | 4)), [])
  const prevStep = useCallback(() => setStep(s => (Math.max(1, s - 1) as 1 | 2 | 3 | 4)), [])

  // Step 1
  const [collectionName,   setCollectionName]   = useState('')
  const [symbol,           setSymbol]           = useState('')
  const [description,      setDescription]      = useState('')
  const [imageFile,        setImageFile]        = useState<File | null>(null)
  const [bannerFile,       setBannerFile]       = useState<File | null>(null)
  const [metadataStandard, setMetadataStandard] = useState<MetadataStandard>('Core')
  const [royaltyPercent,   setRoyaltyPercent]   = useState<number>(5)
  const [royaltyWallet,    setRoyaltyWallet]    = useState('')
  const [twitterUrl,       setTwitterUrl]       = useState('')
  const [discordUrl,       setDiscordUrl]       = useState('')
  const [websiteUrl,       setWebsiteUrl]       = useState('')

  // Step 2
  const [imageFiles,      setImageFiles]      = useState<File[]>([])
  const [metadataFiles,   setMetadataFiles]   = useState<File[]>([])
  const [imagesBaseUri,   setImagesBaseUri]   = useState<string | null>(null)
  const [metadataBaseUri, setMetadataBaseUri] = useState<string | null>(null)
  const [step2State,      setStep2State]      = useState<Step2State>('idle')
  const [step2Error,      setStep2Error]      = useState<string | null>(null)

  // Step 3
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

  // Step 4
  const [submitState,       setSubmitState]       = useState<SubmitState>('idle')
  const [error,             setError]             = useState<string | null>(null)
  const [createdCollection, setCreatedCollection] = useState<NFTCollection | null>(null)
  const [estimatedFee,      setEstimatedFee]      = useState<number | null>(null)

  // ── Draft persistence ──────────────────────────────────────────────────────
  // Load draft once on mount (File objects can't be persisted, so imageFile etc. are not restored)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as CreateDraftPayload
      if (d.step && [1, 2, 3, 4].includes(d.step))  setStep(d.step as 1 | 2 | 3 | 4)
      if (d.collectionName)                          setCollectionName(d.collectionName)
      if (d.symbol)                                  setSymbol(d.symbol)
      if (d.collectionDescription)                   setDescription(d.collectionDescription)
      if (d.metadataStandard)                        setMetadataStandard(d.metadataStandard as MetadataStandard)
      if (d.royaltyPercent != null)                  setRoyaltyPercent(d.royaltyPercent)
      if (d.royaltyWallet)                           setRoyaltyWallet(d.royaltyWallet)
      if (d.twitterUrl)                              setTwitterUrl(d.twitterUrl)
      if (d.discordUrl)                              setDiscordUrl(d.discordUrl)
      if (d.websiteUrl)                              setWebsiteUrl(d.websiteUrl)
      if (d.mintPrice != null)                       setMintPrice(parseFloat(d.mintPrice) || '')
      if (d.freeMint != null)                        setFreeMint(d.freeMint)
      if (d.phases?.length)                          setPhases(d.phases as unknown as MintPhase[])
      if (d.fundReceivers?.length)                   setFundReceivers(d.fundReceivers)
      if (d.baseUri)                                 setMetadataBaseUri(d.baseUri)
    } catch { /* intentional: ignore corrupt/missing draft */ }
  }, []) // mount only — eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage (debounced 800 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const draft: CreateDraftPayload = {
          version: 1,
          step,
          collectionName,
          symbol,
          collectionDescription: description,
          metadataStandard,
          royaltyPercent,
          royaltyWallet,
          twitterUrl: twitterUrl || undefined,
          discordUrl: discordUrl || undefined,
          websiteUrl: websiteUrl || undefined,
          mintPrice: mintPrice === '' ? undefined : String(mintPrice),
          freeMint,
          phases: phases as unknown as CreateDraftPayload['phases'],
          fundReceivers,
          baseUri: metadataBaseUri ?? undefined,
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      } catch { /* intentional: localStorage may be unavailable */ }
    }, 800)
    return () => clearTimeout(t)
  }, [step, collectionName, symbol, description, metadataStandard, royaltyPercent, royaltyWallet, twitterUrl, discordUrl, websiteUrl, mintPrice, freeMint, phases, fundReceivers, metadataBaseUri])

  // Fetch real network fee when the user reaches step 4.
  // 500 bytes is a comfortable upper bound for the collection PDA account size.
  useEffect(() => {
    if (step !== 4) return
    let cancelled = false
    connection.getMinimumBalanceForRentExemption(500)
      .then(rent => { if (!cancelled) setEstimatedFee((rent + 5_000) / 1e9) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [step, connection])

  const handleStep1Next = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    nextStep()
  }, [nextStep])

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

  // Deploy flow:
  // 1. Upload PFP + banner to IPFS
  // 2. Fetch program config (programId, platformWallet) from backend
  // 3. Generate mint keypair — its pubkey seeds the collection PDA
  // 4. Build create_collection instruction with correct Borsh encoding
  // 5. sendTransaction → confirmTransaction
  // 6. POST all data + signature + addresses to backend → saved as 'ready'
  const handleDeploy = useCallback(async () => {
    setError(null)
    if (!connected || !walletAddress) {
      setError('Connect your wallet before deploying.')
      return
    }

    try {
      // 1. Upload collection PFP + banner
      setSubmitState('uploading')
      const [pfpResult, bannerResult] = await Promise.all([
        imageFile  ? uploadImageToIpfs(imageFile)  : Promise.resolve(null),
        bannerFile ? uploadImageToIpfs(bannerFile) : Promise.resolve(null),
      ])
      if (pfpResult    && !pfpResult.success)    throw new Error(pfpResult.error    ?? 'PFP upload failed')
      if (bannerResult && !bannerResult.success) throw new Error(bannerResult.error ?? 'Banner upload failed')

      // 2. Fetch program config from backend
      setSubmitState('deploying')
      const configRes = await fetch(`${API_BASE_URL}/api/solana/config`)
      if (!configRes.ok) throw new Error('Could not fetch Solana config')
      const configData = await configRes.json()
      const programId          = configData.data?.programId as string | undefined
      const platformWalletAddr = configData.data?.platformWallet as string | undefined
      if (!programId) throw new Error('Backend did not return a program ID')

      const authority      = new PublicKey(walletAddress)
      const programPubkey  = new PublicKey(programId)
      const platformWallet = new PublicKey(platformWalletAddr ?? walletAddress)

      // 3. Generate a fresh mint keypair — its pubkey seeds the collection PDA.
      //    The program stores mint.key() as the collection's permanent on-chain identifier.
      const mintKeypair = Keypair.generate()

      // Collection PDA: seeds = ["collection", mint.key()]  ← matches lib.rs line 684
      const [collectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection'), mintKeypair.publicKey.toBuffer()],
        programPubkey,
      )

      // Registry PDA: seeds = ["registry"]
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('registry')],
        programPubkey,
      )

      // Check if the registry account is already initialized
      const registryInfo = await connection.getAccountInfo(registryPda)
      const registryReady = registryInfo !== null && registryInfo.owner.equals(programPubkey)

      // 4. Build create_collection instruction
      const supply       = typeof totalSupply === 'number' && totalSupply > 0 ? totalSupply : 10_000
      const priceLamports = freeMint
        ? 0n
        : BigInt(Math.round((typeof mintPrice === 'number' ? mintPrice : 0) * 1e9))

      const validPhases = phases.filter(p => p.startDateTime)
      const firstPhase  = validPhases[0]
      const lastPhase   = validPhases.at(-1)
      const nowTs       = BigInt(Math.floor(Date.now() / 1000))

      // start_time must be >= on-chain clock — default to now+10s if no phase set or date is past
      const configuredStart = firstPhase?.startDateTime
        ? BigInt(Math.floor(new Date(firstPhase.startDateTime).getTime() / 1000))
        : null
      const startTs = configuredStart && configuredStart > nowTs ? configuredStart : nowTs + 10n

      const endTs = lastPhase?.endDateTime
        ? BigInt(Math.floor(new Date(lastPhase.endDateTime).getTime() / 1000))
        : null

      const metadataUri = metadataBaseUri ?? pfpResult?.data?.uri ?? ''

      const ixData = await buildCreateCollectionData({
        metadataUri,
        maxSupply:              BigInt(supply),
        pricePerNft:            priceLamports,
        startTime:              startTs,
        endTime:                endTs,
        metadataStandardVariant: METADATA_STANDARD_VARIANT[metadataStandard] ?? 2,
        platformFeeBps:         PLATFORM_FEE_BPS,
      })

      // Accounts must match CreateCollection<'info> order in lib.rs exactly:
      // collection, mint, registry, authority, mint_authority, creator_wallet, platform_wallet, system_program
      const instruction = new TransactionInstruction({
        programId: programPubkey,
        keys: [
          { pubkey: collectionPda,            isSigner: false, isWritable: true  }, // collection PDA
          { pubkey: mintKeypair.publicKey,    isSigner: false, isWritable: false }, // mint (seed only)
          { pubkey: registryPda,              isSigner: false, isWritable: true  }, // registry PDA
          { pubkey: authority,                isSigner: true,  isWritable: true  }, // authority / payer
          { pubkey: authority,                isSigner: false, isWritable: false }, // mint_authority
          { pubkey: authority,                isSigner: false, isWritable: true  }, // creator_wallet
          { pubkey: platformWallet,           isSigner: false, isWritable: false }, // platform_wallet
          { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false }, // system_program
        ],
        data: ixData,
      })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction()
      tx.recentBlockhash = blockhash
      tx.feePayer = authority

      // If the global registry doesn't exist yet, initialize it first (one-time platform setup).
      // In production this is done by the platform admin before launch; on a fresh localnet
      // the first creator to deploy triggers it automatically.
      if (!registryReady) {
        const initDisc = await anchorDiscriminator('initialize_registry')
        tx.add(new TransactionInstruction({
          programId: programPubkey,
          keys: [
            { pubkey: registryPda,            isSigner: false, isWritable: true  },
            { pubkey: authority,              isSigner: true,  isWritable: true  },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: initDisc, // initialize_registry takes no arguments
        }))
      }

      tx.add(instruction)

      // 5. Wallet signs + submits
      setSubmitState('signing')
      const signature = await sendTransaction(tx, connection)

      // 6. Wait for confirmation
      setSubmitState('confirming')
      await pollForConfirmation(connection, signature, blockhash, lastValidBlockHeight)

      // 7. Save to backend DB
      const saveResult = await collectionsApi.deploy({
        name:             collectionName.trim(),
        symbol:           (symbol.trim() || collectionName.trim().slice(0, 4)).toUpperCase(),
        description:      description.trim(),
        creatorAddress:   walletAddress,
        metadataStandard,
        uri:              metadataUri || undefined,
        totalSupply:      supply,
        mintPrice:        freeMint ? 0 : (typeof mintPrice === 'number' ? mintPrice : undefined),
        freeMint,
        royaltyPercent,
        royaltyWallet:    royaltyWallet.trim() || walletAddress,
        phases:           validPhases,
        fundReceivers:    fundReceivers.filter(r => r.address.trim()),
        twitterUrl:       twitterUrl.trim() || undefined,
        discordUrl:       discordUrl.trim() || undefined,
        websiteUrl:       websiteUrl.trim() || undefined,
        collectionAddress: collectionPda.toBase58(),
        txSignature:      signature,
        ...(pfpResult?.data    ? { collectionImage: pfpResult.data.uri }    : {}),
        ...(bannerResult?.data ? { bannerImage:     bannerResult.data.uri } : {}),
      })

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error ?? 'Failed to save collection')
      }

      setCreatedCollection({ id: saveResult.data.collectionId, slug: saveResult.data.slug } as NFTCollection)
      localStorage.removeItem(DRAFT_STORAGE_KEY)
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
    twitterUrl, discordUrl, websiteUrl,
    phases, fundReceivers, sendTransaction, connection,
  ])

  const isDeploying = ['uploading', 'deploying', 'signing', 'confirming'].includes(submitState)

  return {
    step, nextStep, prevStep,
    collectionName,   setCollectionName,
    symbol,           setSymbol,
    description,      setDescription,
    imageFile,        setImageFile,
    bannerFile,       setBannerFile,
    metadataStandard, setMetadataStandard,
    royaltyPercent,   setRoyaltyPercent,
    royaltyWallet,    setRoyaltyWallet,
    twitterUrl,       setTwitterUrl,
    discordUrl,       setDiscordUrl,
    websiteUrl,       setWebsiteUrl,
    handleStep1Next,
    imageFiles,     setImageFiles,
    metadataFiles,  setMetadataFiles,
    imagesBaseUri,  metadataBaseUri,
    step2State,     step2Error,
    handleMediaUpload,
    totalSupply,
    mintPrice,   setMintPrice,
    freeMint,    setFreeMint,
    phases,      setPhases,
    fundReceivers, updateFundReceiver, addFundReceiver, removeFundReceiver,
    distributeFundReceiversEvenly, autoFillFundReceiversRemainder,
    fundReceiverTotal, fundReceiverError,
    submitState, error, createdCollection,
    estimatedFee,
    handleDeploy,
    isConnected:  connected,
    walletAddress,
    isDeploying,
    isSuccess: submitState === 'success',
  }
}
