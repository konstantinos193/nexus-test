'use client'

/**
 * NFT Create Page – Step Wizard
 * 4-step flow: Details → Upload → Deploy → Success!
 * Standalone CSS only (nft-create-*). No Tailwind.
 * This is the only create flow for /create — do not use CreatePageHeader, StepIndicator, or CollectionForm here.
 */

import '@/app/create/create-page.css'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { ipfsApi } from '@/lib/api/client'
import {
  DRAFT_STORAGE_KEY,
  CreateDraftPayload,
  PhaseRow,
  ShareAddressRow,
  TraitRow,
  SplitRow,
  toDateTimeLocal,
  getRoyaltySplitError,
  buildCreatorsFromRoyaltyConfig,
  ROYALTY_SPLIT_MAX,
  COLLECTION_NAME_MAX,
  SYMBOL_MIN,
  SYMBOL_MAX,
  type NftPreviewItem,
} from './create-types'
import CreateStep1Details from './CreateStep1Details'
import CreateStep2Upload from './CreateStep2Upload'
import CreateStep3Deploy from './CreateStep3Deploy'
import CreateStep4Success from './CreateStep4Success'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const STEPS = ['Details', 'Upload', 'Deploy', 'Success!']

const STEP_MIN = 1
const STEP_MAX = 4

/** Parse ?step=N from URL; returns 1–4 or null if missing/invalid */
function parseStepFromUrl(value: string | null): number | null {
  if (value == null || value === '') return null
  const n = parseInt(value, 10)
  if (!Number.isFinite(n) || n < STEP_MIN || n > STEP_MAX) return null
  return n
}

const DESC_MAX = 500
const DRAFT_DEBOUNCE_MS = 800

type Blockchain = 'solana' | 'ethereum' | 'polygon'
type NetworkEnv = 'mainnet' | 'testnet'

const BLOCKCHAINS: { value: Blockchain; label: string; icon: string }[] = [
  { value: 'solana', label: 'Solana', icon: '🟣' },
  { value: 'ethereum', label: 'Ethereum', icon: '🔵' },
  { value: 'polygon', label: 'Polygon', icon: '🟣' },
]

const METADATA_STANDARDS: { value: 'Core' | 'Metaplex' | 'CNFT'; label: string }[] = [
  { value: 'Core', label: 'Standard (DAS)' },
  { value: 'Metaplex', label: 'Legacy' },
  { value: 'CNFT', label: 'Compressed' },
]

const MINT_MODES: { value: 'Blind' | 'Gallery'; label: string; description: string; icon: 'shuffle' | 'grid' }[] = [
  { value: 'Blind', label: 'Random mint', description: 'Minters get a random NFT from the collection. Great for surprise drops.', icon: 'shuffle' },
  { value: 'Gallery', label: 'Pick & mint', description: 'Minters choose which NFT they want before minting. Full transparency.', icon: 'grid' },
]

const MINT_TYPES = [
  { value: 'public', label: 'Public Mint' },
  { value: 'allowlist', label: 'Allowlist' },
  { value: '1of1', label: '1/1 Mint' },
  { value: 'editioned', label: 'Editioned' },
]


/** Token metadata (e.g. 0.json): image + properties.files[].uri */
interface TokenMetadata {
  name?: string
  image?: string
  attributes?: Array<{ trait_type?: string; value?: string | number }>
  properties?: { files?: Array<{ uri?: string; type?: string }>; [k: string]: unknown }
  [k: string]: unknown
}

/**
 * Rewrite metadata image URLs after images are uploaded to IPFS.
 * Sets `image` and each `properties.files[].uri` (for image types) to the new IPFS gateway URL.
 */
function rewriteMetadataImageUrls(meta: TokenMetadata, imageUrl: string): TokenMetadata {
  const next = { ...meta, image: imageUrl }
  if (next.properties?.files && Array.isArray(next.properties.files)) {
    next.properties = {
      ...next.properties,
      files: next.properties.files.map((f) =>
        typeof f.type === 'string' && f.type.toLowerCase().startsWith('image/')
          ? { ...f, uri: imageUrl }
          : f
      ),
    }
  }
  return next
}

/** Get stem (name without extension) for matching metadata N.json ↔ image N.png */
function fileStem(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? name : name.slice(0, i)
}

export default function CreatePageContent() {
  const { connected, publicKey } = useWallet()
  const searchParams = useSearchParams()
  const router = useRouter()
  const stepFromUrl = parseStepFromUrl(searchParams.get('step'))
  const [step, setStep] = useState(stepFromUrl ?? 1)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewObjectUrlsRef = useRef<string[]>([])
  const collectionNameRef = useRef<HTMLInputElement | null>(null)
  const symbolRef = useRef<HTMLInputElement | null>(null)

  // Step 1 — Collection Details (match reference design)
  const [collectionName, setCollectionName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [metadataStandard, setMetadataStandard] = useState<'Core' | 'Metaplex' | 'CNFT'>('Core')
  const [mintMode, setMintMode] = useState<'Blind' | 'Gallery'>('Blind')
  const [freezeCollection, setFreezeCollection] = useState(false)
  const [freezeUntilDate, setFreezeUntilDate] = useState('') // optional: datetime-local, unfreeze at this date (Unix ts when deploying)
  const [revealLater, setRevealLater] = useState(false)
  const [enforceRoyalties, setEnforceRoyalties] = useState(true)
  const [royaltyConfig, setRoyaltyConfig] = useState<ShareAddressRow[]>([{ share: '100', address: '' }])
  const [fundReceivers, setFundReceivers] = useState<ShareAddressRow[]>([{ share: '100', address: '' }])
  const [blockchain, setBlockchain] = useState<Blockchain>('solana')
  const [network, setNetwork] = useState<NetworkEnv>('mainnet')
  const [description, setDescription] = useState('')
  const [step1Touched, setStep1Touched] = useState({ name: false, symbol: false })
  // Progressive reveal: Section B (Trading) collapsed by default; Section C (Revenue) required, expanded by default
  const [sectionTradingExpanded, setSectionTradingExpanded] = useState(false)
  const [sectionRevenueExpanded, setSectionRevenueExpanded] = useState(true)
  // Step transition direction for slide animation
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward')
  const prevStepRef = useRef(step)

  // Step 1 validation (inline errors)
  const getStep1Errors = useCallback(() => {
    const nameTrim = collectionName.trim()
    const err: { name?: string; symbol?: string } = {}
    if (step1Touched.name || nameTrim) {
      if (!nameTrim) err.name = 'Collection name is required'
      else if (nameTrim.length > COLLECTION_NAME_MAX) err.name = `Max ${COLLECTION_NAME_MAX} characters`
    }
    if (step1Touched.symbol || symbol) {
      if (!symbol) err.symbol = 'Symbol is required'
      else if (symbol.length < SYMBOL_MIN) err.symbol = `Min ${SYMBOL_MIN} characters`
      else if (symbol.length > SYMBOL_MAX) err.symbol = `Max ${SYMBOL_MAX} characters`
    }
    return err
  }, [collectionName, symbol, step1Touched])
  const step1Errors = getStep1Errors()
  const royaltySplitError = getRoyaltySplitError(royaltyConfig)
  const isRoyaltySplitValid = !royaltySplitError
  const royaltyTotal = royaltyConfig.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
  const fundReceiverError = getRoyaltySplitError(fundReceivers)
  const fundReceiverTotal = fundReceivers.reduce((sum, r) => sum + (parseFloat(r.share) || 0), 0)
  const isStep1Valid =
    collectionName.trim().length > 0 &&
    collectionName.trim().length <= COLLECTION_NAME_MAX &&
    symbol.length >= SYMBOL_MIN &&
    symbol.length <= SYMBOL_MAX &&
    !step1Errors.name &&
    !step1Errors.symbol &&
    isRoyaltySplitValid &&
    !fundReceiverError

  /** Identity section valid: name + symbol required */
  const identityValid =
    collectionName.trim().length > 0 &&
    collectionName.trim().length <= COLLECTION_NAME_MAX &&
    symbol.length >= SYMBOL_MIN &&
    symbol.length <= SYMBOL_MAX &&
    !step1Errors.name &&
    !step1Errors.symbol

  const hasAutoExpandedTradingRef = useRef(false)
  const hasAutoExpandedRevenueRef = useRef(false)
  /** Auto-expand Section B (Trading) and C (Revenue) when Identity becomes valid for the first time */
  useEffect(() => {
    if (identityValid && !hasAutoExpandedTradingRef.current) {
      hasAutoExpandedTradingRef.current = true
      setSectionTradingExpanded(true)
    }
    if (identityValid && !hasAutoExpandedRevenueRef.current) {
      hasAutoExpandedRevenueRef.current = true
      setSectionRevenueExpanded(true)
    }
  }, [identityValid])

  // First recipient is always the connected wallet when connected
  useEffect(() => {
    const addr = publicKey?.toBase58()
    if (!addr) return
    setRoyaltyConfig((r) => {
      if (r.length > 0) {
        const next = [...r]
        next[0] = { ...next[0], address: addr }
        return next
      }
      return r
    })
    setFundReceivers((f) => {
      if (f.length > 0) {
        const next = [...f]
        next[0] = { ...next[0], address: addr }
        return next
      }
      return f
    })
  }, [publicKey])

  const addRoyaltyConfig = useCallback(() => {
    setRoyaltyConfig((r) => (r.length >= ROYALTY_SPLIT_MAX ? r : [...r, { share: '0', address: '' }]))
  }, [])
  const removeRoyaltyConfig = useCallback((i: number) => {
    setRoyaltyConfig((r) => (r.length <= 1 ? r : r.filter((_, j) => j !== i)))
  }, [])

  /** Distribute royalty split evenly across all rows */
  const distributeRoyaltyEvenly = useCallback(() => {
    setRoyaltyConfig((r) => {
      if (r.length === 0) return r
      const each = Math.floor(100 / r.length)
      const remainder = 100 - each * r.length
      return r.map((row, i) => ({ ...row, share: String(i === 0 ? each + remainder : each) }))
    })
  }, [])

  /** Auto-fill remainder on last royalty row */
  const autoFillRoyaltyRemainder = useCallback(() => {
    setRoyaltyConfig((r) => {
      if (r.length === 0) return r
      const total = r.slice(0, -1).reduce((s, row) => s + (parseFloat(row.share) || 0), 0)
      const last = 100 - total
      const next = [...r]
      next[next.length - 1] = { ...next[next.length - 1], share: String(Math.max(0, Math.min(100, Math.round(last * 10) / 10))) }
      return next
    })
  }, [])

  /** Distribute mint funds split evenly across all rows */
  const distributeFundReceiversEvenly = useCallback(() => {
    setFundReceivers((r) => {
      if (r.length === 0) return r
      const each = Math.floor(100 / r.length)
      const remainder = 100 - each * r.length
      return r.map((row, i) => ({ ...row, share: String(i === 0 ? each + remainder : each) }))
    })
  }, [])

  /** Auto-fill remainder on last mint funds row */
  const autoFillFundReceiversRemainder = useCallback(() => {
    setFundReceivers((r) => {
      if (r.length === 0) return r
      const total = r.slice(0, -1).reduce((s, row) => s + (parseFloat(row.share) || 0), 0)
      const last = 100 - total
      const next = [...r]
      next[next.length - 1] = { ...next[next.length - 1], share: String(Math.max(0, Math.min(100, Math.round(last * 10) / 10))) }
      return next
    })
  }, [])
  const updateRoyaltyConfig = useCallback((i: number, field: 'share' | 'address', value: string) => {
    setRoyaltyConfig((r) => {
      const next = [...r]
      next[i] = { ...next[i], [field]: value }
      if (field === 'share') {
        const numVal = parseFloat(value)
        if (Number.isFinite(numVal)) {
          const othersTotal = next.reduce((s, row, j) => (j === i ? s : s + (parseFloat(row.share) || 0)), 0)
          const maxShare = Math.max(0, 100 - othersTotal)
          const capped = Math.min(maxShare, Math.max(0, numVal))
          next[i] = { ...next[i], share: String(capped) }
        }
      }
      return next
    })
  }, [])

  const addFundReceiver = useCallback(() => {
    setFundReceivers((f) => [...f, { share: '0', address: '' }])
  }, [])
  const removeFundReceiver = useCallback((i: number) => {
    setFundReceivers((f) => (f.length <= 1 ? f : f.filter((_, j) => j !== i)))
  }, [])
  const updateFundReceiver = useCallback((i: number, field: 'share' | 'address', value: string) => {
    setFundReceivers((f) => {
      const next = [...f]
      next[i] = { ...next[i], [field]: value }
      if (field === 'share') {
        const numVal = parseFloat(value)
        if (Number.isFinite(numVal)) {
          const othersTotal = next.reduce((s, r, j) => (j === i ? s : s + (parseFloat(r.share) || 0)), 0)
          const maxShare = Math.max(0, 100 - othersTotal)
          const capped = Math.min(maxShare, Math.max(0, numVal))
          next[i] = { ...next[i], share: String(capped) }
        }
      }
      return next
    })
  }, [])

  // Step 2 — images + metadata folders → upload as directory → base_uri for contract
  const [collectionImage, setCollectionImage] = useState<string | null>(null)
  const [collectionImageHash, setCollectionImageHash] = useState<string | null>(null)
  const [imagesFolderFiles, setImagesFolderFiles] = useState<File[]>([])
  const [metadataFolderFiles, setMetadataFolderFiles] = useState<File[]>([])
  const [baseUri, setBaseUri] = useState<string | null>(null)
  const [baseUriUploading, setBaseUriUploading] = useState(false)
  const [baseUriError, setBaseUriError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [bannerImageHash, setBannerImageHash] = useState<string | null>(null)
  const [bannerImageUploading, setBannerImageUploading] = useState(false)
  const [bannerImageError, setBannerImageError] = useState<string | null>(null)
  const [collectionImageUploading, setCollectionImageUploading] = useState(false)
  const [collectionImageError, setCollectionImageError] = useState<string | null>(null)
  const [totalSupply, setTotalSupply] = useState('')
  const [traits, setTraits] = useState<TraitRow[]>([{ name: '', values: '' }])
  const [previewItems, setPreviewItems] = useState<NftPreviewItem[]>([])
  const [imagesDragOver, setImagesDragOver] = useState(false)
  const [metadataDragOver, setMetadataDragOver] = useState(false)
  const [step2HowItWorksOpen, setStep2HowItWorksOpen] = useState(false)
  const [step2PreviewDetailItem, setStep2PreviewDetailItem] = useState<NftPreviewItem | null>(null)
  const [replaceConfirm, setReplaceConfirm] = useState<{ type: 'images' | 'metadata'; files: File[] } | null>(null)
  const imagesInputRef = useRef<HTMLInputElement>(null)
  const metadataInputRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [mintType, setMintType] = useState('public')
  const [mintPrice, setMintPrice] = useState('')
  const [freeMint, setFreeMint] = useState(false)
  const [maxPerWallet, setMaxPerWallet] = useState('')
  const [maxSupplyPerPhase, setMaxSupplyPerPhase] = useState('')
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const mintPriceValue = parseFloat(mintPrice)
  const isMintPriceValid = Number.isFinite(mintPriceValue) && mintPriceValue > 0
  const isStep3Valid = freeMint || isMintPriceValid

  // Step 4
  const [royaltyPercent, setRoyaltyPercent] = useState(5)
  const [royaltyWallet, setRoyaltyWallet] = useState('')
  const [splits, setSplits] = useState<SplitRow[]>([
    { wallet: '', percent: '70' },
    { wallet: '', percent: '30' },
  ])

  const splitTotal = splits.reduce((sum, r) => sum + (parseFloat(r.percent) || 0), 0)
  const splitValid = Math.abs(splitTotal - 100) < 0.01

  const addTrait = useCallback(() => {
    setTraits((t) => [...t, { name: '', values: '' }])
  }, [])

  const updateTrait = useCallback((i: number, field: 'name' | 'values', value: string) => {
    setTraits((t) => {
      const next = [...t]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }, [])

  const addSplit = useCallback(() => {
    setSplits((s) => [...s, { wallet: '', percent: '0' }])
  }, [])

  const updateSplit = useCallback((i: number, field: 'wallet' | 'percent', value: string) => {
    setSplits((s) => {
      const next = [...s]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }, [])

  const defaultPhaseRow = useCallback((): PhaseRow => {
    const start = new Date()
    start.setHours(start.getHours() + 1, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return {
      name: '',
      startDateTime: toDateTimeLocal(start),
      endDateTime: toDateTimeLocal(end),
      useEndDateTime: '',
      phaseType: 'public',
      priceOverride: '',
      allowlistRaw: '',
      maxPerWallet: '',
      maxSupply: '',
    }
  }, [])

  const addPhase = useCallback(() => {
    setPhases((p) => [...p, defaultPhaseRow()])
  }, [defaultPhaseRow])

  const updatePhase = useCallback((i: number, field: keyof PhaseRow, value: string) => {
    setPhases((p) => {
      const next = [...p]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }, [])

  const setPhaseUseEndMint = useCallback((i: number, use: boolean) => {
    setPhases((p) => {
      const next = [...p]
      next[i] = {
        ...next[i],
        useEndDateTime: use ? 'true' : '',
        endDateTime: use ? next[i].endDateTime : '',
      }
      return next
    })
  }, [])

  const removePhase = useCallback((i: number) => {
    setPhases((p) => p.filter((_, idx) => idx !== i))
  }, [])

  const movePhase = useCallback((i: number, direction: -1 | 1) => {
    setPhases((p) => {
      const j = i + direction
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  // Default Royalty Wallet and first Primary Sale Split row to connected wallet
  useEffect(() => {
    const addr = publicKey?.toBase58()
    if (!addr) return
    setRoyaltyWallet((w) => (w.trim() ? w : addr))
    setSplits((s) => {
      if (s.length > 0 && !s[0].wallet.trim()) {
        const next = [...s]
        next[0] = { ...next[0], wallet: addr }
        return next
      }
      return s
    })
  }, [publicKey])

  // Sync step from URL when it changes (browser back/forward or programmatic push)
  useEffect(() => {
    const n = parseStepFromUrl(searchParams.get('step'))
    if (n != null) setStep(n)
  }, [searchParams])

  // Keep URL in sync when we're on step 4 (e.g. if URL was stale or overwritten)
  useEffect(() => {
    if (step === 4 && parseStepFromUrl(searchParams.get('step')) !== 4) {
      router.replace(`/create?step=4`, { scroll: false })
    }
  }, [step, searchParams, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [step])

  // Restore draft from localStorage on mount; if URL has no step, set URL from draft
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null
      const d = raw ? (JSON.parse(raw) as CreateDraftPayload) : null
      const draftStep = d?.step != null && d.step >= 1 && d.step <= 4 ? d.step : null
      const urlStep = parseStepFromUrl(searchParams.get('step'))
      if (urlStep == null) {
        const initialStep = draftStep ?? 1
        router.replace(`/create?step=${initialStep}`, { scroll: false })
        setStep(initialStep)
      }
      if (!d) return
      if (d.collectionName != null) setCollectionName(d.collectionName)
      if (d.symbol != null) setSymbol(d.symbol)
      if (d.collectionDescription != null) setCollectionDescription(d.collectionDescription)
      if (d.metadataStandard != null && ['Core', 'Metaplex', 'CNFT'].includes(d.metadataStandard)) setMetadataStandard(d.metadataStandard as 'Core' | 'Metaplex' | 'CNFT')
      if (d.mintMode != null && ['Blind', 'Gallery'].includes(d.mintMode)) setMintMode(d.mintMode as 'Blind' | 'Gallery')
      if (d.freezeCollection != null) setFreezeCollection(d.freezeCollection)
      if (d.freezeUntilDate != null) setFreezeUntilDate(d.freezeUntilDate)
      if (Array.isArray(d.royaltyConfig) && d.royaltyConfig.length > 0) setRoyaltyConfig(d.royaltyConfig)
      if (Array.isArray(d.fundReceivers) && d.fundReceivers.length > 0) setFundReceivers(d.fundReceivers)
      if (d.collectionImage != null) setCollectionImage(d.collectionImage)
      if (d.collectionImageHash != null) setCollectionImageHash(d.collectionImageHash)
      if (d.baseUri != null) setBaseUri(d.baseUri)
      if (d.bannerImage != null) setBannerImage(d.bannerImage)
      if (d.bannerImageHash != null) setBannerImageHash(d.bannerImageHash)
      if (d.totalSupply != null && d.totalSupply !== '') setTotalSupply(d.totalSupply)
      if (Array.isArray(d.traits) && d.traits.length > 0) setTraits(d.traits)
      if (d.mintType != null) setMintType(d.mintType)
      if (d.mintPrice != null) setMintPrice(d.mintPrice)
      if (d.freeMint != null) setFreeMint(d.freeMint)
      if (d.maxPerWallet != null) setMaxPerWallet(d.maxPerWallet)
      if (d.maxSupplyPerPhase != null) setMaxSupplyPerPhase(d.maxSupplyPerPhase)
      if (Array.isArray(d.phases) && d.phases.length > 0) setPhases(d.phases)
      if (d.royaltyPercent != null) setRoyaltyPercent(d.royaltyPercent)
      if (d.royaltyWallet != null) setRoyaltyWallet(d.royaltyWallet)
      if (Array.isArray(d.splits) && d.splits.length > 0) setSplits(d.splits)
      setDraftSavedAt(Date.now())
    } catch {
      // ignore invalid or old draft format
    }
  }, [])

  // Auto-save draft (debounced after any form field change)
  useEffect(() => {
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
    draftTimeoutRef.current = setTimeout(() => {
      const payload: CreateDraftPayload = {
        version: 1,
        step,
        collectionName,
        symbol,
        collectionDescription,
        metadataStandard,
        mintMode,
        freezeCollection,
        freezeUntilDate,
        royaltyConfig,
        fundReceivers,
        collectionImage,
        collectionImageHash,
        bannerImage,
        bannerImageHash,
        totalSupply,
        traits,
        mintType,
        mintPrice,
        freeMint,
        maxPerWallet,
        maxSupplyPerPhase,
        phases,
        royaltyPercent,
        royaltyWallet,
        splits,
      }
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
        setDraftSavedAt(Date.now())
      } catch {
        // ignore quota or parse errors
      }
      draftTimeoutRef.current = null
    }, DRAFT_DEBOUNCE_MS)
    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
    }
  }, [
    step,
    collectionName,
    symbol,
    collectionDescription,
    metadataStandard,
    mintMode,
    freezeCollection,
    freezeUntilDate,
    royaltyConfig,
    fundReceivers,
    collectionImage,
    collectionImageHash,
    baseUri,
    bannerImage,
    bannerImageHash,
    totalSupply,
    traits,
    mintType,
    mintPrice,
    freeMint,
    maxPerWallet,
    maxSupplyPerPhase,
    phases,
    royaltyPercent,
    royaltyWallet,
    splits,
  ])

  /** Recursively get all File objects from a File System Access API directory handle (bypasses Chrome's "upload X files" dialog) */
  const getFilesFromDirectoryHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle): Promise<File[]> => {
    const files: File[] = []
    for await (const [, handle] of dirHandle.entries()) {
      if (handle.kind === 'file') {
        files.push(await (handle as FileSystemFileHandle).getFile())
      } else if (handle.kind === 'directory') {
        files.push(...(await getFilesFromDirectoryHandle(handle as FileSystemDirectoryHandle)))
      }
    }
    return files
  }, [])

  const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window

  /** Get all File objects from a DataTransfer (supports folder drop via webkitGetAsEntry) */
  const getFilesFromDataTransfer = useCallback(async (dataTransfer: DataTransfer): Promise<File[]> => {
    const files: File[] = []
    const items = Array.from(dataTransfer.items)
    const readEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))
        files.push(file)
        return
      }
      if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader()
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries((e) => resolve(Array.from(e)), reject)
        })
        for (const e of entries) await readEntry(e)
      }
    }
    for (const item of items) {
      if (item.kind !== 'file') continue
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry }).webkitGetAsEntry?.() ?? (item as DataTransferItem & { getAsEntry?: () => FileSystemEntry }).getAsEntry?.()
      if (!entry) {
        const file = item.getAsFile()
        if (file) files.push(file)
        continue
      }
      await readEntry(entry)
    }
    return files
  }, [])

  /** Show toast; auto-dismiss after 4s */
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ type, message })
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const validateStep1 = useCallback(() => {
    if (isStep1Valid) return true
    setStep1Touched({ name: true, symbol: true })
    if (!isRoyaltySplitValid || fundReceiverError) {
      setSectionRevenueExpanded(true)
    }
    showToast('error', 'Please fill the required fields to continue.')
    const nameTrim = collectionName.trim()
    if (!nameTrim || nameTrim.length > COLLECTION_NAME_MAX) {
      collectionNameRef.current?.focus()
      return false
    }
    if (!symbol || symbol.length < SYMBOL_MIN || symbol.length > SYMBOL_MAX) {
      symbolRef.current?.focus()
    }
    return false
  }, [collectionName, symbol, isStep1Valid, isRoyaltySplitValid, fundReceiverError, showToast])

  const validateStep2 = useCallback(() => {
    if (!imagesFolderFiles.length || !metadataFolderFiles.length) {
      showToast('error', 'Add both images and metadata folders to continue.')
      return false
    }
    if (baseUriUploading) {
      showToast('error', 'Upload in progress. Please wait.')
      return false
    }
    if (baseUriError) {
      showToast('error', 'Fix the upload error before continuing.')
      return false
    }
    if (!baseUri) {
      showToast('error', 'Finish uploading to IPFS before continuing.')
      return false
    }
    return true
  }, [imagesFolderFiles.length, metadataFolderFiles.length, baseUriUploading, baseUriError, baseUri, showToast])

  const validateStep3 = useCallback(() => {
    if (isStep3Valid) return true
    showToast('error', 'Set a mint price or enable free mint to continue.')
    return false
  }, [isStep3Valid, showToast])

  /** Apply images folder (called directly or after confirm) */
  const applyImagesFolder = useCallback((imageFiles: File[]) => {
    setImagesFolderFiles(imageFiles)
    setBaseUri(null)
    setBaseUriError(null)
    setCollectionImage((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      const first = imageFiles[0]
      return first ? URL.createObjectURL(first) : null
    })
  }, [])

  /** Store dropped images folder; show custom confirm if replacing existing */
  const handleImagesFolder = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'))
      if (!imageFiles.length) {
        showToast('error', 'No image files found. Use PNG / JPG.')
        return
      }
      if (imagesFolderFiles.length > 0) {
        setReplaceConfirm({ type: 'images', files: imageFiles })
        return
      }
      applyImagesFolder(imageFiles)
    },
    [showToast, imagesFolderFiles.length, applyImagesFolder]
  )

  /** Apply metadata folder (called directly or after confirm) */
  const applyMetadataFolder = useCallback((jsonFiles: File[]) => {
    setMetadataFolderFiles(jsonFiles)
    setBaseUri(null)
    setBaseUriError(null)
  }, [])

  /** Store dropped metadata folder; show custom confirm if replacing existing */
  const handleMetadataFolder = useCallback(
    (files: File[]) => {
      const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'))
      if (!jsonFiles.length) {
        showToast('error', 'No JSON files found.')
        return
      }
      if (metadataFolderFiles.length > 0) {
        setReplaceConfirm({ type: 'metadata', files: jsonFiles })
        return
      }
      applyMetadataFolder(jsonFiles)
    },
    [showToast, metadataFolderFiles.length, applyMetadataFolder]
  )

  const handleReplaceConfirm = useCallback(() => {
    if (!replaceConfirm) return
    if (replaceConfirm.type === 'images') {
      const imageFiles = replaceConfirm.files.filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length) applyImagesFolder(imageFiles)
    } else {
      const jsonFiles = replaceConfirm.files.filter((f) => f.name.toLowerCase().endsWith('.json'))
      if (jsonFiles.length) applyMetadataFolder(jsonFiles)
    }
    setReplaceConfirm(null)
  }, [replaceConfirm, applyImagesFolder, applyMetadataFolder])

  const handleReplaceCancel = useCallback(() => {
    setReplaceConfirm(null)
  }, [])

  /** Browse for images folder — uses showDirectoryPicker when available to bypass Chrome's "upload X files" confirmation */
  const handleImagesFolderClick = useCallback(async () => {
    if (supportsDirectoryPicker && window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker()
        const files = await getFilesFromDirectoryHandle(dirHandle)
        handleImagesFolder(files)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          showToast('error', (e as Error).message || 'Could not read folder')
        }
      }
    } else {
      imagesInputRef.current?.click()
    }
  }, [supportsDirectoryPicker, getFilesFromDirectoryHandle, handleImagesFolder, showToast])

  /** Browse for metadata folder — uses showDirectoryPicker when available to bypass Chrome's "upload X files" confirmation */
  const handleMetadataFolderClick = useCallback(async () => {
    if (supportsDirectoryPicker && window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker()
        const files = await getFilesFromDirectoryHandle(dirHandle)
        handleMetadataFolder(files)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          showToast('error', (e as Error).message || 'Could not read folder')
        }
      }
    } else {
      metadataInputRef.current?.click()
    }
  }, [supportsDirectoryPicker, getFilesFromDirectoryHandle, handleMetadataFolder, showToast])

  /** Upload images first to IPFS → rewrite metadata image URLs → upload metadata only. base_uri = metadata dir. */
  const handleUploadDirectory = useCallback(async () => {
    if (!imagesFolderFiles.length || !metadataFolderFiles.length) {
      setBaseUriError('Drop both images folder and metadata folder first.')
      showToast('error', 'Drop both images and metadata folders first.')
      return
    }
    setBaseUriUploading(true)
    setBaseUriError(null)

    const stemToImage = new Map<string, File>()
    for (const f of imagesFolderFiles) {
      const s = fileStem(f.name)
      if (!stemToImage.has(s)) stemToImage.set(s, f)
    }

    const gate = (base: string) => (base.endsWith('/') ? base.slice(0, -1) : base)

    try {
      const imagesRes = await ipfsApi.uploadDirectory(imagesFolderFiles)
      if (!imagesRes.success || !imagesRes.data) {
        setBaseUriUploading(false)
        const msg = imagesRes.error || 'Images upload failed'
        setBaseUriError(msg)
        showToast('error', msg)
        return
      }
      const { hash: imagesHash, gatewayUrl } = imagesRes.data
      const imageBase = `${gate(gatewayUrl)}`

      const rewritten: File[] = []
      for (const mf of metadataFolderFiles) {
        const stem = fileStem(mf.name)
        const img = stemToImage.get(stem)
        if (!img) {
          setBaseUriUploading(false)
          setBaseUriError(`No matching image for metadata ${mf.name} (expected ${stem}.png or similar).`)
          showToast('error', `No matching image for ${mf.name}`)
          return
        }
        const imageUrl = `${imageBase}/${img.name}`
        const raw = await mf.text()
        let meta: TokenMetadata
        try {
          meta = JSON.parse(raw) as TokenMetadata
        } catch {
          setBaseUriUploading(false)
          setBaseUriError(`Invalid JSON in ${mf.name}.`)
          showToast('error', `Invalid JSON: ${mf.name}`)
          return
        }
        const updated = rewriteMetadataImageUrls(meta, imageUrl)
        rewritten.push(
          new File([JSON.stringify(updated, null, 2)], mf.name, { type: 'application/json' })
        )
      }

      const metaRes = await ipfsApi.uploadDirectory(rewritten)
      setBaseUriUploading(false)
      if (!metaRes.success || !metaRes.data) {
        const msg = metaRes.error || 'Metadata upload failed'
        setBaseUriError(msg)
        showToast('error', msg)
        return
      }

      setBaseUri(metaRes.data.baseUri)
      setCollectionImageHash(imagesHash)
      const firstImage = imagesFolderFiles[0]
      if (firstImage && gatewayUrl) {
        setCollectionImage(`${gate(gatewayUrl)}/${firstImage.name}`)
      }
      showToast('success', 'Media uploaded')
    } catch (e) {
      setBaseUriUploading(false)
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setBaseUriError(msg)
      showToast('error', msg)
    }
  }, [imagesFolderFiles, metadataFolderFiles, showToast])

  /** Auto-upload to IPFS when both folders are set (no button — smoother UX) */
  useEffect(() => {
    if (
      imagesFolderFiles.length > 0 &&
      metadataFolderFiles.length > 0 &&
      !baseUri &&
      !baseUriUploading
    ) {
      handleUploadDirectory()
    }
  }, [imagesFolderFiles.length, metadataFolderFiles.length, baseUri, baseUriUploading, handleUploadDirectory])

  /** Auto-detect max supply from metadata count */
  useEffect(() => {
    if (metadataFolderFiles.length > 0) {
      setTotalSupply(String(metadataFolderFiles.length))
    }
  }, [metadataFolderFiles.length])

  /** Build NFT preview items from images + metadata (how they will look) */
  useEffect(() => {
    if (!imagesFolderFiles.length || !metadataFolderFiles.length) {
      previewObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewObjectUrlsRef.current = []
      setPreviewItems([])
      return
    }
    const stemToImage = new Map<string, File>()
    for (const f of imagesFolderFiles) {
      const s = fileStem(f.name)
      if (!stemToImage.has(s)) stemToImage.set(s, f)
    }
    previewObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewObjectUrlsRef.current = []
    const newUrls: string[] = []
    let cancelled = false
    Promise.all(
      metadataFolderFiles.map(async (mf) => {
        const stem = fileStem(mf.name)
        const imageFile = stemToImage.get(stem)
        const imageUrl = imageFile ? URL.createObjectURL(imageFile) : ''
        if (imageUrl) newUrls.push(imageUrl)
        let name = `#${stem}`
        let attributes: Array<{ trait_type: string; value: string }> = []
        try {
          const raw = await mf.text()
          const meta = JSON.parse(raw) as TokenMetadata
          if (typeof meta.name === 'string') name = meta.name
          if (Array.isArray(meta.attributes)) {
            attributes = meta.attributes
              .filter((a) => a && (a.trait_type != null || a.value != null))
              .map((a) => ({
                trait_type: typeof a.trait_type === 'string' ? a.trait_type : 'Attribute',
                value: String(a.value ?? ''),
              }))
          }
        } catch {
          // use defaults
        }
        return { stem, name, imageUrl, attributes }
      })
    ).then((items) => {
      if (!cancelled) {
        previewObjectUrlsRef.current = newUrls
        setPreviewItems(items)
      } else {
        newUrls.forEach((url) => URL.revokeObjectURL(url))
      }
    })
    return () => {
      cancelled = true
    }
  }, [imagesFolderFiles, metadataFolderFiles])

  /** Close step-2 preview detail modal on Escape */
  useEffect(() => {
    if (!step2PreviewDetailItem) return 
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStep2PreviewDetailItem(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [step2PreviewDetailItem])

  /** Upload image to IPFS via backend; set preview URL and hash on success; optional onDone for toast */
  const uploadImageToIpfs = useCallback(
    async (
      file: File,
      setUrl: (url: string | null) => void,
      setHash: (hash: string | null) => void,
      setUploading: (v: boolean) => void,
      setError: (msg: string | null) => void,
      onDone?: (success: boolean, errorMessage?: string) => void
    ) => {
      setUploading(true)
      setError(null)
      const res = await ipfsApi.uploadFile(file)
      setUploading(false)
      if (!res.success || !res.data) {
        const msg = res.error || 'Upload failed'
        setError(msg)
        setUrl(null)
        setHash(null)
        onDone?.(false, msg)
        return
      }
      setUrl(res.data.gatewayUrl)
      setHash(res.data.hash)
      setError(null)
      onDone?.(true)
    },
    []
  )

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'collection' | 'banner'
  ) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (kind === 'collection') {
      uploadImageToIpfs(
        file,
        setCollectionImage,
        setCollectionImageHash,
        setCollectionImageUploading,
        setCollectionImageError,
        (ok, err) => {
          if (ok) showToast('success', 'Collection image uploaded.')
          else showToast('error', err || 'Upload failed.')
        }
      )
    } else if (kind === 'banner') {
      uploadImageToIpfs(
        file,
        setBannerImage,
        setBannerImageHash,
        setBannerImageUploading,
        setBannerImageError,
        (ok, err) => {
          if (ok) showToast('success', 'Banner uploaded to IPFS.')
          else showToast('error', err || 'Banner upload failed.')
        }
      )
    }
  }

  const handleDrop = (
    e: React.DragEvent,
    kind: 'collection' | 'banner'
  ) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (kind === 'collection') {
      uploadImageToIpfs(
        file,
        setCollectionImage,
        setCollectionImageHash,
        setCollectionImageUploading,
        setCollectionImageError,
        (ok, err) => {
          if (ok) showToast('success', 'Collection image uploaded.')
          else showToast('error', err || 'Upload failed.')
        }
      )
    } else if (kind === 'banner') {
      uploadImageToIpfs(
        file,
        setBannerImage,
        setBannerImageHash,
        setBannerImageUploading,
        setBannerImageError,
        (ok, err) => {
          if (ok) showToast('success', 'Banner uploaded to IPFS.')
          else showToast('error', err || 'Banner upload failed.')
        }
      )
    }
  }

  /** Persist step to draft immediately so remount/restore doesn't overwrite user navigation */
  const persistStepToDraft = useCallback((newStep: number) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_STORAGE_KEY) : null
      const draft: CreateDraftPayload = raw ? (JSON.parse(raw) as CreateDraftPayload) : {}
      draft.step = newStep
      if (typeof window !== 'undefined') localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
  }, [])

  /** Navigate to step and update URL + draft */
  const goToStep = useCallback(
    (newStep: number) => {
      const s = Math.max(STEP_MIN, Math.min(STEP_MAX, newStep))
      setStepDirection(s > step ? 'forward' : 'back')
      prevStepRef.current = step
      setStep(s)
      router.push(`/create?step=${s}`, { scroll: false })
      persistStepToDraft(s)
    },
    [router, persistStepToDraft, step]
  )

  const goBack = () => goToStep(step - 1)
  const goNext = () => goToStep(step + 1)
  const handleNext = useCallback(() => {
    if (!connected) {
      showToast('error', 'Connect your wallet to continue.')
      return
    }
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    goNext()
  }, [connected, goNext, showToast, step, validateStep1, validateStep2, validateStep3])

  /** Clear draft and go to step 1 for a fresh collection (full reload so state resets) */
  const handleStartNewCollection = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        window.location.href = '/create?step=1'
      }
    } catch {
      goToStep(1)
    }
  }, [goToStep])

  const handleSaveDraft = () => {
    const payload: CreateDraftPayload = {
      version: 1,
      step,
      collectionName,
      symbol,
      collectionDescription,
      metadataStandard,
      mintMode,
      freezeCollection,
      freezeUntilDate,
      royaltyConfig,
      fundReceivers,
      collectionImage,
      collectionImageHash,
      baseUri,
      bannerImage,
      bannerImageHash,
      totalSupply,
      traits,
      mintType,
      mintPrice,
      freeMint,
      maxPerWallet,
      maxSupplyPerPhase,
      royaltyPercent,
      royaltyWallet,
      splits,
    }
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
      setDraftSavedAt(Date.now())
    } catch {
      // ignore quota errors
    }
  }

  /** "Draft saved X seconds ago" for Step 1 */
  const draftSavedAgo =
    draftSavedAt && step === 1
      ? (() => {
          const sec = Math.floor((Date.now() - draftSavedAt) / 1000)
          if (sec < 5) return 'just now'
          if (sec < 60) return `${sec} seconds ago`
          return `${Math.floor(sec / 60)} minutes ago`
        })()
      : null

  /** "What's Missing" checklist — live-updating items that block Next */
  const whatsMissingItems = useMemo(() => {
    const items: { id: string; done: boolean; label: string }[] = []
    if (!connected) {
      items.push({ id: 'wallet', done: false, label: 'Connect your wallet' })
    } else {
      items.push({ id: 'wallet', done: true, label: 'Wallet connected' })
    }
    if (step === 1) {
      const nameOk = collectionName.trim().length > 0 && collectionName.trim().length <= COLLECTION_NAME_MAX && !step1Errors.name
      items.push({ id: 'name', done: nameOk, label: 'Collection name' })
      const symbolOk = symbol.length >= SYMBOL_MIN && symbol.length <= SYMBOL_MAX && !step1Errors.symbol
      items.push({ id: 'symbol', done: symbolOk, label: 'Symbol' })
      items.push({ id: 'royalty', done: isRoyaltySplitValid, label: 'Royalty split totals 100%' })
      items.push({ id: 'mintfunds', done: !fundReceiverError, label: 'Mint funds split totals 100%' })
    }
    if (step === 2) {
      items.push({ id: 'images', done: imagesFolderFiles.length > 0, label: 'Images folder added' })
      items.push({ id: 'metadata', done: metadataFolderFiles.length > 0, label: 'Metadata folder added' })
      if (baseUriUploading) {
        items.push({ id: 'upload', done: false, label: 'Upload in progress…' })
      } else if (baseUriError) {
        items.push({ id: 'upload', done: false, label: 'Fix upload error' })
      } else {
        items.push({ id: 'upload', done: !!baseUri, label: 'IPFS upload complete' })
      }
    }
    if (step === 3) {
      items.push({ id: 'price', done: isStep3Valid, label: 'Mint price or free mint set' })
    }
    return items
  }, [
    connected,
    step,
    collectionName,
    symbol,
    step1Errors,
    isRoyaltySplitValid,
    fundReceiverError,
    imagesFolderFiles.length,
    metadataFolderFiles.length,
    baseUriUploading,
    baseUriError,
    baseUri,
    isStep3Valid,
  ])

  const nextDisabledReason = useMemo(() => {
    if (!connected) return 'Connect your wallet to continue.'
    if (step === 1 && !isStep1Valid) return 'Fill the required fields to continue.'
    if (step === 2) {
      if (!imagesFolderFiles.length || !metadataFolderFiles.length) return 'Add both images and metadata folders.'
      if (baseUriUploading) return 'Uploading media to IPFS...'
      if (baseUriError) return 'Resolve the upload error before continuing.'
      if (!baseUri) return 'Finish uploading before continuing.'
    }
    if (step === 3 && !isStep3Valid) return 'Set a mint price or choose free mint.'
    return ''
  }, [
    connected,
    step,
    isStep1Valid,
    imagesFolderFiles.length,
    metadataFolderFiles.length,
    baseUriUploading,
    baseUriError,
    baseUri,
    isStep3Valid,
  ])
  const isNextDisabled = Boolean(nextDisabledReason)

  return (
    <div className="nft-create-page">
      <div className="nft-create-container">
        <header className="nft-create-header">
          <h1 className="nft-create-header-title">Create NFT Collection</h1>
        </header>

        <section className="nft-create-hero" aria-label="Create your collection">
          <h2 className="nft-create-hero-title">Create your collection</h2>
          <p className="nft-create-hero-sub">Set details, upload art, deploy on Solana — a few steps to go live.</p>
        </section>

        <div className="nft-create-stepper-wrap">
          <div className="nft-create-stepper nft-create-stepper-horizontal" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4}>
            {STEPS.map((label, i) => (
              <div key={i} className="nft-create-step-root">
                <button
                  type="button"
                  className={`nft-create-step-label-wrap ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : 'disabled'}`}
                  onClick={() => step !== i + 1 && goToStep(i + 1)}
                  disabled={i + 1 > step}
                  aria-label={`Step ${i + 1}: ${label}${step > i + 1 ? ', go back' : step === i + 1 ? ', current' : ''}`}
                  aria-current={step === i + 1 ? 'step' : undefined}
                >
                  <span className="nft-create-step-icon" aria-hidden>{i + 1}</span>
                  <span className="nft-create-step-label">{label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="nft-create-content-card">
          <div className="nft-create-content">
            <div className={`nft-create-step-content nft-create-step-content--${stepDirection}`} key={step} data-step={step}>
            {/* Wallet required — show on all steps when disconnected */}
          {!connected && (
            <div className="nft-create-wallet-banner" role="alert">
              ⚠ Connect your wallet to create a collection. Use the Connect Wallet button in the header.
            </div>
          )}
          {/* Step 1 — Progressive Reveal: Identity → Trading → Revenue */}
          {step === 1 && (
            <CreateStep1Details
              draftSavedAgo={draftSavedAgo}
              identityValid={identityValid}
              sectionTradingExpanded={sectionTradingExpanded}
              sectionRevenueExpanded={sectionRevenueExpanded}
              setSectionTradingExpanded={setSectionTradingExpanded}
              setSectionRevenueExpanded={setSectionRevenueExpanded}
              isRoyaltySplitValid={isRoyaltySplitValid}
              fundReceiverError={fundReceiverError}
              step1Errors={step1Errors}
              collectionName={collectionName}
              setCollectionName={setCollectionName}
              symbol={symbol}
              setSymbol={setSymbol}
              collectionDescription={collectionDescription}
              setCollectionDescription={setCollectionDescription}
              step1Touched={step1Touched}
              setStep1Touched={setStep1Touched}
              collectionNameRef={collectionNameRef}
              symbolRef={symbolRef}
              collectionImage={collectionImage}
              collectionImageUploading={collectionImageUploading}
              collectionImageError={collectionImageError}
              collectionImageHash={collectionImageHash}
              bannerImage={bannerImage}
              bannerImageUploading={bannerImageUploading}
              bannerImageError={bannerImageError}
              bannerImageHash={bannerImageHash}
              onDrop={handleDrop}
              onFileSelect={handleFile}
              metadataStandard={metadataStandard}
              setMetadataStandard={setMetadataStandard}
              mintMode={mintMode}
              setMintMode={setMintMode}
              freezeCollection={freezeCollection}
              setFreezeCollection={setFreezeCollection}
              freezeUntilDate={freezeUntilDate}
              setFreezeUntilDate={setFreezeUntilDate}
              revealLater={revealLater}
              setRevealLater={setRevealLater}
              royaltyPercent={royaltyPercent}
              setRoyaltyPercent={setRoyaltyPercent}
              royaltyConfig={royaltyConfig}
              updateRoyaltyConfig={updateRoyaltyConfig}
              addRoyaltyConfig={addRoyaltyConfig}
              removeRoyaltyConfig={removeRoyaltyConfig}
              distributeRoyaltyEvenly={distributeRoyaltyEvenly}
              autoFillRoyaltyRemainder={autoFillRoyaltyRemainder}
              fundReceivers={fundReceivers}
              updateFundReceiver={updateFundReceiver}
              addFundReceiver={addFundReceiver}
              removeFundReceiver={removeFundReceiver}
              distributeFundReceiversEvenly={distributeFundReceiversEvenly}
              autoFillFundReceiversRemainder={autoFillFundReceiversRemainder}
              royaltySplitError={royaltySplitError}
              royaltyTotal={royaltyTotal}
              fundReceiverTotal={fundReceiverTotal}
            />
          )}

          {/* Step 2 — Media & Metadata */}
          {step === 2 && (
            <CreateStep2Upload
              imagesFolderFiles={imagesFolderFiles}
              metadataFolderFiles={metadataFolderFiles}
              baseUri={baseUri}
              baseUriUploading={baseUriUploading}
              baseUriError={baseUriError}
              collectionImage={collectionImage}
              imagesDragOver={imagesDragOver}
              metadataDragOver={metadataDragOver}
              setImagesDragOver={setImagesDragOver}
              setMetadataDragOver={setMetadataDragOver}
              onImagesClick={handleImagesFolderClick}
              onImagesDrop={async (e) => {
                e.preventDefault()
                setImagesDragOver(false)
                const files = await getFilesFromDataTransfer(e.dataTransfer)
                handleImagesFolder(files)
              }}
              onImagesChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                handleImagesFolder(files)
                e.target.value = ''
              }}
              onMetadataClick={handleMetadataFolderClick}
              onMetadataDrop={async (e) => {
                e.preventDefault()
                setMetadataDragOver(false)
                const files = await getFilesFromDataTransfer(e.dataTransfer)
                handleMetadataFolder(files)
              }}
              onMetadataChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                handleMetadataFolder(files)
                e.target.value = ''
              }}
              imagesInputRef={imagesInputRef}
              metadataInputRef={metadataInputRef}
              previewItems={previewItems}
              onPreviewItemClick={setStep2PreviewDetailItem}
              howItWorksOpen={step2HowItWorksOpen}
              setHowItWorksOpen={setStep2HowItWorksOpen}
            />
          )}

          {/* Step 3 — Mint Phases */}
          {step === 3 && (
            <CreateStep3Deploy
              phases={phases}
              addPhase={addPhase}
              updatePhase={updatePhase}
              setPhaseUseEndMint={setPhaseUseEndMint}
              removePhase={removePhase}
              movePhase={movePhase}
            />
          )}

          {/* Step 4 — Success! (Deploy & Review) */}
          {step === 4 && (
            <CreateStep4Success
              collectionName={collectionName}
              collectionImage={collectionImage}
              totalSupply={totalSupply}
              mintPrice={mintPrice}
              freeMint={freeMint}
              royaltyPercent={royaltyPercent}
              freezeCollection={freezeCollection}
              freezeUntilDate={freezeUntilDate}
              phases={phases}
              metadataStandard={metadataStandard}
              connected={connected}
              draftSavedAt={draftSavedAt}
              onSaveDraft={handleSaveDraft}
              onStartNewCollection={handleStartNewCollection}
            />
          )}

            </div>

          {/* Preview detail modal — shared across steps 2 & 3, portaled to body */}
          {step2PreviewDetailItem &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="nft-create-step2-preview-modal-overlay"
                role="presentation"
                onClick={() => setStep2PreviewDetailItem(null)}
              >
                <div
                  className="nft-create-step2-preview-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="nft-create-step2-preview-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="nft-create-step2-preview-modal-image">
                    {step2PreviewDetailItem.imageUrl ? (
                      <img src={step2PreviewDetailItem.imageUrl} alt={step2PreviewDetailItem.name} />
                    ) : (
                      <span className="nft-create-step2-preview-card-placeholder">No image</span>
                    )}
                  </div>
                  <div className="nft-create-step2-preview-modal-body">
                    <h2 id="nft-create-step2-preview-modal-title" className="nft-create-step2-preview-modal-name">
                      {step2PreviewDetailItem.name}
                    </h2>
                    {step2PreviewDetailItem.attributes.length > 0 && (
                      <div className="nft-create-step2-preview-modal-attrs">
                        {step2PreviewDetailItem.attributes.map((a, j) => (
                          <div key={j} className="nft-create-step2-preview-modal-attr">
                            <span className="nft-create-step2-preview-modal-attr-type">{a.trait_type}</span>
                            <span className="nft-create-step2-preview-modal-attr-value">{a.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="nft-create-step2-preview-modal-close"
                    onClick={() => setStep2PreviewDetailItem(null)}
                    aria-label="Close details"
                  >
                    ×
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* What's Missing checklist — above footer when items incomplete */}
        {step < 4 && whatsMissingItems.some((x) => !x.done) && (
          <div className="nft-create-whats-missing" role="status" aria-live="polite">
            <div className="nft-create-whats-missing-title">Before continuing:</div>
            <ul className="nft-create-whats-missing-list">
              {whatsMissingItems.map((item) => (
                <li key={item.id} className={`nft-create-whats-missing-item ${item.done ? 'done' : ''}`}>
                  {item.done ? '✔' : '○'} {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step < 4 && (
          <footer className="nft-create-footer">
            <button
              type="button"
              className="nft-create-btn nft-create-btn-back"
              onClick={goBack}
              disabled={step === 1}
              aria-disabled={step === 1}
            >
              Back
            </button>
            <div className="nft-create-footer-actions-wrap">
              <div className="nft-create-footer-actions">
                {step === 1 && (
                  <button type="button" className="nft-create-btn nft-create-btn-secondary" onClick={handleSaveDraft}>
                    Save draft
                  </button>
                )}
                <button
                  type="button"
                  className="nft-create-btn nft-create-btn-primary"
                  onClick={handleNext}
                  disabled={isNextDisabled}
                  aria-disabled={isNextDisabled}
                >
                  Next →
                </button>
              </div>
              {nextDisabledReason && (
                <div className="nft-create-footer-hint" role="status" aria-live="polite">
                  {nextDisabledReason}
                </div>
              )}
            </div>
          </footer>
        )}
      </div>

      {toast && (
        <div
          className={`nft-create-toast nft-create-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="nft-create-toast-message">{toast.message}</span>
          <button
            type="button"
            className="nft-create-toast-dismiss"
            onClick={() => {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
              setToast(null)
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <ConfirmDialog
        open={replaceConfirm !== null}
        title={replaceConfirm?.type === 'images' ? 'Replace images?' : 'Replace metadata?'}
        message={
          replaceConfirm?.type === 'images'
            ? 'This will clear your current images and IPFS upload status. Continue?'
            : 'This will clear your current metadata and IPFS upload status. Continue?'
        }
        confirmLabel="Replace"
        cancelLabel="Cancel"
        onConfirm={handleReplaceConfirm}
        onCancel={handleReplaceCancel}
      />
    </div>
  )
}
