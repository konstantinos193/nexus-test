'use client'

/* eslint-disable max-lines-per-function, max-statements, complexity */

import { useState, useMemo, useCallback, useEffect } from 'react'
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
  const ab = new ArrayBuffer(8); new DataView(ab).setBigUint64(0, v, true); return Buffer.from(ab)
}
function encodeI64LE(v: bigint): Buffer {
  const ab = new ArrayBuffer(8); new DataView(ab).setBigInt64(0, v, true); return Buffer.from(ab)
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
// Signature: create_collection(collection_name: String, metadata_uri: String, config: CollectionConfig, platform_fee_bps: u16)
async function buildCreateCollectionData(params: {
  collectionName: string
  metadataUri: string
  maxSupply: bigint
  pricePerNft: bigint
  startTime: bigint
  endTime: bigint | null
  metadataStandardVariant: number
  platformFeeBps: number
}): Promise<Buffer> {
  const disc = await anchorDiscriminator('create_collection')

  const nameBuf = encodeBorshString(params.collectionName.slice(0, 32))
  const uriBuf = encodeBorshString(params.metadataUri.slice(0, 128)) // metadata_uri (max 128 bytes on-chain)

  const feeBuf = Buffer.alloc(2)
  feeBuf.writeUInt16LE(params.platformFeeBps, 0)

  return Buffer.concat([
    disc,
    nameBuf,
    uriBuf,
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

  // ── Synchronous draft initialization ──────────────────────────────────────────
  // Safe to read localStorage here — this component only mounts client-side
  // (it is behind a walletReady guard that stays false during SSR).
  // Reading once via useMemo avoids repeated JSON.parse on every render.
  const initDraft = useMemo<(CreateDraftPayload & { imageb64?: string; bannerb64?: string }) | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      return raw ? JSON.parse(raw) as CreateDraftPayload & { imageb64?: string; bannerb64?: string } : null
    } catch { return null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Step navigation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    const s = initDraft?.step
    return (s && [1, 2, 3, 4].includes(s) ? s : 1) as 1 | 2 | 3 | 4
  })
  const nextStep = useCallback(() => setStep(s => (Math.min(4, s + 1) as 1 | 2 | 3 | 4)), [])
  const prevStep = useCallback(() => setStep(s => (Math.max(1, s - 1) as 1 | 2 | 3 | 4)), [])

  // Step 1 — text fields
  const [collectionName,   setCollectionName]   = useState(() => initDraft?.collectionName ?? '')
  const [symbol,           setSymbol]           = useState(() => initDraft?.symbol ?? '')
  const [description,      setDescription]      = useState(() => initDraft?.collectionDescription ?? '')
  const [metadataStandard, setMetadataStandard] = useState<MetadataStandard>(() =>
    (initDraft?.metadataStandard as MetadataStandard | undefined) ?? 'Core'
  )
  const [royaltyPercent,   setRoyaltyPercent]   = useState<number>(() => initDraft?.royaltyPercent ?? 5)
  const [royaltyWallet,    setRoyaltyWallet]    = useState(() => initDraft?.royaltyWallet ?? '')
  const [twitterUrl,       setTwitterUrl]       = useState(() => initDraft?.twitterUrl ?? '')
  const [discordUrl,       setDiscordUrl]       = useState(() => initDraft?.discordUrl ?? '')
  const [websiteUrl,       setWebsiteUrl]       = useState(() => initDraft?.websiteUrl ?? '')

  // Step 1 — image files (synchronous atob decode from base64 draft)
  const [imageFile, setImageFile] = useState<File | null>(() => {
    if (!initDraft?.imageb64) return null
    try {
      const [meta, data] = initDraft.imageb64.split(',')
      const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png'
      const bstr = atob(data)
      const u8 = new Uint8Array(bstr.length)
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
      return new File([u8], 'pfp', { type: mime })
    } catch { return null }
  })
  const [bannerFile, setBannerFile] = useState<File | null>(() => {
    if (!initDraft?.bannerb64) return null
    try {
      const [meta, data] = initDraft.bannerb64.split(',')
      const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png'
      const bstr = atob(data)
      const u8 = new Uint8Array(bstr.length)
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
      return new File([u8], 'banner', { type: mime })
    } catch { return null }
  })

  // Step 2
  const [imageFiles,      setImageFiles]      = useState<File[]>([])
  const [metadataFiles,   setMetadataFiles]   = useState<File[]>([])
  const [imagesBaseUri,   setImagesBaseUri]   = useState<string | null>(() => initDraft?.imagesBaseUri ?? null)
  const [metadataBaseUri, setMetadataBaseUri] = useState<string | null>(() => initDraft?.baseUri ?? null)
  // step2State initializes to 'done' if any upload URI was persisted (upload completed before refresh)
  const [step2State,      setStep2State]      = useState<Step2State>(() => (initDraft?.imagesBaseUri || initDraft?.baseUri) ? 'done' : 'idle')
  const [step2Error,      setStep2Error]      = useState<string | null>(null)
  const [uploadProgress,  setUploadProgress]  = useState(0)

  const imageCount = imageFiles.length || initDraft?.imageCount || 0
  const metadataCount = metadataFiles.length || initDraft?.metadataCount || 0

  // Step 3
  // totalSupply: calculate from current files, or restore from draft/IPFS URIs if files not persisted
  // If files were uploaded to IPFS (URIs exist) but not in memory, use the persisted count or a safe default
  const totalSupply = imageCount || metadataCount ||
    (initDraft?.totalSupply ? parseInt(initDraft.totalSupply, 10) : 0) ||
    (metadataBaseUri || imagesBaseUri ? 1000 : 0)

  // Debug: log totalSupply calculation
  if (step === 4) {
    console.log('[Step4] metadataBaseUri:', metadataBaseUri, 'imagesBaseUri:', imagesBaseUri)
    console.log('[Step4] imageFiles.length:', imageFiles.length, 'metadataFiles.length:', metadataFiles.length)
    console.log('[Step4] initDraft?.totalSupply:', initDraft?.totalSupply)
    console.log('[Step4] calculated totalSupply:', totalSupply)
  }
  const [mintPrice, setMintPrice] = useState<number | ''>(() => {
    if (initDraft?.mintPrice != null) {
      const p = parseFloat(initDraft.mintPrice)
      return isNaN(p) ? '' : p
    }
    return ''
  })
  const [freeMint, setFreeMint] = useState<boolean>(() => initDraft?.freeMint ?? false)
  const [phases, setPhases] = useState<MintPhase[]>(() =>
    initDraft?.phases?.length
      ? initDraft.phases as unknown as MintPhase[]
      : [{ name: 'Public Sale', phaseType: 'public', startDateTime: '' }]
  )
  const [fundReceivers, setFundReceivers] = useState<ShareAddressRow[]>(() =>
    initDraft?.fundReceivers?.length
      ? initDraft.fundReceivers
      : [{ share: '100', address: '' }]
  )

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

  // Helper to convert File to Base64 data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  // Auto-save draft to localStorage (debounced 800ms) — text fields only.
  // Reads the current draft first to preserve imageb64/bannerb64 written by the
  // concurrent image save effect. Without this read-merge-write pattern, typing
  // any character would overwrite and destroy the image data.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        // Preserve any image blobs that the immediate image-save effect has written.
        // The two effects can interleave, so we must read-modify-write rather than replace.
        let imageData: { imageb64?: string; bannerb64?: string } = {}
        try {
          const existing = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}') as Record<string, unknown>
          if (typeof existing.imageb64 === 'string')   imageData.imageb64   = existing.imageb64
          if (typeof existing.bannerb64 === 'string')  imageData.bannerb64  = existing.bannerb64
        } catch { /* corrupt existing draft — start fresh */ }

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
          imagesBaseUri: imagesBaseUri ?? undefined,
          imageCount: step2State === 'done' ? imageFiles.length : undefined,
          metadataCount: step2State === 'done' ? metadataFiles.length : undefined,
          totalSupply: typeof totalSupply === 'number' && totalSupply > 0 ? String(totalSupply) : undefined,
        }
        // Spread order: imageData first so draft's known text fields win on collision.
        // imageb64/bannerb64 survive because `draft` never defines those keys.
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...imageData, ...draft }))
      } catch { /* localStorage unavailable */ }
    }, 800)
    return () => clearTimeout(t)
  }, [step, collectionName, symbol, description, metadataStandard, royaltyPercent, royaltyWallet, twitterUrl, discordUrl, websiteUrl, mintPrice, freeMint, phases, fundReceivers, metadataBaseUri, imagesBaseUri, totalSupply, step2State, imageFiles.length, metadataFiles.length])

  // Auto-save step 1 image files (imageFile, bannerFile) when they change — no debounce, save immediately
  useEffect(() => {
    (async () => {
      try {
        console.log('[Draft] Saving Step 1 images:', !!imageFile, !!bannerFile)
        const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}') as Record<string, any>
        if (imageFile) {
          draft.imageb64 = await readFileAsDataURL(imageFile)
          console.log('[Draft] PFP saved, size:', JSON.stringify(draft.imageb64).length)
        } else {
          delete draft.imageb64
        }
        if (bannerFile) {
          draft.bannerb64 = await readFileAsDataURL(bannerFile)
          console.log('[Draft] Banner saved, size:', JSON.stringify(draft.bannerb64).length)
        } else {
          delete draft.bannerb64
        }
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
        console.log('[Draft] ✓ Step 1 images saved')
      } catch (e) { console.error('[Draft] Failed to save Step 1 images:', e) }
    })()
  }, [imageFile, bannerFile])

  // Note: Step 2 files (imageFiles, metadataFiles) are uploaded to IPFS on-demand and NOT persisted locally
  // Only the IPFS URIs (imagesBaseUri, metadataBaseUri) are persisted via the main draft effect above

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
    setUploadProgress(0)
    setStep2State('uploading')
    try {
      let imgPct = 0, metaPct = 0
      // Weight each folder's 0–100 progress by its share of total bytes, so the
      // large images folder dominates the bar and the tiny metadata folder can't
      // jump it to ~50% on its own. Sizes come from File.size (no upload needed).
      const imgBytes   = imageFiles.reduce((sum, f) => sum + f.size, 0)
      const metaBytes  = metadataFiles.reduce((sum, f) => sum + f.size, 0)
      const totalBytes = imgBytes + metaBytes || 1
      const update = () =>
        setUploadProgress(Math.round((imgPct * imgBytes + metaPct * metaBytes) / totalBytes))
      const [imgResult, metaResult] = await Promise.all([
        imageFiles.length
          ? ipfsApi.uploadDirectoryWithProgress(imageFiles,    p => { imgPct = p; update() })
          : Promise.resolve(null),
        metadataFiles.length
          ? ipfsApi.uploadDirectoryWithProgress(metadataFiles, p => { metaPct = p; update() })
          : Promise.resolve(null),
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
      const mplCoreProgramId   = configData.data?.mplCoreProgramId as string | undefined
      if (!programId) throw new Error('Backend did not return a program ID')
      if (!mplCoreProgramId) throw new Error('Backend did not return MPL Core program ID')

      const authority      = new PublicKey(walletAddress)
      const programPubkey  = new PublicKey(programId)
      const platformWallet = new PublicKey(platformWalletAddr ?? walletAddress)
      const mplCoreProgram = new PublicKey(mplCoreProgramId)

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
      console.log('[Deploy] totalSupply:', totalSupply, 'type:', typeof totalSupply, 'supply:', supply)
      const priceLamports = freeMint
        ? 0n
        : BigInt(Math.round((typeof mintPrice === 'number' ? mintPrice : 0) * 1e9))

      const validPhases = phases
        .filter(p => p.startDateTime)
        .map(p => ({
          ...p,
          startDateTime: new Date(p.startDateTime).toISOString(),
          ...(p.endDateTime ? { endDateTime: new Date(p.endDateTime).toISOString() } : {}),
        }))
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

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority'), mintKeypair.publicKey.toBuffer()],
        programPubkey,
      )

      const ixData = await buildCreateCollectionData({
        collectionName:         collectionName.trim().slice(0, 32) || 'Collection',
        metadataUri,
        maxSupply:              BigInt(supply),
        pricePerNft:            priceLamports,
        startTime:              startTs,
        endTime:                endTs,
        metadataStandardVariant: METADATA_STANDARD_VARIANT[metadataStandard] ?? 2,
        platformFeeBps:         PLATFORM_FEE_BPS,
      })
      console.log('[Deploy] ixData (hex):', ixData.toString('hex'))
      console.log('[Deploy] ixData length:', ixData.length)

      // NOTE: Do NOT pre-create an SPL mint at mintKeypair. create_collection CPIs into MPL Core
      // (CreateCollectionV2), which *creates* the collection account at this address itself — it
      // must be an empty/system-owned account. Pre-allocating it as an SPL mint makes the MPL Core
      // CPI fail. The keypair only needs to sign the tx (see tx.partialSign(mintKeypair) below).

      // Accounts must match CreateCollection<'info> order in lib.rs exactly:
      // collection, mint, registry, authority, mint_authority, creator_wallet, platform_wallet, mpl_core_program, system_program
      const instruction = new TransactionInstruction({
        programId: programPubkey,
        keys: [
          { pubkey: collectionPda,            isSigner: false, isWritable: true  },
          { pubkey: mintKeypair.publicKey,    isSigner: true,  isWritable: true  }, // Core collection + PDA seed
          { pubkey: registryPda,              isSigner: false, isWritable: true  },
          { pubkey: authority,                isSigner: true,  isWritable: true  },
          { pubkey: mintAuthorityPda,         isSigner: false, isWritable: false },
          { pubkey: authority,                isSigner: false, isWritable: true  },
          { pubkey: platformWallet,           isSigner: false, isWritable: false },
          { pubkey: mplCoreProgram,           isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
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

      // If fund receivers are set, include split_config init + update in the same tx
      const cleanReceivers = fundReceivers.filter(r => r.address.trim())
      if (cleanReceivers.length > 0) {
        const [splitConfigPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('split'), collectionPda.toBuffer()],
          programPubkey,
        )

        const initDisc = await anchorDiscriminator('init_mint_split_config')
        const initIx = new TransactionInstruction({
          programId: programPubkey,
          keys: [
            { pubkey: collectionPda,           isSigner: false, isWritable: true  },
            { pubkey: authority,               isSigner: true,  isWritable: true  },
            { pubkey: splitConfigPda,          isSigner: false, isWritable: true  },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: initDisc,
        })

        const updateDisc    = await anchorDiscriminator('update_mint_fund_splits')
        const recipientsBuf = Buffer.alloc(320)
        const sharesBuf     = Buffer.alloc(10)
        cleanReceivers.forEach((r, i) => {
          new PublicKey(r.address.trim()).toBuffer().copy(recipientsBuf, i * 32)
          sharesBuf[i] = Math.round(Number(r.share))
        })
        const updateIx = new TransactionInstruction({
          programId: programPubkey,
          keys: [
            { pubkey: collectionPda,  isSigner: false, isWritable: true },
            { pubkey: authority,      isSigner: true,  isWritable: true },
            { pubkey: splitConfigPda, isSigner: false, isWritable: true },
          ],
          data: Buffer.concat([updateDisc, recipientsBuf, sharesBuf, Buffer.from([cleanReceivers.length])]),
        })

        tx.add(initIx, updateIx)
      }

      // 5. Wallet signs + submits
      setSubmitState('signing')
      tx.partialSign(mintKeypair)
      const signature = await sendTransaction(tx, connection)

      // 6. Wait for confirmation
      setSubmitState('confirming')
      await pollForConfirmation(connection, signature, blockhash, lastValidBlockHeight)

      // 7. Save to backend DB
      const resolvedMintPrice = typeof mintPrice === 'number' ? mintPrice : undefined
      const saveResult = await collectionsApi.deploy({
        name:             collectionName.trim(),
        symbol:           (symbol.trim() || collectionName.trim().slice(0, 4)).toUpperCase(),
        description:      description.trim(),
        creatorAddress:   walletAddress,
        metadataStandard,
        uri:              metadataUri || undefined,
        totalSupply:      supply,
        mintPrice:        freeMint ? 0 : resolvedMintPrice,
        freeMint,
        royaltyPercent,
        royaltyWallet:    royaltyWallet.trim() || walletAddress,
        phases:           validPhases,
        fundReceivers:    fundReceivers.filter(r => r.address.trim()),
        twitterUrl:       twitterUrl.trim() || undefined,
        discordUrl:       discordUrl.trim() || undefined,
        websiteUrl:       websiteUrl.trim() || undefined,
        // Store the mint seed pubkey — the collection PDA is derived from it on-chain.
        collectionAddress: mintKeypair.publicKey.toBase58(),
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
    imageCount,     metadataCount,
    imagesBaseUri,  metadataBaseUri,
    step2State,     step2Error,   uploadProgress,
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
