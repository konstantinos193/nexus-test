'use client'

/* eslint-disable max-lines, max-lines-per-function, max-statements, complexity */

/**
 * EditCollectionClient – Four-step editor for an existing collection.
 *
 * Step 1 – Collection Info:  name, images, royalty, social links  (DB only)
 * Step 2 – Mint Phases:      per-phase config with templates       (DB only)
 * Step 3 – On-Chain Config:  price, supply, wallet cap             (wallet tx + DB sync)
 * Step 4 – Minting Status:   pause / resume                        (wallet tx)
 *
 * Outer guard: checks WalletReadyContext before rendering the inner component
 * so useWallet() is never called before the provider is mounted.
 */

import { useState, useEffect, useContext, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  Layers, Save, Zap, Pause, Play, Loader2, AlertCircle, CheckCircle,
  Plus, CalendarRange, ArrowRight, ArrowLeft, Power,
} from 'lucide-react'

import { collectionsApi, uploadImageToIpfs } from '@/lib/api/client'
import { getChainConfig } from '@/lib/solana/chain-config'
import { pollForConfirmation } from '@/lib/solana/confirm'
import { resolveCollectionPda } from '@/lib/solana/collection-pda'
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'
import Button from '@/components/ui/Button'
import type { NFTCollection } from '@/types'
import type { MintPhase } from '@/hooks/useCreateCollectionForm'
import {
  PhaseCard,
  PHASE_TEMPLATES,
  detectActiveTemplate,
} from '@/components/features/create/MintPhasesForm'

// ── IPFS gateway ───────────────────────────────────────────────────────────────
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? 'https://ipfs-gateway.nexus-web3.com/ipfs/'

function resolveUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('ipfs://')) return `${IPFS_GATEWAY}${url.slice(7)}`
  return url
}

// ── Borsh helpers (mirrors useCreateCollectionForm.ts) ─────────────────────────

async function anchorDiscriminator(name: string): Promise<Buffer> {
  const preimage = new TextEncoder().encode(`global:${name}`)
  const hash = await crypto.subtle.digest('SHA-256', preimage)
  return Buffer.from(new Uint8Array(hash).slice(0, 8))
}

function encodeU64LE(v: bigint): Buffer { const ab = new ArrayBuffer(8); new DataView(ab).setBigUint64(0, v, true); return Buffer.from(ab) }
function encodeI64LE(v: bigint): Buffer { const ab = new ArrayBuffer(8); new DataView(ab).setBigInt64(0, v, true); return Buffer.from(ab) }

function encodeOptionI64(v: bigint | null): Buffer {
  return v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), encodeI64LE(v)])
}

async function buildUpdateConfigData(p: {
  maxSupply: bigint
  pricePerNft: bigint
  startTime: bigint
  endTime: bigint | null
  mintLimitPerWallet: number | null
  metadataStandardVariant: number
}): Promise<Buffer> {
  const disc = await anchorDiscriminator('update_config')
  const limitBuf = p.mintLimitPerWallet != null
    ? Buffer.concat([Buffer.from([0x01]), Buffer.from([p.mintLimitPerWallet])])
    : Buffer.from([0x00])
  return Buffer.concat([
    disc,
    encodeU64LE(p.maxSupply),
    encodeU64LE(p.pricePerNft),
    encodeI64LE(p.startTime),
    encodeOptionI64(p.endTime),
    limitBuf,
    Buffer.from([p.metadataStandardVariant]),
    Buffer.from([0x00]),
    Buffer.from([0x00]),
  ])
}

async function buildPauseData(pausing: boolean): Promise<Buffer> {
  return anchorDiscriminator(pausing ? 'pause' : 'resume')
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface OnChainData {
  maxSupply:          string
  price:              string
  startTime:          string
  endTime:            string
  mintLimitPerWallet: number
  metadataStandard:   number
  flags:              number
}

type SaveState = 'idle' | 'saving' | 'success' | 'error'

// ── Step config ────────────────────────────────────────────────────────────────

const EDIT_STEPS = [
  { id: 1, label: 'Collection Info',  hint: 'Name, images & royalties',     Icon: Layers        },
  { id: 2, label: 'Mint Phases',      hint: 'Pricing, timing & access',     Icon: CalendarRange },
  { id: 3, label: 'On-Chain Config',  hint: 'Price, supply & wallet cap',   Icon: Zap           },
  { id: 4, label: 'Minting Status',   hint: 'Pause or resume minting',      Icon: Power         },
]

// ── VerticalSteps ──────────────────────────────────────────────────────────────

function VerticalSteps({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick: (id: number) => void
}) {
  return (
    <div>
      {EDIT_STEPS.map((s, i) => {
        const isActive = s.id === currentStep
        const isDone   = s.id < currentStep
        const isLocked = s.id > currentStep

        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onStepClick(s.id)}
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-colors cursor-pointer',
                  isDone   ? 'bg-dark-accent-success/15 border-dark-accent-success/50 text-dark-accent-success hover:bg-dark-accent-success/25' : '',
                  isActive ? 'bg-dark-accent-primary/15 border-dark-accent-primary   text-dark-accent-primary' : '',
                  isLocked ? 'bg-dark-bg-secondary      border-dark-border-primary   text-dark-text-tertiary  hover:border-dark-border-accent' : '',
                ].join(' ')}
              >
                {isDone ? '✓' : s.id}
              </button>
              {i < EDIT_STEPS.length - 1 && (
                <div className={[
                  'w-px flex-1 my-1 min-h-8',
                  isDone ? 'bg-dark-accent-success/25' : 'bg-dark-border-primary',
                ].join(' ')} />
              )}
            </div>
            <div className={i < EDIT_STEPS.length - 1 ? 'pb-6 pt-0.5' : 'pt-0.5'}>
              <button
                type="button"
                onClick={() => onStepClick(s.id)}
                className={[
                  'text-sm font-medium leading-none text-left transition-colors',
                  isActive ? 'text-dark-text-primary'   : '',
                  isLocked ? 'text-dark-text-tertiary hover:text-dark-text-secondary' : '',
                  isDone   ? 'text-dark-text-secondary hover:text-dark-text-primary'  : '',
                ].join(' ')}
              >
                {s.label}
              </button>
              {isActive && (
                <p className="text-xs text-dark-text-tertiary mt-1">{s.hint}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Status badge helper ────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'minting':   return 'bg-green-500/15 text-green-400 border border-green-500/30'
    case 'paused':    return 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    case 'completed': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
    case 'ready':
    case 'preparing': return 'bg-dark-accent-primary/15 text-dark-accent-primary border border-dark-accent-primary/30'
    default:          return 'bg-dark-bg-tertiary text-dark-text-tertiary border border-dark-border-primary'
  }
}

// ── Outer Guard ────────────────────────────────────────────────────────────────

export default function EditCollectionClient() {
  const walletReady = useContext(WalletReadyContext)

  if (!walletReady) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
        <p className="text-dark-text-secondary">Connect your wallet to edit collections.</p>
      </div>
    )
  }

  return <EditCollectionInner />
}

// ── Inner Component ────────────────────────────────────────────────────────────

function EditCollectionInner() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const walletAddress = publicKey?.toBase58() ?? null

  // ── Navigation ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Data ──────────────────────────────────────────────────────────────────
  const [collection, setCollection] = useState<NFTCollection | null>(null)
  const [onChain,    setOnChain]    = useState<OnChainData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)

  // ── Step 1: Collection Info ────────────────────────────────────────────────
  const [name,          setName]          = useState('')
  const [description,   setDescription]   = useState('')
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [twitterUrl,    setTwitterUrl]    = useState('')
  const [discordUrl,    setDiscordUrl]    = useState('')
  const [websiteUrl,    setWebsiteUrl]    = useState('')
  const [royaltyPct,    setRoyaltyPct]    = useState(0)
  const [infoState,     setInfoState]     = useState<SaveState>('idle')
  const [infoMsg,       setInfoMsg]       = useState('')

  // ── Step 2: Mint Phases ───────────────────────────────────────────────────
  const [phases,       setPhases]       = useState<MintPhase[]>([])
  const [phasesState,  setPhasesState]  = useState<SaveState>('idle')
  const [phasesMsg,    setPhasesMsg]    = useState('')

  // ── Step 3: On-Chain Config ───────────────────────────────────────────────
  const [mintPrice,    setMintPrice]    = useState<number | ''>('')
  const [freeMint,     setFreeMint]     = useState(false)
  const [maxSupply,    setMaxSupply]    = useState<number | ''>('')
  const [maxPerWallet, setMaxPerWallet] = useState<number | ''>('')
  const [mintState,    setMintState]    = useState<SaveState>('idle')
  const [mintMsg,      setMintMsg]      = useState('')

  // ── Step 4: Pause / Resume ────────────────────────────────────────────────
  const [isPaused,   setIsPaused]   = useState(false)
  const [pauseState, setPauseState] = useState<SaveState>('idle')

  // ── Data Loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    setLoading(true)

    collectionsApi.getById(id).then(async (colRes) => {
      if (!colRes.success || !colRes.data) {
        setLoadError('Collection not found')
        return
      }
      const col = colRes.data
      setCollection(col)

      // Step 1 fields
      setName(col.name)
      setDescription(col.description)
      // Resolve ipfs:// URIs to gateway URLs for display
      setImagePreview(resolveUrl(col.imageUrl))
      setBannerPreview(resolveUrl(col.bannerUrl))
      setTwitterUrl(col.twitterUrl ?? '')
      setDiscordUrl(col.discordUrl ?? '')
      setWebsiteUrl(col.websiteUrl ?? '')
      setRoyaltyPct((col.royaltyBasisPoints ?? 0) / 100)

      // Step 2 fields
      const loadedPhases = col.phases && col.phases.length > 0
        ? col.phases
        : [{ name: 'Public Sale', phaseType: 'public' as const, startDateTime: '' }]
      setPhases(loadedPhases)

      // Step 3 fields
      setMintPrice(col.price ?? '')
      setFreeMint((col.price ?? 0) === 0)
      setMaxSupply(col.totalSupply || '')

      // Step 4 fields
      setIsPaused(col.status === 'paused')

      // Fetch on-chain data
      if (col.mintAddress) {
        const chainRes = await collectionsApi.getOnChain(col.mintAddress)
        if (chainRes.success && chainRes.data) {
          const d = chainRes.data as Record<string, unknown>
          setOnChain({
            maxSupply:           String(d.maxSupply || ''),
            price:               String(d.price || ''),
            startTime:           String(d.startTime || ''),
            endTime:             String(d.endTime || ''),
            mintLimitPerWallet:  Number(d.mintLimitPerWallet || 0),
            metadataStandard:    Number(d.metadataStandard || 0),
            flags:               Number(d.flags || 0),
          })
          if (Number(d.mintLimitPerWallet || 0) > 0) {
            setMaxPerWallet(Number(d.mintLimitPerWallet))
          }
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  // ── Step 1: Save Info ──────────────────────────────────────────────────────

  const handleSaveInfo = useCallback(async () => {
    if (!collection || !walletAddress) return
    setInfoState('saving')
    setInfoMsg('')
    try {
      let imageUrl  = collection.imageUrl
      let bannerUrl = collection.bannerUrl

      if (imageFile) {
        const r = await uploadImageToIpfs(imageFile)
        if (r.success && r.data) imageUrl = r.data.uri
      }
      if (bannerFile) {
        const r = await uploadImageToIpfs(bannerFile)
        if (r.success && r.data) bannerUrl = r.data.uri
      }

      const res = await collectionsApi.update(collection?.id ?? id, {
        creatorAddress: walletAddress,
        name,
        description,
        imageUrl,
        bannerUrl,
        twitterUrl:     twitterUrl || undefined,
        discordUrl:     discordUrl || undefined,
        websiteUrl:     websiteUrl || undefined,
        royaltyPercent: royaltyPct,
      })

      if (!res.success) throw new Error(res.error ?? 'Update failed')
      setCollection(res.data!)
      setInfoState('success')
      setInfoMsg('Collection info saved.')
    } catch (e) {
      setInfoState('error')
      setInfoMsg(e instanceof Error ? e.message : 'Failed to save')
    }
  }, [collection, walletAddress, id, name, description, imageFile, bannerFile,
      twitterUrl, discordUrl, websiteUrl, royaltyPct])

  // ── Step 2: Save Phases (DB only) ─────────────────────────────────────────

  const handleSavePhases = useCallback(async () => {
    if (!collection || !walletAddress) return
    setPhasesState('saving')
    setPhasesMsg('')
    try {
      const res = await collectionsApi.update(collection?.id ?? id, {
        creatorAddress: walletAddress,
        phases,
      })
      if (!res.success) throw new Error(res.error ?? 'Update failed')
      setCollection(res.data!)
      setPhasesState('success')
      setPhasesMsg('Phases saved.')
    } catch (e) {
      setPhasesState('error')
      setPhasesMsg(e instanceof Error ? e.message : 'Failed to save')
    }
  }, [collection, walletAddress, id, phases])

  // ── Step 3: Update On-Chain ────────────────────────────────────────────────

  const handleUpdateOnChain = useCallback(async () => {
    if (!collection?.mintAddress || !walletAddress || !publicKey) return
    if (!onChain) { setMintMsg('On-chain data not loaded yet — try again.'); return }

    setMintState('saving')
    setMintMsg('')

    try {
      const cfg = await getChainConfig()
      const programPubkey = new PublicKey(cfg.programId)

      const collectionPda = await resolveCollectionPda(
        connection,
        collection.mintAddress,
        programPubkey,
      )

      const priceLamports = freeMint
        ? 0n
        : BigInt(Math.round((typeof mintPrice === 'number' ? mintPrice : 0) * 1e9))

      const nowTs = BigInt(Math.floor(Date.now() / 1000))
      const firstPhaseStart = phases[0]?.startDateTime
      const lastPhaseEnd    = phases.at(-1)?.endDateTime

      const startTs = firstPhaseStart
        ? BigInt(Math.floor(new Date(firstPhaseStart).getTime() / 1000))
        : nowTs + 10n

      const endTs = lastPhaseEnd
        ? BigInt(Math.floor(new Date(lastPhaseEnd).getTime() / 1000))
        : null

      const supply = typeof maxSupply === 'number' && maxSupply > 0
        ? BigInt(maxSupply)
        : BigInt(onChain.maxSupply)

      const limit = typeof maxPerWallet === 'number' && maxPerWallet > 0
        ? maxPerWallet
        : null

      const ixData = await buildUpdateConfigData({
        maxSupply:               supply,
        pricePerNft:             priceLamports,
        startTime:               startTs,
        endTime:                 endTs,
        mintLimitPerWallet:      limit,
        metadataStandardVariant: onChain.metadataStandard,
      })

      const ix = new TransactionInstruction({
        programId: programPubkey,
        keys: [
          { pubkey: collectionPda, isSigner: false, isWritable: true },
          { pubkey: publicKey,     isSigner: true,  isWritable: false },
        ],
        data: ixData,
      })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      tx.add(ix)

      const sig = await sendTransaction(tx, connection)
      await pollForConfirmation(connection, sig, blockhash, lastValidBlockHeight)

      // Sync price + timing + phases back to DB
      const resolvedPrice = typeof mintPrice === 'number' ? mintPrice : undefined
      await collectionsApi.update(collection?.id ?? id, {
        creatorAddress: walletAddress,
        price:     freeMint ? 0 : resolvedPrice,
        mintStart: firstPhaseStart ? new Date(firstPhaseStart).toISOString() : undefined,
        endDate:   lastPhaseEnd    ? new Date(lastPhaseEnd).toISOString()    : undefined,
        phases,
      })

      setMintState('success')
      setMintMsg(`On-chain config updated! Tx: ${sig.slice(0, 16)}…`)
    } catch (e) {
      setMintState('error')
      setMintMsg(e instanceof Error ? e.message : 'Transaction failed')
    }
  }, [collection, walletAddress, publicKey, onChain, freeMint, mintPrice,
      maxSupply, maxPerWallet, phases, id, connection, sendTransaction])

  // ── Step 4: Pause / Resume ─────────────────────────────────────────────────

  const handleTogglePause = useCallback(async () => {
    if (!collection?.mintAddress || !walletAddress || !publicKey) return
    setPauseState('saving')

    try {
      const cfg = await getChainConfig()
      const programPubkey = new PublicKey(cfg.programId)

      const collectionPda = await resolveCollectionPda(
        connection,
        collection.mintAddress,
        programPubkey,
      )

      const ixData = await buildPauseData(!isPaused)
      const ix = new TransactionInstruction({
        programId: programPubkey,
        keys: [
          { pubkey: collectionPda, isSigner: false, isWritable: true },
          { pubkey: publicKey,     isSigner: true,  isWritable: false },
        ],
        data: ixData,
      })

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      tx.add(ix)

      const sig = await sendTransaction(tx, connection)
      await pollForConfirmation(connection, sig, blockhash, lastValidBlockHeight)
      setIsPaused(p => !p)
      setPauseState('idle')
    } catch {
      setPauseState('error')
    }
  }, [collection, walletAddress, publicKey, isPaused, connection, sendTransaction])

  // ── Image picker ───────────────────────────────────────────────────────────

  function pickImage(e: React.ChangeEvent<HTMLInputElement>, type: 'pfp' | 'banner') {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'pfp') { setImageFile(file); setImagePreview(url) }
    else                { setBannerFile(file); setBannerPreview(url) }
  }

  // ── Phase helpers ──────────────────────────────────────────────────────────

  function updatePhase(i: number, p: MintPhase) {
    const next = [...phases]; next[i] = p; setPhases(next)
  }

  function removePhase(i: number) {
    setPhases(phases.filter((_, idx) => idx !== i))
  }

  function addPhase() {
    setPhases([...phases, { name: `Phase ${phases.length + 1}`, phaseType: 'public', startDateTime: '' }])
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-dark-accent-primary" />
      </div>
    )
  }

  if (loadError || !collection) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex flex-col items-center justify-center gap-4">
        <p className="text-dark-text-secondary">{loadError ?? 'Collection not found'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const isOwner = collection.creatorAddress === walletAddress
  const activeTemplate = detectActiveTemplate(phases)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-bg-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Sticky Sidebar ──────────────────────────────────────────────── */}
          <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24 lg:self-start">

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1.5 text-sm text-dark-text-tertiary hover:text-dark-text-secondary transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <div className="mb-7">
              <h1 className="text-xl font-bold text-dark-text-primary leading-tight tracking-tight">
                {name || collection.name}
              </h1>
              <p className="text-sm text-dark-text-tertiary mt-1">Edit Collection</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(collection.status)}`}>
                {collection.status}
              </span>
            </div>

            <div className="mb-7">
              <VerticalSteps currentStep={step} onStepClick={setStep} />
            </div>

            <div className="border-t border-dark-border-primary mb-6" />

            <div>
              <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider mb-3">Preview</p>
              <div className="rounded-xl overflow-hidden border border-dark-border-primary">
                <div className="aspect-square bg-dark-bg-secondary flex items-center justify-center overflow-hidden">
                  {imagePreview
                    ? <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
                    : <Layers className="w-10 h-10 text-dark-text-tertiary" />}
                </div>
                <div className="bg-dark-bg-secondary border-t border-dark-border-primary px-3 py-3">
                  <p className="text-sm font-semibold text-dark-text-primary truncate leading-snug">
                    {name || 'Untitled Collection'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-dark-accent-primary/10 border border-dark-accent-primary/25 text-dark-accent-primary font-medium">
                      Solana
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadgeClass(collection.status)}`}>
                      {collection.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Right Panel ─────────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {!isOwner && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                You are not the owner of this collection.
              </div>
            )}

            {/* ── Step 1: Collection Info ────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">Collection Info</h2>
                  <p className="text-sm text-dark-text-tertiary mt-1">
                    Update your collection's display details. Saved directly to the database — no wallet signature needed.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Name</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors resize-none"
                    />
                  </div>

                  {/* Image uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                        Collection Image
                      </label>
                      <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-border-primary bg-dark-bg-secondary cursor-pointer hover:border-dark-border-accent hover:bg-dark-bg-hover transition-colors overflow-hidden aspect-square">
                        {imagePreview
                          ? <img src={imagePreview} alt="PFP" className="w-full h-full object-cover" />
                          : (
                            <div className="flex flex-col items-center gap-2 text-dark-text-tertiary p-4">
                              <div className="w-12 h-12 rounded-xl bg-dark-bg-primary border border-dashed border-dark-border-accent flex items-center justify-center">
                                <Layers className="w-5 h-5" />
                              </div>
                              <span className="text-xs text-center">Click to upload</span>
                            </div>
                          )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'pfp')} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                        Banner Image
                      </label>
                      <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dark-border-primary bg-dark-bg-secondary cursor-pointer hover:border-dark-border-accent hover:bg-dark-bg-hover transition-colors overflow-hidden aspect-square">
                        {bannerPreview
                          ? <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                          : (
                            <div className="flex flex-col items-center gap-2 text-dark-text-tertiary p-4">
                              <div className="w-12 h-12 rounded-xl bg-dark-bg-primary border border-dashed border-dark-border-accent flex items-center justify-center">
                                <Layers className="w-5 h-5" />
                              </div>
                              <span className="text-xs text-center">Click to upload</span>
                            </div>
                          )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'banner')} />
                      </label>
                    </div>
                  </div>

                  {/* Royalty */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Royalty %</label>
                    <input
                      type="number" min={0} max={50} step={0.5}
                      value={royaltyPct}
                      onChange={e => setRoyaltyPct(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                    />
                  </div>

                  {/* Social links */}
                  {[
                    { label: 'Twitter', value: twitterUrl, set: setTwitterUrl, placeholder: 'https://twitter.com/…' },
                    { label: 'Discord', value: discordUrl, set: setDiscordUrl, placeholder: 'https://discord.gg/…' },
                    { label: 'Website', value: websiteUrl, set: setWebsiteUrl, placeholder: 'https://…' },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-dark-text-secondary mb-2">{label}</label>
                      <input
                        value={value}
                        onChange={e => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-dark-border-primary" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleSaveInfo}
                      disabled={!isOwner || infoState === 'saving'}
                      isLoading={infoState === 'saving'}
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Info
                    </Button>
                    {infoMsg && (
                      <span className={`text-sm flex items-center gap-1 ${infoState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {infoState === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {infoMsg}
                      </span>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Mint Phases ────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">Mint Phases</h2>
                  <p className="text-sm text-dark-text-tertiary mt-1">
                    Define who can mint and when. Configure per-phase pricing and allowlists.
                    Saved to the database — no wallet signature needed.
                  </p>
                </div>

                {/* Quick Templates */}
                <div>
                  <p className="text-xs font-medium text-dark-text-tertiary uppercase tracking-wider mb-3">Quick Templates</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PHASE_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPhases([...t.phases])}
                        className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border transition-all duration-150 text-left w-full ${
                          activeTemplate === t.id
                            ? 'border-dark-accent-primary/60 bg-dark-accent-primary/8 shadow-glow'
                            : 'border-dark-border-primary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-hover'
                        }`}
                      >
                        <t.Icon className={`w-4 h-4 ${activeTemplate === t.id ? 'text-dark-accent-primary' : 'text-dark-text-tertiary'}`} />
                        <span className="text-sm font-semibold text-dark-text-primary">{t.label}</span>
                        <span className="text-xs text-dark-text-tertiary leading-tight">{t.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phase list */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-dark-text-secondary">Mint Phases</p>
                    <button
                      type="button"
                      onClick={addPhase}
                      className="flex items-center gap-1.5 text-xs text-dark-accent-primary hover:text-dark-accent-primary/80 transition-colors font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Phase
                    </button>
                  </div>
                  <div className="space-y-3">
                    {phases.map((phase, i) => (
                      <PhaseCard
                        key={i}
                        phase={phase}
                        index={i}
                        total={phases.length}
                        onChange={(p) => updatePhase(i, p)}
                        onRemove={() => removePhase(i)}
                      />
                    ))}
                  </div>
                </div>

                {/* Timeline strip */}
                {phases.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {phases.map((phase, i) => (
                        <div
                          key={i}
                          className="flex-1 h-1.5 rounded-full"
                          style={{ backgroundColor: phase.phaseType === 'public' ? '#00d4ff' : '#7c3aed', opacity: 0.6 }}
                          title={phase.name}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {phases.map((phase, i) => (
                        <p key={i} className="flex-1 text-center text-xs text-dark-text-tertiary truncate">
                          {phase.name || `Phase ${i + 1}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-dark-border-primary" />

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <div className="flex items-center gap-3">
                    {phasesMsg && (
                      <span className={`text-sm flex items-center gap-1 ${phasesState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {phasesState === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {phasesMsg}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleSavePhases}
                      disabled={!isOwner || phasesState === 'saving'}
                      isLoading={phasesState === 'saving'}
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Phases
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setStep(3)}>
                      Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: On-Chain Config ────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">On-Chain Config</h2>
                  <p className="text-sm text-dark-text-tertiary mt-1">
                    Global mint settings written to the Solana program. Requires your wallet signature.
                    {!onChain && collection.mintAddress && (
                      <span className="ml-1 text-amber-400">Loading on-chain data…</span>
                    )}
                    {!collection.mintAddress && (
                      <span className="ml-1 text-amber-400">No on-chain address — collection may not be deployed yet.</span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Mint Price</label>
                    <div className="relative">
                      <input
                        type="number" min={0} step={0.01}
                        value={freeMint ? '' : mintPrice}
                        onChange={e => { setMintPrice(parseFloat(e.target.value) || ''); setFreeMint(false) }}
                        disabled={freeMint}
                        placeholder="e.g. 1.5"
                        className="w-full px-4 py-2.5 pr-9 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors disabled:opacity-40"
                      />
                      <img src="/svg/solana-sol-logo.svg" alt="SOL" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

                  {/* Max Supply */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Max Supply</label>
                    <input
                      type="number" min={1} step={1}
                      value={maxSupply}
                      onChange={e => setMaxSupply(parseInt(e.target.value) || '')}
                      placeholder={onChain ? String(onChain.maxSupply) : '—'}
                      className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                    />
                  </div>

                  {/* Free mint toggle */}
                  <div className="flex items-center gap-3 py-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={freeMint}
                      onClick={() => setFreeMint(!freeMint)}
                      className={[
                        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                        freeMint ? 'bg-dark-accent-success' : 'bg-dark-bg-tertiary border border-dark-border-primary',
                      ].join(' ')}
                    >
                      <span className={[
                        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                        freeMint ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                    <span className="text-sm text-dark-text-secondary select-none">Free Mint</span>
                  </div>
                </div>

                {/* Max per wallet */}
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    Max Per Wallet <span className="text-dark-text-quaternary font-normal">(optional)</span>
                  </label>
                  <input
                    type="number" min={1} max={255} step={1}
                    value={maxPerWallet}
                    onChange={e => setMaxPerWallet(parseInt(e.target.value) || '')}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
                  />
                </div>

                {!freeMint && typeof mintPrice === 'number' && mintPrice > 0 && (
                  <p className="text-xs text-dark-text-tertiary">
                    Buyers pay <span className="text-dark-text-primary font-medium">{(mintPrice * 1.01).toFixed(4)} SOL</span>
                    {' '}— you receive {mintPrice} SOL (1% to NeXus)
                  </p>
                )}

                {/* Phase timing note */}
                {phases.length > 0 && phases[0]?.startDateTime && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-dark-bg-tertiary border border-dark-border-primary text-xs text-dark-text-tertiary">
                    <CalendarRange className="w-4 h-4 shrink-0 mt-0.5 text-dark-accent-primary" />
                    On-chain start time will be set from Phase 1 ({phases[0].name}):&nbsp;
                    <span className="text-dark-text-secondary font-medium">
                      {new Date(phases[0].startDateTime).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="border-t border-dark-border-primary" />

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                  <div className="flex items-center gap-3">
                    {mintMsg && (
                      <span className={`text-sm flex items-center gap-1 break-all ${mintState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {mintState === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        {mintMsg}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleUpdateOnChain}
                      disabled={!isOwner || !onChain || mintState === 'saving'}
                      isLoading={mintState === 'saving'}
                    >
                      <Zap className="w-4 h-4 mr-1.5" />
                      Update On-Chain
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setStep(4)}>
                      Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Minting Status ─────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-lg font-semibold text-dark-text-primary">Minting Status</h2>
                  <p className="text-sm text-dark-text-tertiary mt-1">
                    Pause minting to temporarily stop collectors from minting, or resume when ready.
                    Requires your wallet signature.
                  </p>
                </div>

                <div className={`rounded-xl border p-5 ${
                  isPaused
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-green-500/30 bg-green-500/5'
                }`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-green-400'}`} />
                    <p className={`text-sm font-semibold ${isPaused ? 'text-amber-400' : 'text-green-400'}`}>
                      {isPaused ? 'Minting Paused' : 'Minting Active'}
                    </p>
                  </div>
                  <p className="text-xs text-dark-text-tertiary ml-5.5">
                    {isPaused
                      ? 'Collectors cannot mint right now. Click Resume to re-open minting.'
                      : 'Collectors can mint according to your phase schedule.'}
                  </p>
                </div>

                {!collection.mintAddress && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No on-chain address found — collection may not be deployed yet.
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={isPaused ? 'primary' : 'outline'}
                    onClick={handleTogglePause}
                    disabled={!isOwner || !collection.mintAddress || pauseState === 'saving'}
                    isLoading={pauseState === 'saving'}
                  >
                    {isPaused
                      ? <><Play className="w-4 h-4 mr-1.5" />Resume Minting</>
                      : <><Pause className="w-4 h-4 mr-1.5" />Pause Minting</>}
                  </Button>
                  {pauseState === 'error' && (
                    <span className="text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Transaction failed
                    </span>
                  )}
                </div>

                <div className="border-t border-dark-border-primary" />

                <div>
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                  </Button>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
