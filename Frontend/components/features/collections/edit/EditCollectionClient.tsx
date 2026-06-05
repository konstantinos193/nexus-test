'use client'

/* eslint-disable max-lines, max-lines-per-function, max-statements, complexity */

/**
 * EditCollectionClient – The creator's control panel for modifying their collection.
 * Two sections: off-chain info (DB only, no signature) and on-chain mint config (wallet required).
 * Plus a pause/resume toggle for when the creator needs to hit the brakes on minting.
 *
 * The outer shell (EditCollectionClient) is a WalletReadyContext guard.
 * It blocks rendering of the inner component until the Solana wallet adapter is initialized.
 * Without this guard, useWallet() would explode. We've seen the explosion. It's not pretty.
 *
 * Section A: Name, description, images, royalty, social links.
 *   Saves to the database. No wallet needed. No blockchain writes.
 *   (The off-chain stuff is cheap and fast. We do it first.)
 *
 * Section B: Max supply, price, start/end time, max per wallet.
 *   Builds an Anchor instruction, sends a transaction, waits for confirmation.
 *   Then syncs the result back to the database. Two writes for the price of one. Worth it.
 *   (If you're here because the on-chain update failed: check the program ID, PDA derivation,
 *    and whether the wallet is actually the collection authority. It's usually one of those three.)
 *
 * @author Juan – The developer who wired up Borsh encoding by hand and will do it again
 * (Coded with care, Buffer.concat, a deep hatred for timezone offsets, and too much caffeine)
 */

// React hooks — the full set needed for this beast of a component
// useState: 20+ state fields (yes, really — form fields are state, change my mind)
// useEffect: data loading, wallet connection side-effect
// useContext: WalletReadyContext guard
// useCallback: memoized save handlers to avoid infinite re-render spirals
import { useState, useEffect, useContext, useCallback } from 'react'
// useParams: gets the collection ID from the URL. Assumes we're under /edit/[id].
// useRouter: for navigation back to dashboard after catastrophic failure
import { useParams, useRouter } from 'next/navigation'
// Solana wallet adapter hooks — the gateway to the user's wallet and RPC connection
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
// Solana web3.js — the raw tools for building and sending transactions
// PublicKey: address wrapper. Transaction: the envelope. TransactionInstruction: the letter.
// SystemProgram: included for potential future use (currently unused but present for completeness)
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
// Lucide icons — the visual language of this editor's UI
// Layers: placeholder thumbnail when no image is uploaded yet (matches create page).
// Save: save info. Zap: update on-chain (lightning = blockchain).
// Pause/Play: the collection pause toggle. Loader2: spinning wait indicator.
// AlertCircle: error state. CheckCircle: success state.
import { Layers, Save, Zap, Pause, Play, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

// collectionsApi: the typed API client for database operations (get, update)
// uploadImageToIpfs: uploads image files to IPFS and returns the ipfs:// URI
import { collectionsApi, uploadImageToIpfs } from '@/lib/api/client'
// getChainConfig: reads the chain configuration (programId, RPC URL, etc.) for the current network
import { getChainConfig } from '@/lib/solana/chain-config'
// pollForConfirmation: HTTP-polling replacement for confirmTransaction() — no WebSocket dependency
import { pollForConfirmation } from '@/lib/solana/confirm'
// WalletReadyContext: boolean context that guards against useWallet() being called before ready
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'
// Button: the platform's styled button component — handles loading states, variants, etc.
import Button from '@/components/ui/Button'
// NFTCollection type — the database shape of a collection
import type { NFTCollection } from '@/types'

// ── Borsh helpers (mirrors useCreateCollectionForm.ts) ─────────────────────────
// These functions encode instruction data for the Solana program using Borsh-like manual encoding.
// Borsh is a binary serialization format used by Anchor programs on Solana.
// These helpers are NOT using an actual Borsh library — they're manual Buffer operations.
// Yes, this is fragile. Yes, it matches the program's exact expected layout. Don't touch it.

/**
 * Computes the 8-byte Anchor instruction discriminator for a given instruction name.
 * Anchor uses the first 8 bytes of SHA-256("global:{instructionName}") as a discriminator.
 * This tells the program which instruction handler to invoke when it receives the transaction.
 * (It's a bit like a method ID in Solidity. But different. And with SHA-256.)
 */
async function anchorDiscriminator(name: string): Promise<Buffer> {
  const preimage = new TextEncoder().encode(`global:${name}`)
  const hash = await crypto.subtle.digest('SHA-256', preimage)
  return Buffer.from(new Uint8Array(hash).slice(0, 8))
}

/** Encodes a BigInt as a little-endian unsigned 64-bit integer (8 bytes). */
function encodeU64LE(v: bigint): Buffer { const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b }

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Encodes a BigInt as a little-endian signed 64-bit integer (8 bytes). Used for Unix timestamps. */
function encodeI64LE(v: bigint): Buffer { const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b }

/**
 * Encodes an optional i64 in Rust's Option<i64> format.
 * None → 0x00 (1 byte)
 * Some(v) → 0x01 + encodeI64LE(v) (9 bytes total)
 * Used for endTime — a collection without an end time sends None, not 0.
 */
function encodeOptionI64(v: bigint | null): Buffer {
  return v === null ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), encodeI64LE(v)])
}

/**
 * Builds the instruction data for the update_config() on-chain instruction.
 * The byte layout matches the Rust struct exactly — order matters, types matter, everything matters.
 * Get one byte wrong and the program panics with a cryptic error that takes 45 minutes to debug.
 * (Ask Juan about the time the optionI64 None was encoded as 8 zero bytes. Don't ask Juan about that.)
 */
async function buildUpdateConfigData(p: {
  maxSupply: bigint
  pricePerNft: bigint
  startTime: bigint
  endTime: bigint | null
  mintLimitPerWallet: number | null
  metadataStandardVariant: number
}): Promise<Buffer> {
  const disc = await anchorDiscriminator('update_config')

  // Mint limit: None → 0x00, Some(n) → 0x01 + single byte for the u8 limit value
  const limitBuf = p.mintLimitPerWallet != null
    ? Buffer.concat([Buffer.from([0x01]), Buffer.from([p.mintLimitPerWallet])])
    : Buffer.from([0x00])

  // Concatenate all fields in the exact order the Rust struct expects them
  return Buffer.concat([
    disc,                                          // 8 bytes — instruction discriminator
    encodeU64LE(p.maxSupply),                     // 8 bytes — max token supply
    encodeU64LE(p.pricePerNft),                   // 8 bytes — price in lamports
    encodeI64LE(p.startTime),                     // 8 bytes — mint start Unix timestamp
    encodeOptionI64(p.endTime),                   // 1 or 9 bytes — optional end timestamp
    limitBuf,                                      // 1 or 2 bytes — optional mint limit per wallet
    Buffer.from([p.metadataStandardVariant]),     // 1 byte — metadata standard enum variant
    Buffer.from([0x00]),                           // 1 byte — freeze_trading_until_date: None
    Buffer.from([0x00]),                           // 1 byte — freeze_trading_until_sold_out: false
  ])
}

/**
 * Builds the instruction data for pause() or resume() — just the 8-byte discriminator.
 * No arguments — these instructions are pure control flow on the program side.
 */
async function buildPauseData(pausing: boolean): Promise<Buffer> {
  return anchorDiscriminator(pausing ? 'pause' : 'resume')
}

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * The on-chain config data fetched from the Solana program.
 * Stored as strings because BigInt doesn't serialize cleanly through our API layer.
 * (Yes, this means we parse strings back to BigInt before sending transactions. Annoying. Correct.)
 */
interface OnChainData {
  maxSupply:          string   // BigInt-as-string — the program stores this as u64
  price:              string   // Lamports as string — convert to SOL for display (/ 1e9)
  startTime:          string   // Unix timestamp as string
  endTime:            string   // Unix timestamp as string (may be 0 for no end date)
  mintLimitPerWallet: number   // u8 — 0 means no limit
  metadataStandard:   number   // Enum variant — needed when updating so we don't accidentally change it
  flags:              number   // Bitfield — frozen, paused, etc.
}

// SaveState: the four-state lifecycle for save operations in this form
// idle → saving → success | error → (back to idle after a while, or on next edit)
type SaveState = 'idle' | 'saving' | 'success' | 'error'

// ── Outer Guard — Wallet readiness check before rendering the inner component ──

/**
 * EditCollectionClient — The outer guard component.
 * Checks WalletReadyContext before rendering the inner form.
 * If the wallet provider isn't ready yet (first render, SSR, etc.), shows a prompt.
 * This prevents useWallet() from being called before the WalletProvider is mounted.
 * (Without this guard, you get a runtime error. We added this guard because we got the error.)
 */
export default function EditCollectionClient() {
  // walletReady is set to true by WalletReadyContext once the WalletProvider is mounted
  const walletReady = useContext(WalletReadyContext)

  if (!walletReady) {
    // Wallet adapter isn't ready yet — show a prompt instead of crashing
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
        <p className="text-dark-text-secondary">Connect your wallet to edit collections.</p>
      </div>
    )
  }

  // Wallet is ready — render the actual form component
  return <EditCollectionInner />
}

// ── Inner Component — Only rendered when WalletProvider is available ───────────

/**
 * EditCollectionInner — The actual collection editor.
 * Uses useWallet() safely (guard above ensures WalletProvider exists).
 * Manages a small battalion of state fields and two async save operations.
 */
function EditCollectionInner() {
  // Wallet state — publicKey is the connected wallet address, sendTransaction sends on-chain txs
  const { publicKey, sendTransaction } = useWallet()
  // RPC connection — used for getLatestBlockhash() and confirmTransaction()
  const { connection } = useConnection()
  // URL params — gets the collection ID from the route
  const params = useParams()
  // Router — for navigation (back to dashboard, etc.)
  const router = useRouter()
  // The collection ID from the URL — always a string in Next.js params
  const id = params?.id as string

  // The connected wallet address as a base58 string, or null if not connected
  const walletAddress = publicKey?.toBase58() ?? null

  // ── Data State ─────────────────────────────────────────────────────────────
  // The loaded collection from the database — null until loaded, null on 404
  const [collection, setCollection]   = useState<NFTCollection | null>(null)
  // The on-chain config — null until loaded (only loads if mintAddress exists)
  const [onChain,    setOnChain]      = useState<OnChainData | null>(null)
  // Loading flag — true while the initial data fetch is in-flight
  const [loading,    setLoading]      = useState(true)
  // Error message — non-null if the initial fetch failed
  const [error,      setError]        = useState<string | null>(null)

  // ── Section A State — Off-chain collection info ────────────────────────────
  // These fields save to the database only. No blockchain interaction required.
  const [name,           setName]           = useState('')
  const [description,    setDescription]    = useState('')
  const [imageFile,      setImageFile]      = useState<File | null>(null)   // New PFP file, if user picked one
  const [imagePreview,   setImagePreview]   = useState<string | null>(null) // Object URL for preview
  const [bannerFile,     setBannerFile]     = useState<File | null>(null)   // New banner file, if user picked one
  const [bannerPreview,  setBannerPreview]  = useState<string | null>(null) // Object URL for preview
  const [twitterUrl,     setTwitterUrl]     = useState('')
  const [discordUrl,     setDiscordUrl]     = useState('')
  const [websiteUrl,     setWebsiteUrl]     = useState('')
  const [royaltyPct,     setRoyaltyPct]     = useState(0)   // Stored as %, internally converted to basis points on save
  const [infoState,      setInfoState]      = useState<SaveState>('idle')
  const [infoMsg,        setInfoMsg]        = useState('')   // Status message shown below the save button

  // ── Section B State — On-chain mint config ─────────────────────────────────
  // These fields require a wallet signature. They go on-chain via the Solana program.
  const [mintPrice,     setMintPrice]     = useState<number | ''>('')  // SOL amount — '' when free
  const [freeMint,      setFreeMint]      = useState(false)             // Checkbox: is this a free mint?
  const [maxSupply,     setMaxSupply]     = useState<number | ''>('')   // Total supply cap
  const [startDate,     setStartDate]     = useState('')                // ISO datetime-local string
  const [endDate,       setEndDate]       = useState('')                // ISO datetime-local string (optional)
  const [maxPerWallet,  setMaxPerWallet]  = useState<number | ''>('')   // Wallet mint limit (optional)
  const [mintState,     setMintState]     = useState<SaveState>('idle')
  const [mintMsg,       setMintMsg]       = useState('')

  // ── Pause Toggle State ─────────────────────────────────────────────────────
  // Whether minting is currently paused — determines which transaction to send
  const [isPaused,    setIsPaused]    = useState(false)
  const [pauseState,  setPauseState]  = useState<SaveState>('idle')

  // ── Data Loading ───────────────────────────────────────────────────────────

  /**
   * Load collection data on mount (or when ID changes).
   * Fetches the collection from the database, populates form fields,
   * then optionally fetches on-chain data if a mintAddress exists.
   * (No mintAddress = not deployed yet. On-chain section shows a warning.)
   */
  useEffect(() => {
    if (!id) return  // No ID, no fetch. This shouldn't happen in practice.
    setLoading(true)

    Promise.all([
      collectionsApi.getById(id),
    ]).then(async ([colRes]) => {
      if (!colRes.success || !colRes.data) {
        setError('Collection not found')
        return
      }
      const col = colRes.data
      setCollection(col)

      // ── Populate Section A fields from the loaded collection ──
      setName(col.name)
      setDescription(col.description)
      setImagePreview(col.imageUrl || null)    // Show existing image in preview area
      setBannerPreview(col.bannerUrl || null)  // Show existing banner in preview area
      setTwitterUrl(col.twitterUrl ?? '')
      setDiscordUrl(col.discordUrl ?? '')
      setWebsiteUrl(col.websiteUrl ?? '')
      // Convert basis points to display percentage — 500bp = 5.0%
      setRoyaltyPct((col.royaltyBasisPoints ?? 0) / 100)

      // ── Populate Section B fields from the loaded collection ──
      setMintPrice(col.price ?? '')
      setFreeMint((col.price ?? 0) === 0)  // Free mint if price is 0 or not set
      setMaxSupply(col.totalSupply || '')

      // Use the first phase's startDateTime and last phase's endDateTime for the date fields
      // (Simplification: we only surface the overall start/end range here, not per-phase dates)
      const firstPhase = col.phases?.[0]
      const lastPhase  = col.phases?.at(-1)
      if (firstPhase?.startDateTime) setStartDate(toLocalInput(firstPhase.startDateTime))
      if (lastPhase?.endDateTime)    setEndDate(toLocalInput(lastPhase.endDateTime))

      // Initialize pause state from collection status
      setIsPaused(col.status === 'paused')

      // ── Fetch on-chain data if the collection has a mint address ──
      // This requires a separate API call to the Solana program's state.
      // If it fails, we show a warning but don't block the rest of the form.
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
        }
      }
    }).finally(() => setLoading(false))
  }, [id])

  // ── Section A: Save Off-Chain Info ─────────────────────────────────────────

  /**
   * Saves the collection's off-chain info to the database.
   * Uploads any new image files to IPFS first, then calls the update API.
   * Does NOT require a wallet signature — this is just a database write.
   * (The distinction matters. Off-chain is fast. On-chain requires user interaction.)
   */
  const handleSaveInfo = useCallback(async () => {
    if (!collection || !walletAddress) return  // Sanity guard — can't save without these
    setInfoState('saving')
    setInfoMsg('')

    try {
      // Preserve existing URLs as fallback — only update if a new file was picked
      let imageUrl  = collection.imageUrl
      let bannerUrl = collection.bannerUrl

      // Upload new PFP to IPFS if the user selected a new file
      if (imageFile) {
        const r = await uploadImageToIpfs(imageFile)
        if (r.success && r.data) imageUrl = r.data.uri
      }
      // Upload new banner to IPFS if the user selected a new file
      if (bannerFile) {
        const r = await uploadImageToIpfs(bannerFile)
        if (r.success && r.data) bannerUrl = r.data.uri
      }

      // Send the update to the database — all off-chain fields in one call
      const res = await collectionsApi.update(collection?.id ?? id, {
        creatorAddress: walletAddress,  // Used to verify ownership on the backend
        name,
        description,
        imageUrl,
        bannerUrl,
        twitterUrl:     twitterUrl || undefined,   // Empty strings → undefined (no empty links in DB)
        discordUrl:     discordUrl || undefined,
        websiteUrl:     websiteUrl || undefined,
        royaltyPercent: royaltyPct,
      })

      if (!res.success) throw new Error(res.error ?? 'Update failed')

      // Update local collection state with the response — keeps the preview in sync
      setCollection(res.data!)
      setInfoState('success')
      setInfoMsg('Collection info saved.')
    } catch (e) {
      setInfoState('error')
      setInfoMsg(e instanceof Error ? e.message : 'Failed to save')
    }
  }, [collection, walletAddress, id, name, description, imageFile, bannerFile,
      twitterUrl, discordUrl, websiteUrl, royaltyPct])

  // ── Section B: Update On-Chain Mint Config ────────────────────────────────

  /**
   * Sends an update_config instruction to the Solana program.
   * Builds the Borsh-encoded instruction data, constructs a transaction, sends it,
   * waits for confirmation, then syncs the result back to the database.
   * This is the most complex operation in this file. It's also the most important one.
   * (If it fails, check the program ID, the PDA derivation, and the account order.)
   */
  const handleUpdateOnChain = useCallback(async () => {
    // All of these must exist before we attempt anything
    if (!collection?.mintAddress || !walletAddress || !publicKey) return
    if (!onChain) { setMintMsg('On-chain data not loaded yet — try again.'); return }

    setMintState('saving')
    setMintMsg('')

    try {
      // Fetch the chain config (program ID, etc.) for the current network
      const cfg = await getChainConfig()
      const programPubkey = new PublicKey(cfg.programId)

      // Derive the collection PDA — "collection" seed + mint address
      // This must match the program's PDA derivation exactly or the transaction fails
      const [collectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection'), new PublicKey(collection.mintAddress).toBuffer()],
        programPubkey,
      )

      // Convert SOL price to lamports (1 SOL = 1e9 lamports)
      // Free mint → 0 lamports (no negotiation on this one)
      const priceLamports = freeMint
        ? 0n
        : BigInt(Math.round((typeof mintPrice === 'number' ? mintPrice : 0) * 1e9))

      const nowTs = BigInt(Math.floor(Date.now() / 1000))

      // Convert start date string to Unix timestamp
      // If no start date provided, default to "now + 10 seconds" — safe, immediate, intentional
      const startTs = startDate
        ? BigInt(Math.floor(new Date(startDate).getTime() / 1000))
        : nowTs + 10n

      // Convert end date string to Unix timestamp — null means no end (infinite mint window)
      const endTs = endDate
        ? BigInt(Math.floor(new Date(endDate).getTime() / 1000))
        : null

      // Use current form value for supply, fall back to on-chain value if form is empty
      const supply = typeof maxSupply === 'number' && maxSupply > 0
        ? BigInt(maxSupply)
        : BigInt(onChain.maxSupply)

      // Same for max per wallet — null means no limit
      const limit = typeof maxPerWallet === 'number' && maxPerWallet > 0
        ? maxPerWallet
        : null

      // Build the Borsh-encoded instruction data for update_config()
      const ixData = await buildUpdateConfigData({
        maxSupply:               supply,
        pricePerNft:             priceLamports,
        startTime:               startTs,
        endTime:                 endTs,
        mintLimitPerWallet:      limit,
        // Preserve the existing metadata standard variant — we're not changing this here
        metadataStandardVariant: onChain.metadataStandard,
      })

      // Construct the TransactionInstruction
      const ix = new TransactionInstruction({
        programId: programPubkey,
        keys: [
          { pubkey: collectionPda, isSigner: false, isWritable: true },  // The PDA being updated
          { pubkey: publicKey,     isSigner: true,  isWritable: false }, // The authority (must be creator)
        ],
        data: ixData,
      })

      // Get a fresh blockhash — transactions expire if not confirmed within ~150 blocks (~60s)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      const tx = new Transaction()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey
      tx.add(ix)

      // Send the transaction — prompts the user's wallet for a signature
      const sig = await sendTransaction(tx, connection)

      // Wait for confirmation — 'confirmed' commitment = included in a confirmed block
      await pollForConfirmation(connection, sig, blockhash, lastValidBlockHeight)

      // Sync the new config back to the database — the source of truth needs to stay current
      const resolvedPrice = typeof mintPrice === 'number' ? mintPrice : undefined
      await collectionsApi.update(collection?.id ?? id, {
        creatorAddress: walletAddress,
        price:     freeMint ? 0 : resolvedPrice,
        mintStart: startDate ? new Date(startDate).toISOString() : undefined,
        endDate:   endDate   ? new Date(endDate).toISOString()   : undefined,
      })

      setMintState('success')
      setMintMsg(`On-chain config updated! Tx: ${sig.slice(0, 16)}…`)  // Show first 16 chars of tx sig
    } catch (e) {
      setMintState('error')
      setMintMsg(e instanceof Error ? e.message : 'Transaction failed')
    }
  }, [collection, walletAddress, publicKey, onChain, freeMint, mintPrice,
      maxSupply, startDate, endDate, maxPerWallet, id, connection, sendTransaction])

  // ── Pause / Resume Handler ────────────────────────────────────────────────

  /**
   * Toggles the collection's minting status between paused and active.
   * Sends a pause() or resume() instruction to the Solana program.
   * No data arguments — just the discriminator. Pure control flow.
   * (Pause when things go wrong. Resume when things go right. Simple philosophy.)
   */
  const handleTogglePause = useCallback(async () => {
    if (!collection?.mintAddress || !walletAddress || !publicKey) return
    setPauseState('saving')

    try {
      const cfg = await getChainConfig()
      const programPubkey = new PublicKey(cfg.programId)

      // Same PDA derivation as update_config — consistent across all instructions
      const [collectionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection'), new PublicKey(collection.mintAddress).toBuffer()],
        programPubkey,
      )

      // Build pause() or resume() instruction data — just the discriminator, no args
      const ixData = await buildPauseData(!isPaused)  // !isPaused because we're toggling
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

      // Send and confirm
      const sig = await sendTransaction(tx, connection)
      await pollForConfirmation(connection, sig, blockhash, lastValidBlockHeight)

      // Toggle local state — UI updates immediately after confirmation
      setIsPaused(p => !p)
      setPauseState('idle')
    } catch (e) {
      // Don't expose the full error message — it's usually a hex dump. Not helpful to users.
      setPauseState('error')
    }
  }, [collection, walletAddress, publicKey, isPaused, connection, sendTransaction])

  // ── Image Picker Handler ──────────────────────────────────────────────────

  /**
   * Handles file input changes for PFP and banner images.
   * Creates an object URL for instant preview (no upload needed yet).
   * The actual upload happens in handleSaveInfo when the user clicks "Save Info".
   */
  function pickImage(e: React.ChangeEvent<HTMLInputElement>, type: 'pfp' | 'banner') {
    const file = e.target.files?.[0]
    if (!file) return
    // Create a temporary object URL for preview — no network request, just browser memory
    const url = URL.createObjectURL(file)
    // Store the file for upload later, and the URL for immediate preview
    if (type === 'pfp') { setImageFile(file); setImagePreview(url) }
    else                { setBannerFile(file); setBannerPreview(url) }
  }

  // ── Loading and Error Guards ──────────────────────────────────────────────

  // Loading state — show a spinner while the initial fetch is in-flight
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-dark-accent-primary" />
      </div>
    )
  }

  // Error or missing collection state — show message and a way back to safety
  if (error || !collection) {
    return (
      <div className="min-h-screen bg-dark-bg-primary flex flex-col items-center justify-center gap-4">
        <p className="text-dark-text-secondary">{error ?? 'Collection not found'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  // Ownership check — non-owners can see the form but can't save anything
  const isOwner = collection.creatorAddress === walletAddress

  // Maps collection status to Tailwind classes for color-coded badges
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-bg-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── Left Sidebar ─────────────────────────────────────────────────────
              Sticky on desktop — back link, collection heading, status, and live preview.
              Mirrors the sidebar pattern from CreatePageContent for consistent design language. */}
          <div className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24 lg:self-start space-y-6">

            {/* Back link — text style mirrors CreatePageContent's "← Collections" link */}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-dark-text-tertiary hover:text-dark-text-primary transition-colors"
            >
              ← Dashboard
            </button>

            {/* Collection heading + status — name updates live as the user edits it */}
            <div>
              <h1 className="text-xl font-bold text-dark-text-primary leading-tight">{name || collection.name}</h1>
              <p className="text-sm text-dark-text-tertiary mt-0.5">Edit Collection</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(collection.status)}`}>
                {collection.status}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-dark-border-primary" />

            {/* Live preview card — image updates instantly when the user swaps the PFP */}
            <div className="rounded-xl overflow-hidden border border-dark-border-primary">
              {/* Square image area — shows the PFP preview or a Layers placeholder */}
              <div className="aspect-square bg-dark-bg-secondary flex items-center justify-center overflow-hidden">
                {imagePreview
                  ? <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
                  : <Layers className="w-10 h-10 text-dark-text-tertiary" />}
              </div>
              {/* Metadata strip below the image */}
              <div className="bg-dark-bg-secondary border-t border-dark-border-primary p-3 space-y-1.5">
                <p className="text-sm font-medium text-dark-text-primary truncate">{name || 'Untitled Collection'}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-dark-bg-tertiary text-dark-text-tertiary border border-dark-border-primary">Solana</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadgeClass(collection.status)}`}>{collection.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Main Content ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Ownership warning — shown when the connected wallet is not the creator */}
            {!isOwner && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                You are not the owner of this collection.
              </div>
            )}

            {/* ── Section A: Collection Info ─────────────────────────────────── */}
            <section className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-dark-text-primary">Collection Info</h2>
                <p className="text-xs text-dark-text-tertiary mt-0.5">Saved directly to the database — no wallet signature needed.</p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary resize-none"
                  />
                </div>

                {/* Image Upload Grid — PFP + Banner */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">PFP Image</label>
                    <label className="flex flex-col items-center justify-center h-32 rounded-lg border border-dashed border-dark-border-primary bg-dark-bg-primary cursor-pointer hover:bg-dark-bg-tertiary transition-colors overflow-hidden">
                      {imagePreview
                        ? <img src={imagePreview} alt="PFP" className="w-full h-full object-cover" />
                        : <span className="text-xs text-dark-text-tertiary">Click to upload</span>}
                      <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'pfp')} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">Banner</label>
                    <label className="flex flex-col items-center justify-center h-32 rounded-lg border border-dashed border-dark-border-primary bg-dark-bg-primary cursor-pointer hover:bg-dark-bg-tertiary transition-colors overflow-hidden">
                      {bannerPreview
                        ? <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                        : <span className="text-xs text-dark-text-tertiary">Click to upload</span>}
                      <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e, 'banner')} />
                    </label>
                  </div>
                </div>

                {/* Royalty % */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Royalty %</label>
                  <input
                    type="number" min={0} max={50} step={0.5}
                    value={royaltyPct}
                    onChange={e => setRoyaltyPct(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>

                {/* Social links — Twitter, Discord, Website */}
                {[
                  { label: 'Twitter', value: twitterUrl, set: setTwitterUrl, placeholder: 'https://twitter.com/…' },
                  { label: 'Discord', value: discordUrl, set: setDiscordUrl, placeholder: 'https://discord.gg/…' },
                  { label: 'Website', value: websiteUrl, set: setWebsiteUrl, placeholder: 'https://…' },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">{label}</label>
                    <input
                      value={value}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary placeholder:text-dark-text-tertiary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
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
            </section>

            {/* ── Section B: Mint Configuration (On-Chain) ───────────────────── */}
            <section className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-dark-text-primary">Mint Configuration</h2>
                <p className="text-xs text-dark-text-tertiary mt-0.5">
                  Requires your wallet signature — changes go directly on-chain.
                  {!onChain && collection.mintAddress && (
                    <span className="ml-1 text-amber-400">Loading on-chain data…</span>
                  )}
                  {!collection.mintAddress && (
                    <span className="ml-1 text-amber-400">No on-chain address found — collection may not be deployed yet.</span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Price + Free checkbox */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Mint Price (SOL)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} step={0.01}
                      value={freeMint ? '' : mintPrice}
                      onChange={e => { setMintPrice(parseFloat(e.target.value) || ''); setFreeMint(false) }}
                      disabled={freeMint}
                      placeholder="0.00"
                      className="flex-1 rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary disabled:opacity-40"
                    />
                    <label className="flex items-center gap-1.5 text-sm text-dark-text-secondary cursor-pointer select-none">
                      <input type="checkbox" checked={freeMint} onChange={e => setFreeMint(e.target.checked)} className="rounded" />
                      Free
                    </label>
                  </div>
                </div>

                {/* Max Supply */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Max Supply</label>
                  <input
                    type="number" min={1} step={1}
                    value={maxSupply}
                    onChange={e => setMaxSupply(parseInt(e.target.value) || '')}
                    placeholder={onChain ? String(onChain.maxSupply) : '—'}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>

                {/* Mint Start */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Mint Start</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>

                {/* Mint End (optional) */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Mint End (optional)</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>

                {/* Max per Wallet (optional) */}
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-1">Max per Wallet (optional)</label>
                  <input
                    type="number" min={1} max={255} step={1}
                    value={maxPerWallet}
                    onChange={e => setMaxPerWallet(parseInt(e.target.value) || '')}
                    placeholder="No limit"
                    className="w-full rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 text-sm text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-dark-accent-primary"
                  />
                </div>
              </div>

              {!freeMint && typeof mintPrice === 'number' && mintPrice > 0 && (
                <p className="text-xs text-dark-text-tertiary">
                  Buyers will pay <span className="text-dark-text-primary font-medium">{(mintPrice * 1.01).toFixed(4)} SOL</span>
                  {' '}— you receive {mintPrice} SOL (1% goes to NeXus)
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
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
                {mintMsg && (
                  <span className={`text-sm flex items-center gap-1 break-all ${mintState === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {mintState === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {mintMsg}
                  </span>
                )}
              </div>
            </section>

            {/* ── Section C: Minting Status (Pause / Resume) ─────────────────── */}
            <section className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary p-6">
              <h2 className="text-lg font-semibold text-dark-text-primary mb-1">Minting Status</h2>
              <p className="text-xs text-dark-text-tertiary mb-4">
                {isPaused ? 'Minting is currently paused.' : 'Minting is currently active.'}
                {' '}Requires wallet signature.
              </p>
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
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because collection creators deserve a control panel, not a prayer circle.
// (Borsh encoding. PDA derivation. Buffer.concat. It all works. Don't touch it.)
// ─────────────────────────────────────────────────────────────────────────────
