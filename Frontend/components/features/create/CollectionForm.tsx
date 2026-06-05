'use client'

/**
 * CollectionForm - Step 1: The sacred ritual of naming your collection.
 * Name, symbol, description, NFT standard, PFP + banner upload, royalty config, social links.
 * Validates required fields natively (we chose custom validation because browser popups
 * look like they were designed during the dial-up era).
 * Calls onNext to advance the wizard. If only advancing in life were this easy.
 *
 * Two columns on desktop. Drag-and-drop. Ratio warnings. A royalty progress bar.
 * We built the Ritz when the brief said "a form". No regrets.
 * (Seriously though — fill it out. All of it. The blockchain is watching.)
 *
 * @author Juan - The developer who gave this form a second column, drag-and-drop,
 * a progress bar, AND social links because apparently one form wasn't enough.
 * (Coded with care, humor, and a deeply unhealthy attachment to UX polish.)
 */

// React's greatest hits — refs for file inputs, state for everything,
// effects for object URL lifecycle, callbacks for validation.
// If you remove any of these, something catches fire. Pick your poison.
import { useRef, useState, useEffect, useCallback } from 'react'

// Icons — Upload (the optimistic arrow), AlertCircle (the voice of doom),
// Wallet (the gatekeeper), ArrowRight (the promise of progress),
// Percent (royalty vibes), Link (social link section).
// Each one earns its keep. No decorative icons here.
import { Upload, AlertCircle, Wallet, ArrowRight, Percent, Link } from 'lucide-react'

// Button — the shared component that makes all our CTAs look consistent.
// navigationUtils — goBack without reaching for window.history like it's 2009.
import Button from '@/components/ui/Button'
import { navigationUtils } from '@/lib/event-handlers'

// MetadataStandard — Core | Legacy | Compressed | Programmable.
// The user picks one. The blockchain enforces it forever. No pressure.
import type { MetadataStandard } from '@/hooks/useCreateCollectionForm'

// ── Props interface ────────────────────────────────────────────────────────────
// Twenty-two props. Yes, twenty-two. This is Step 1 of a 4-step wizard.
// The parent owns all state. This component is pure UI.
// We're not apologizing for the prop count. (We're a little apologetic about it.)
interface CollectionFormProps {
  collectionName:    string
  setCollectionName: (v: string) => void
  symbol:            string
  setSymbol:         (v: string) => void
  description:       string
  setDescription:    (v: string) => void
  // File | null — null means "not uploaded yet". Null is not a crime. Yet.
  imageFile:         File | null
  setImageFile:      (f: File | null) => void
  bannerFile:        File | null
  setBannerFile:     (f: File | null) => void
  // NFT standard — the one choice that echoes through eternity (and Metaplex docs)
  metadataStandard:  MetadataStandard
  setMetadataStandard: (v: MetadataStandard) => void
  // Royalty — 0 to 10%. Capped. We're reasonable people.
  royaltyPercent:    number
  setRoyaltyPercent: (v: number) => void
  // Royalty wallet — where the secondary sale magic lands. Default to connected wallet.
  royaltyWallet:     string
  setRoyaltyWallet:  (v: string) => void
  // Social links — optional, but present on collection pages. Don't skip them.
  twitterUrl:        string
  setTwitterUrl:     (v: string) => void
  discordUrl:        string
  setDiscordUrl:     (v: string) => void
  websiteUrl:        string
  setWebsiteUrl:     (v: string) => void
  // Wallet gate — disabled submit if wallet not connected. We're enforcing this.
  isConnected:       boolean
  walletAddress:     string | null
  // onNext — advances the wizard. Also validates first. We check, then advance.
  onNext:            (e: React.FormEvent<HTMLFormElement>) => void
}

export default function CollectionForm({
  collectionName, setCollectionName,
  symbol,         setSymbol,
  description,    setDescription,
  imageFile,      setImageFile,
  bannerFile,     setBannerFile,
  metadataStandard, setMetadataStandard,
  royaltyPercent, setRoyaltyPercent,
  royaltyWallet,  setRoyaltyWallet,
  twitterUrl,     setTwitterUrl,
  discordUrl,     setDiscordUrl,
  websiteUrl,     setWebsiteUrl,
  isConnected,    walletAddress,
  onNext,
}: CollectionFormProps) {

  // Hidden file inputs — we trigger them programmatically so we control the UI.
  // Native file inputs are hideous. We've made peace with this workaround.
  const pfpInputRef    = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Drag-over states — purely cosmetic but essential for that "I can drop here" feeling.
  // Without them the drop zone just sits there, dead-eyed, saying nothing.
  const [pfpDragOver,    setPfpDragOver]    = useState(false)
  const [bannerDragOver, setBannerDragOver] = useState(false)

  // Object URL previews — created here, revoked in the useEffect cleanup.
  // Forget to revoke them and you've got a memory leak. A tiny one. But still.
  const [pfpPreviewUrl,    setPfpPreviewUrl]    = useState<string | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)

  // Ratio warnings — amber text that appears when the image is wildly off-spec.
  // We don't block upload. We just let them know. Gently. Like a disappointed parent.
  const [pfpRatioWarn,    setPfpRatioWarn]    = useState<string | null>(null)
  const [bannerRatioWarn, setBannerRatioWarn] = useState<string | null>(null)

  // Custom validation — because browser validation popovers look different
  // on every OS and speak whatever language the OS is set to.
  // We validate ourselves. Better UX. More code. Worth it.
  const [errors,  setErrors]  = useState<{ name?: string; symbol?: string; description?: string }>({})

  // touched — tracks which fields the user has interacted with.
  // We only show errors after touching a field OR after a submit attempt.
  // Nobody likes being yelled at the moment they open a form.
  const [touched, setTouched] = useState<{ name: boolean; symbol: boolean; description: boolean }>({ name: false, symbol: false, description: false })

  // validate — pure function, no side effects.
  // Name, symbol, description — all required. That's the minimum viable collection.
  const validate = useCallback((name: string, sym: string, desc: string) => {
    const e: { name?: string; symbol?: string; description?: string } = {}
    if (!name.trim())   e.name        = 'Collection name is required'
    if (!sym.trim())    e.symbol      = 'Symbol is required'
    if (!desc.trim())   e.description = 'Description is required'
    return e
  }, [])

  // PFP preview effect — create object URL on imageFile change, revoke on cleanup.
  // The return function is the cleanup. React calls it before re-running the effect.
  // This is one of the few times useEffect's API is actually elegant.
  useEffect(() => {
    if (!imageFile) { setPfpPreviewUrl(null); return }
    const url = URL.createObjectURL(imageFile)
    setPfpPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  // Banner preview effect — same pattern as PFP. DRY would say "extract this".
  // We say "it's two effects, leave it alone."
  useEffect(() => {
    if (!bannerFile) { setBannerPreviewUrl(null); return }
    const url = URL.createObjectURL(bannerFile)
    setBannerPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bannerFile])

  // Auto-derive symbol from name — first 4 chars, uppercase, only when symbol is empty.
  // This saves users the cognitive load of typing "MYCOL" after typing "My Collection".
  // If they've typed their own symbol, we don't overwrite it. We have manners.
  useEffect(() => {
    if (!symbol) setSymbol(collectionName.trim().slice(0, 4).toUpperCase())
  }, [collectionName, symbol, setSymbol])

  // getImageRatio — loads an Image element in memory, measures it, reports width/height.
  // We can't use a CSS trick here. We need actual pixel dimensions. Hence the canvas trick.
  // onError resolves with 1 (square) so we don't crash when the browser hates the file.
  function getImageRatio(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img.naturalWidth / img.naturalHeight) }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(1) }
      img.src = url
    })
  }

  // handlePfpChange — file input onChange handler.
  // Sets the file, warns if it's not close to 1:1.
  // 15% tolerance because nobody crops pixel-perfectly and we're not monsters.
  async function handlePfpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    if (!file) { setPfpRatioWarn(null); return }
    const ratio = await getImageRatio(file)
    setPfpRatioWarn(Math.abs(ratio - 1) > 0.15 ? 'Best with a 1:1 square image — it will be cropped.' : null)
  }

  // handleBannerChange — same logic, but for 16:6 banners.
  // 16/6 ≈ 2.667. Anything within 15% of that is fine. Anything outside gets a warning.
  // Nobody uploads a perfectly 16:6 banner on the first try. The warning is our way of saying "hey".
  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setBannerFile(file)
    if (!file) { setBannerRatioWarn(null); return }
    const ratio = await getImageRatio(file)
    const target = 16 / 6
    setBannerRatioWarn(Math.abs(ratio - target) / target > 0.15 ? 'Best with a 16:6 wide image — it will be cropped.' : null)
  }

  // handlePfpDrop — drag-and-drop handler for the PFP zone.
  // We check file.type to reject non-images. The drop zone only accepts images.
  // This prevents the "oops I dropped my entire Downloads folder" situation.
  async function handlePfpDrop(e: React.DragEvent) {
    e.preventDefault(); setPfpDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const ratio = await getImageRatio(file)
    setPfpRatioWarn(Math.abs(ratio - 1) > 0.15 ? 'Best with a 1:1 square image — it will be cropped.' : null)
  }

  // handleBannerDrop — same drag-and-drop pattern, wider ratio target.
  // The 16/6 target came from design. We didn't pick it. We just enforce it.
  async function handleBannerDrop(e: React.DragEvent) {
    e.preventDefault(); setBannerDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (!file || !file.type.startsWith('image/')) return
    setBannerFile(file)
    const ratio = await getImageRatio(file)
    const target = 16 / 6
    setBannerRatioWarn(Math.abs(ratio - target) / target > 0.15 ? 'Best with a 16:6 wide image — it will be cropped.' : null)
  }

  // handleSubmit — the moment of truth.
  // Force-touch all fields so errors appear even if the user clicked Next without typing anything.
  // Validate synchronously. If errors exist, bail out. Otherwise hand off to onNext.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Force-touch all fields — the user clicked Next without engaging with the form.
    // We're not going to let them off that easy.
    setTouched({ name: true, symbol: true, description: true })
    const errs = validate(collectionName, symbol, description)
    setErrors(errs)
    // If there are errors, we stop here. The user must face their choices.
    if (Object.keys(errs).length > 0) return
    onNext(e)
  }

  return (
    // noValidate — disables browser's native validation popups.
    // We handle all validation ourselves. Much nicer. Much more work.
    <form onSubmit={handleSubmit} noValidate className="space-y-7">

      {/* ── Section header ────────────────────────────────────────────────── */}
      {/* The title. Sets expectations. "Collection Details" — nothing ambiguous here. */}
      <div>
        <h2 className="text-lg font-semibold text-dark-text-primary">Collection Details</h2>
        <p className="text-sm text-dark-text-tertiary mt-1">
          Name your drop, write a description, and set up royalties.
        </p>
      </div>

      {/* ── Wallet gate ───────────────────────────────────────────────────── */}
      {/* Only shows when wallet is not connected. The warning is gentle.
          We're not yelling. We're just... indicating. With an icon. */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-bg-secondary border border-dark-border-primary text-sm">
          <Wallet className="w-4 h-4 shrink-0 text-dark-accent-warning" />
          <span className="text-dark-text-secondary">Connect your wallet to create a collection.</span>
        </div>
      )}

      {/* ── Name + Symbol ─────────────────────────────────────────────────── */}
      {/* Two columns because name and symbol belong together — soulmates, really.
          Symbol auto-derives from name until the user types their own.
          Max 64 chars for name, 10 for symbol. The blockchain has opinions about length. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="create-collection-name" className="block text-sm font-medium text-dark-text-secondary mb-2">
            Collection Name <span className="text-dark-accent-error text-xs">required</span>
          </label>
          {/* onChange: update state + clear/set error if already touched. Live feedback.
              onBlur: mark as touched + validate. First-touch error reveal. */}
          <input
            id="create-collection-name"
            type="text"
            value={collectionName}
            onChange={(e) => { setCollectionName(e.target.value); if (touched.name) setErrors(prev => ({ ...prev, name: e.target.value.trim() ? undefined : 'Collection name is required' })) }}
            onBlur={() => { setTouched(t => ({ ...t, name: true })); setErrors(prev => ({ ...prev, name: collectionName.trim() ? undefined : 'Collection name is required' })) }}
            placeholder="My Awesome Collection"
            maxLength={64}
            aria-invalid={!!errors.name}
            className={`w-full px-4 py-2.5 bg-dark-bg-secondary border rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-1 transition-colors ${errors.name ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-dark-border-primary focus:border-dark-accent-primary/50 focus:ring-dark-accent-primary/20'}`}
          />
          {/* Error message — red, small, with icon. Firm but not hostile. */}
          {errors.name && <p className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="create-symbol" className="block text-sm font-medium text-dark-text-secondary mb-2">
            Symbol <span className="text-dark-accent-error text-xs">required</span>
          </label>
          {/* Symbol is always uppercase. We enforce this on change, not on blur.
              Max 10 chars. MYCOL is 5. Leave the other 5 for your creativity. */}
          <input
            id="create-symbol"
            type="text"
            value={symbol}
            onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 10); setSymbol(v); if (touched.symbol) setErrors(prev => ({ ...prev, symbol: v.trim() ? undefined : 'Symbol is required' })) }}
            onBlur={() => { setTouched(t => ({ ...t, symbol: true })); setErrors(prev => ({ ...prev, symbol: symbol.trim() ? undefined : 'Symbol is required' })) }}
            placeholder="MYCOL"
            maxLength={10}
            aria-invalid={!!errors.symbol}
            className={`w-full px-4 py-2.5 bg-dark-bg-secondary border rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-1 transition-colors uppercase ${errors.symbol ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-dark-border-primary focus:border-dark-accent-primary/50 focus:ring-dark-accent-primary/20'}`}
          />
          {errors.symbol && <p className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.symbol}</p>}
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      {/* Full-width textarea. 4 rows. resize-none because we control the layout here.
          "Why collectors should care" — because that's the actual question they're answering. */}
      <div>
        <label htmlFor="create-description" className="block text-sm font-medium text-dark-text-secondary mb-2">
          Description <span className="text-dark-accent-error text-xs">required</span>
        </label>
        <textarea
          id="create-description"
          value={description}
          onChange={(e) => { setDescription(e.target.value); if (touched.description) setErrors(prev => ({ ...prev, description: e.target.value.trim() ? undefined : 'Description is required' })) }}
          onBlur={() => { setTouched(t => ({ ...t, description: true })); setErrors(prev => ({ ...prev, description: description.trim() ? undefined : 'Description is required' })) }}
          placeholder="Describe your collection — what it is, what it means, why collectors should care."
          rows={4}
          aria-invalid={!!errors.description}
          className={`w-full px-4 py-2.5 bg-dark-bg-secondary border rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:ring-1 transition-colors resize-none ${errors.description ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-dark-border-primary focus:border-dark-accent-primary/50 focus:ring-dark-accent-primary/20'}`}
        />
        {errors.description && <p className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.description}</p>}
      </div>

      {/* ── NFT Standard ──────────────────────────────────────────────────── */}
      {/* Four options: Core, Legacy, Compressed, Programmable.
          Each is a button card with an icon, label, sub-label, hint, and optional tag.
          "Recommended" tag on Core because Metaplex said so. We trust Metaplex. Mostly. */}
      <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-3">NFT Standard</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            {
              // Core — the modern choice. Lowest fees. Metaplex's current obsession.
              value: 'Core', label: 'Core', sub: 'Metaplex', hint: 'Modern & lightweight. Lowest fees.', tag: 'Recommended',
              color: 'text-[#00d4ff]', activeBorder: 'border-[#00d4ff] bg-[#00d4ff]/6',
              icon: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m/logo.png" alt="Metaplex" className="w-5 h-5 rounded-full object-cover" />,
            },
            {
              // Legacy — the classic. Compatible with everything. Nostalgic.
              // Like vinyl records, but for NFTs.
              value: 'Legacy', label: 'Legacy', sub: 'Token Metadata', hint: 'Traditional. Supported everywhere.', tag: null,
              color: 'text-[#9945FF]', activeBorder: 'border-[#9945FF] bg-[#9945FF]/6',
              icon: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m/logo.png" alt="Metaplex" className="w-5 h-5 rounded-full object-cover opacity-80" style={{ filter: 'hue-rotate(280deg) saturate(1.4)' }} />,
            },
            {
              // Compressed — lowest cost possible. 10,000-item drops live here.
              // If you're minting an army, you're picking this one.
              value: 'Compressed', label: 'Compressed', sub: 'cNFT', hint: 'Lowest cost. Best for large drops.', tag: null,
              color: 'text-[#E42575]', activeBorder: 'border-[#E42575] bg-[#E42575]/6',
              icon: <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><polygon points="10,1 19,10 10,19 1,10" fill="#E42575" /><text x="10" y="14" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="system-ui,sans-serif">C</text></svg>,
            },
            {
              // Programmable — on-chain royalty enforcement. The nuclear option.
              // Marketplaces can't skip your royalties. Respect the hustle.
              value: 'Programmable', label: 'Programmable', sub: 'pNFT', hint: 'On-chain royalty enforcement.', tag: null,
              color: 'text-[#F97316]', activeBorder: 'border-[#F97316] bg-[#F97316]/6',
              icon: <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2 L17 5 L17 10 C17 14 13.5 17.5 10 18.5 C6.5 17.5 3 14 3 10 L3 5 Z" fill="#F97316" /><text x="10" y="14" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="system-ui,sans-serif">P</text></svg>,
            },
          ] as const).map(({ value, label, sub, hint, tag, color, activeBorder, icon }) => {
            // active — drives border color and background tint. Each standard has its own palette.
            const active = metadataStandard === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMetadataStandard(value)}
                className={[
                  'relative flex flex-col gap-2.5 px-3 pt-3.5 pb-3 rounded-xl border text-left transition-all',
                  // Active: accent border + subtle bg tint. Inactive: default border, hover highlight.
                  active ? activeBorder : 'border-dark-border-primary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-tertiary',
                ].join(' ')}
              >
                {/* Recommended tag — absolute top-right. Only Core gets this honor. */}
                {tag && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                )}
                {/* Standard icon — unique per standard. Visual identity at a glance. */}
                {icon}
                <div>
                  <p className="text-xs font-bold text-dark-text-primary leading-tight">{label}</p>
                  <p className={`text-[10px] font-semibold ${color} leading-tight`}>{sub}</p>
                </div>
                {/* Hint — one line, tells the user when to use this standard. */}
                <p className="text-[11px] text-dark-text-tertiary leading-snug">{hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Collection Images: PFP + Banner ───────────────────────────────── */}
      {/* Two upload zones side by side. PFP is fixed 160×160 square.
          Banner stretches to fill — aspect-ratio 16/6. The math is baked in.
          Both zones support click-to-browse AND drag-and-drop.
          If you can't find the upload zone, you're not looking hard enough. */}
      <div>
        <p className="block text-sm font-medium text-dark-text-secondary mb-3">Collection Images</p>
        <div className="flex flex-wrap gap-4 items-start">

          {/* PFP — 1:1 square ─────────────────────────────────────────────── */}
          {/* Hidden input + label-as-dropzone. File inputs are invisible.
              The label IS the clickable area. This is legal HTML. We checked. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-dark-text-tertiary">PFP · 1:1 square</span>
            <input ref={pfpInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handlePfpChange} />
            {/* Preview mode — shows the uploaded image with a "Replace" overlay on hover.
                No preview? Show the dashed drop zone instead. */}
            {imageFile && pfpPreviewUrl ? (
              <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-dark-border-primary bg-dark-bg-secondary group">
                <img src={pfpPreviewUrl} alt="PFP preview" className="w-full h-full object-cover" />
                {/* Replace overlay — appears on hover. Click triggers the hidden input. */}
                <button type="button" onClick={() => pfpInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">
                  Replace
                </button>
              </div>
            ) : (
              // Drop zone — dashed border, Upload icon, "Drop or browse" copy.
              // dragOver state changes the border color to accent. It's subtle. Users notice.
              <label
                onDragOver={(e) => { e.preventDefault(); setPfpDragOver(true) }}
                onDragLeave={() => setPfpDragOver(false)}
                onDrop={handlePfpDrop}
                className={[
                  'w-40 h-40 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  pfpDragOver ? 'border-dark-accent-primary/60 bg-dark-accent-primary/5' : 'border-dark-border-secondary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-tertiary',
                ].join(' ')}
              >
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handlePfpChange} />
                <Upload className={`w-5 h-5 ${pfpDragOver ? 'text-dark-accent-primary' : 'text-dark-text-tertiary'}`} />
                <span className="text-xs text-dark-text-tertiary text-center px-2">Drop or browse</span>
              </label>
            )}
            {/* Ratio warning — amber, small, appears below the zone. Advisory, not blocking. */}
            {pfpRatioWarn && (
              <p className="flex items-center gap-1 text-[11px] text-amber-400/80 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />{pfpRatioWarn}
              </p>
            )}
          </div>

          {/* Banner — 16:6 ────────────────────────────────────────────────── */}
          {/* Same pattern as PFP but wider. aspect-ratio 16/6 is enforced via style prop.
              flex-1 so it fills whatever horizontal space is left after the PFP. */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-55">
            <span className="text-xs text-dark-text-tertiary">Banner · 16:6 · optional</span>
            <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handleBannerChange} />
            {bannerFile && bannerPreviewUrl ? (
              <div className="relative w-full rounded-xl overflow-hidden border border-dark-border-primary bg-dark-bg-secondary group" style={{ aspectRatio: '16/6' }}>
                <img src={bannerPreviewUrl} alt="Banner preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => bannerInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">
                  Replace
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setBannerDragOver(true) }}
                onDragLeave={() => setBannerDragOver(false)}
                onDrop={handleBannerDrop}
                className={[
                  'w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all',
                  bannerDragOver ? 'border-dark-accent-primary/60 bg-dark-accent-primary/5' : 'border-dark-border-secondary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-tertiary',
                ].join(' ')}
                style={{ aspectRatio: '16/6', minHeight: '80px' }}
              >
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handleBannerChange} />
                <Upload className={`w-5 h-5 ${bannerDragOver ? 'text-dark-accent-primary' : 'text-dark-text-tertiary'}`} />
                <span className="text-xs text-dark-text-tertiary">Drop or browse</span>
              </label>
            )}
            {bannerRatioWarn && (
              <p className="flex items-center gap-1 text-[11px] text-amber-400/80 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />{bannerRatioWarn}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Royalties ─────────────────────────────────────────────────────── */}
      {/* A dedicated card section because royalties deserve their own moment.
          This is passive income on-chain. Treat it with respect.
          Preset pills (0%, 2.5%, 5%, 7.5%, 10%) + custom input + visual progress bar.
          Capped at 10% because we're not savages. */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary/50 p-5 space-y-5">

        {/* Section header — icon + title + description. The full treatment. */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-dark-accent-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Percent className="w-4 h-4 text-dark-accent-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-text-primary">Royalties</p>
            <p className="text-xs text-dark-text-tertiary mt-0.5">
              Earn a cut of every secondary sale — forever. Capped at 10%.
            </p>
          </div>
        </div>

        {/* Royalty percentage — quick-select pills on the left, custom input on the right.
            Pills highlight when their value matches the current royaltyPercent.
            Custom input allows any value 0–10 in 0.5% steps. Math.min/max enforced on change. */}
        <div>
          <label className="block text-xs text-dark-text-tertiary mb-2.5">Royalty Percentage</label>

          {/* Preset pills + custom input on the same row — responsive via flex-wrap. */}
          <div className="flex items-center gap-2 flex-wrap">
            {[0, 2.5, 5, 7.5, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRoyaltyPercent(v)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  // Active pill: accent background + border + text. Inactive: muted.
                  royaltyPercent === v
                    ? 'bg-dark-accent-primary/15 border-dark-accent-primary/50 text-dark-accent-primary'
                    : 'border-dark-border-primary text-dark-text-tertiary hover:text-dark-text-secondary hover:border-dark-border-accent',
                ].join(' ')}
              >
                {v}%
              </button>
            ))}
            {/* Custom value input — number, clamped 0–10, step 0.5.
                Lives in the top-right corner of the pill row. Makes the whole row feel cohesive. */}
            <div className="relative min-w-20 max-w-24 ml-auto">
              <input
                id="royalty-percent"
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={royaltyPercent}
                onChange={(e) => setRoyaltyPercent(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className="w-full px-3 py-1 pr-6 bg-dark-bg-tertiary border border-dark-border-primary rounded-full text-xs text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 transition-colors text-center"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark-text-tertiary pointer-events-none">%</span>
            </div>
          </div>

          {/* Visual progress bar — 0% to 10% mapped to 0% to 100% width.
              Smooth transition on change. The bar grows as royaltyPercent grows.
              It's unnecessary. It's delightful. We're keeping it. */}
          <div className="mt-3 space-y-1">
            <div className="h-1.5 rounded-full bg-dark-bg-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-dark-accent-primary/70 transition-all duration-300"
                style={{ width: `${royaltyPercent * 10}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-dark-text-quaternary">0%</span>
              {/* Live readout — tells the user exactly what percentage they've selected. */}
              <span className="text-[10px] text-dark-accent-primary font-medium">{royaltyPercent}% selected</span>
              <span className="text-[10px] text-dark-text-quaternary">10%</span>
            </div>
          </div>
        </div>

        {/* Royalty wallet — defaults to connected wallet if empty.
            "Use connected wallet" shortcut appears when walletAddress is available.
            Because typing a base58 address manually is how you introduce typos. */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="royalty-wallet" className="text-xs text-dark-text-tertiary">
              Royalty Wallet
            </label>
            {/* "Use connected wallet" button — only appears when wallet is connected.
                Copies walletAddress into royaltyWallet in one click. Convenience is kindness. */}
            {walletAddress && (
              <button
                type="button"
                onClick={() => setRoyaltyWallet(walletAddress)}
                className="flex items-center gap-1 text-[10px] text-dark-accent-primary hover:text-dark-accent-primary/80 transition-colors font-medium"
              >
                <Wallet className="w-3 h-3" /> Use connected wallet
              </button>
            )}
          </div>
          <input
            id="royalty-wallet"
            type="text"
            value={royaltyWallet}
            onChange={(e) => setRoyaltyWallet(e.target.value)}
            placeholder={walletAddress ?? 'Connect wallet…'}
            className="w-full px-4 py-2.5 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary font-mono focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
          />
          {/* Green dot hint — appears when royaltyWallet is empty but wallet is connected.
              "Defaults to connected wallet" so the user knows we've got them covered. */}
          {!royaltyWallet && walletAddress && (
            <p className="flex items-center gap-1.5 text-[11px] text-dark-text-quaternary mt-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-dark-accent-success/70 shrink-0" />
              Defaults to your connected wallet
            </p>
          )}
        </div>

      </div>

      {/* ── Social Links ──────────────────────────────────────────────────── */}
      {/* Optional, but shown on the collection page. Twitter, Discord, Website.
          All optional — no required marker, no validation errors.
          Leave them blank and your collection will survive. Just maybe feel lonely. */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary/50 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-dark-accent-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Link className="w-4 h-4 text-dark-accent-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-text-primary">Social Links</p>
            <p className="text-xs text-dark-text-tertiary mt-0.5">Optional — shown on your collection page.</p>
          </div>
        </div>
        <div className="space-y-3">
          {/* Twitter / X — because the rebrand didn't change the URL. */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-dark-text-tertiary">Twitter / X</span>
            <input
              type="url"
              value={twitterUrl}
              onChange={(e) => setTwitterUrl(e.target.value)}
              placeholder="https://x.com/yourproject"
              className="flex-1 px-3 py-2 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
            />
          </div>
          {/* Discord — where your community yells into the server and you pretend to read it. */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-dark-text-tertiary">Discord</span>
            <input
              type="url"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.gg/yourserver"
              className="flex-1 px-3 py-2 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
            />
          </div>
          {/* Website — the one link that makes you look professional even if you're not. */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-dark-text-tertiary">Website</span>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourproject.io"
              className="flex-1 px-3 py-2 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      {/* Separates the form body from the action buttons.
          One horizontal rule. Very dramatic. Very necessary. */}
      <div className="border-t border-dark-border-primary" />

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {/* Cancel on the left (goes back). Next Step on the right (validates + advances).
          Next Step is disabled when wallet is not connected. We hold the line here.
          Click and pray is not a launch strategy. Fill in the form. */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={navigationUtils.goBack}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!isConnected}>
          Next Step
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </form>
  )
}

// Coded by Juan — two columns, drag-and-drop, ratio warnings, royalty progress bar,
// social links, and a Next button that actually validates before advancing.
// Fill it out. All twenty-two props worth of it. The blockchain is watching
// and it does not offer refunds.
