'use client'

/**
 * CollectionForm - Step 1: Collection details, images, and royalties.
 * Name, symbol, description, NFT standard, PFP + banner upload, royalty config.
 * Validates required fields natively, then calls onNext to advance the wizard.
 * (It's a form. A very good form. With drag-and-drop. Don't take it for granted.)
 *
 * @author Juan - The developer who gave this form a second column
 * (Coded with care, humor, and probably too much coffee)
 */

import { useRef, useState, useEffect } from 'react'

// Icons — status indicators, upload affordance, standard identity, and royalty vibes
import { Upload, AlertCircle, Wallet, ArrowRight, Percent } from 'lucide-react'

// Shared UI and nav
import Button from '@/components/ui/Button'
import { navigationUtils } from '@/lib/event-handlers'
import type { MetadataStandard } from '@/hooks/useCreateCollectionForm'

interface CollectionFormProps {
  collectionName:    string
  setCollectionName: (v: string) => void
  symbol:            string
  setSymbol:         (v: string) => void
  description:       string
  setDescription:    (v: string) => void
  imageFile:         File | null
  setImageFile:      (f: File | null) => void
  bannerFile:        File | null
  setBannerFile:     (f: File | null) => void
  metadataStandard:  MetadataStandard
  setMetadataStandard: (v: MetadataStandard) => void
  royaltyPercent:    number
  setRoyaltyPercent: (v: number) => void
  royaltyWallet:     string
  setRoyaltyWallet:  (v: string) => void
  isConnected:       boolean
  walletAddress:     string | null
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
  isConnected,    walletAddress,
  onNext,
}: CollectionFormProps) {
  const pfpInputRef    = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [pfpDragOver,    setPfpDragOver]    = useState(false)
  const [bannerDragOver, setBannerDragOver] = useState(false)
  const [pfpPreviewUrl,    setPfpPreviewUrl]    = useState<string | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [pfpRatioWarn,    setPfpRatioWarn]    = useState<string | null>(null)
  const [bannerRatioWarn, setBannerRatioWarn] = useState<string | null>(null)

  useEffect(() => {
    if (!imageFile) { setPfpPreviewUrl(null); return }
    const url = URL.createObjectURL(imageFile)
    setPfpPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    if (!bannerFile) { setBannerPreviewUrl(null); return }
    const url = URL.createObjectURL(bannerFile)
    setBannerPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bannerFile])

  // Auto-derive symbol from name (first 4 chars, uppercase) when symbol is empty
  useEffect(() => {
    if (!symbol) setSymbol(collectionName.trim().slice(0, 4).toUpperCase())
  }, [collectionName, symbol, setSymbol])

  function getImageRatio(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img.naturalWidth / img.naturalHeight) }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(1) }
      img.src = url
    })
  }

  async function handlePfpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    if (!file) { setPfpRatioWarn(null); return }
    const ratio = await getImageRatio(file)
    setPfpRatioWarn(Math.abs(ratio - 1) > 0.15 ? 'Best with a 1:1 square image — it will be cropped.' : null)
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setBannerFile(file)
    if (!file) { setBannerRatioWarn(null); return }
    const ratio = await getImageRatio(file)
    const target = 16 / 6
    setBannerRatioWarn(Math.abs(ratio - target) / target > 0.15 ? 'Best with a 16:6 wide image — it will be cropped.' : null)
  }

  async function handlePfpDrop(e: React.DragEvent) {
    e.preventDefault(); setPfpDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    const ratio = await getImageRatio(file)
    setPfpRatioWarn(Math.abs(ratio - 1) > 0.15 ? 'Best with a 1:1 square image — it will be cropped.' : null)
  }

  async function handleBannerDrop(e: React.DragEvent) {
    e.preventDefault(); setBannerDragOver(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (!file || !file.type.startsWith('image/')) return
    setBannerFile(file)
    const ratio = await getImageRatio(file)
    const target = 16 / 6
    setBannerRatioWarn(Math.abs(ratio - target) / target > 0.15 ? 'Best with a 16:6 wide image — it will be cropped.' : null)
  }

  return (
    <form onSubmit={onNext} className="space-y-7">

      {/* ── Section header ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-dark-text-primary">Collection Details</h2>
        <p className="text-sm text-dark-text-tertiary mt-1">
          Name your drop, write a description, and set up royalties.
        </p>
      </div>

      {/* ── Wallet gate ───────────────────────────────────────────────── */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-bg-secondary border border-dark-border-primary text-sm">
          <Wallet className="w-4 h-4 shrink-0 text-dark-accent-warning" />
          <span className="text-dark-text-secondary">Connect your wallet to create a collection.</span>
        </div>
      )}

      {/* ── Name + Symbol ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="create-collection-name" className="block text-sm font-medium text-dark-text-secondary mb-2">
            Collection Name <span className="text-dark-accent-error text-xs">required</span>
          </label>
          <input
            id="create-collection-name"
            type="text"
            required
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="My Awesome Collection"
            maxLength={64}
            className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="create-symbol" className="block text-sm font-medium text-dark-text-secondary mb-2">
            Symbol <span className="text-dark-accent-error text-xs">required</span>
          </label>
          <input
            id="create-symbol"
            type="text"
            required
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="MYCOL"
            maxLength={10}
            className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors uppercase"
          />
        </div>
      </div>

      {/* ── Description ───────────────────────────────────────────────── */}
      <div>
        <label htmlFor="create-description" className="block text-sm font-medium text-dark-text-secondary mb-2">
          Description <span className="text-dark-accent-error text-xs">required</span>
        </label>
        <textarea
          id="create-description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your collection — what it is, what it means, why collectors should care."
          rows={4}
          className="w-full px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors resize-none"
        />
      </div>

      {/* ── NFT Standard ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-3">NFT Standard</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            {
              value: 'Core', label: 'Core', sub: 'Metaplex', hint: 'Modern & lightweight. Lowest fees.', tag: 'Recommended',
              color: 'text-[#00d4ff]', activeBorder: 'border-[#00d4ff] bg-[#00d4ff]/6',
              icon: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m/logo.png" alt="Metaplex" className="w-5 h-5 rounded-full object-cover" />,
            },
            {
              value: 'Legacy', label: 'Legacy', sub: 'Token Metadata', hint: 'Traditional. Supported everywhere.', tag: null,
              color: 'text-[#9945FF]', activeBorder: 'border-[#9945FF] bg-[#9945FF]/6',
              icon: <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m/logo.png" alt="Metaplex" className="w-5 h-5 rounded-full object-cover opacity-80" style={{ filter: 'hue-rotate(280deg) saturate(1.4)' }} />,
            },
            {
              value: 'Compressed', label: 'Compressed', sub: 'cNFT', hint: 'Lowest cost. Best for large drops.', tag: null,
              color: 'text-[#E42575]', activeBorder: 'border-[#E42575] bg-[#E42575]/6',
              icon: <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><polygon points="10,1 19,10 10,19 1,10" fill="#E42575" /><text x="10" y="14" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="system-ui,sans-serif">C</text></svg>,
            },
            {
              value: 'Programmable', label: 'Programmable', sub: 'pNFT', hint: 'On-chain royalty enforcement.', tag: null,
              color: 'text-[#F97316]', activeBorder: 'border-[#F97316] bg-[#F97316]/6',
              icon: <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2 L17 5 L17 10 C17 14 13.5 17.5 10 18.5 C6.5 17.5 3 14 3 10 L3 5 Z" fill="#F97316" /><text x="10" y="14" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="800" fontFamily="system-ui,sans-serif">P</text></svg>,
            },
          ] as const).map(({ value, label, sub, hint, tag, color, activeBorder, icon }) => {
            const active = metadataStandard === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMetadataStandard(value)}
                className={[
                  'relative flex flex-col gap-2.5 px-3 pt-3.5 pb-3 rounded-xl border text-left transition-all',
                  active ? activeBorder : 'border-dark-border-primary bg-dark-bg-secondary hover:border-dark-border-accent hover:bg-dark-bg-tertiary',
                ].join(' ')}
              >
                {tag && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-[#00d4ff] bg-[#00d4ff]/10 px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                )}
                {icon}
                <div>
                  <p className="text-xs font-bold text-dark-text-primary leading-tight">{label}</p>
                  <p className={`text-[10px] font-semibold ${color} leading-tight`}>{sub}</p>
                </div>
                <p className="text-[11px] text-dark-text-tertiary leading-snug">{hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Collection Images: PFP + Banner ───────────────────────────── */}
      <div>
        <p className="block text-sm font-medium text-dark-text-secondary mb-3">Collection Images</p>
        <div className="flex flex-wrap gap-4 items-start">

          {/* PFP — 1:1 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-dark-text-tertiary">PFP · 1:1 square</span>
            <input ref={pfpInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handlePfpChange} />
            {imageFile && pfpPreviewUrl ? (
              <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-dark-border-primary bg-dark-bg-secondary group">
                <img src={pfpPreviewUrl} alt="PFP preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => pfpInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-medium">
                  Replace
                </button>
              </div>
            ) : (
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
            {pfpRatioWarn && (
              <p className="flex items-center gap-1 text-[11px] text-amber-400/80 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />{pfpRatioWarn}
              </p>
            )}
          </div>

          {/* Banner — 16:6 */}
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

      {/* ── Royalties ─────────────────────────────────────────────────── */}
      {/* A card, not just a grid. Royalties deserve their own moment. */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary/50 p-5 space-y-5">

        {/* Section header with icon + description */}
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

        {/* Royalty % — quick-select pills + progress bar */}
        <div>
          <label className="block text-xs text-dark-text-tertiary mb-2.5">Royalty Percentage</label>

          {/* Preset pills + custom input on the same row */}
          <div className="flex items-center gap-2 flex-wrap">
            {[0, 2.5, 5, 7.5, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRoyaltyPercent(v)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  royaltyPercent === v
                    ? 'bg-dark-accent-primary/15 border-dark-accent-primary/50 text-dark-accent-primary'
                    : 'border-dark-border-primary text-dark-text-tertiary hover:text-dark-text-secondary hover:border-dark-border-accent',
                ].join(' ')}
              >
                {v}%
              </button>
            ))}
            {/* Custom value input */}
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

          {/* Visual progress bar */}
          <div className="mt-3 space-y-1">
            <div className="h-1.5 rounded-full bg-dark-bg-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-dark-accent-primary/70 transition-all duration-300"
                style={{ width: `${royaltyPercent * 10}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-dark-text-quaternary">0%</span>
              <span className="text-[10px] text-dark-accent-primary font-medium">{royaltyPercent}% selected</span>
              <span className="text-[10px] text-dark-text-quaternary">10%</span>
            </div>
          </div>
        </div>

        {/* Royalty wallet */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="royalty-wallet" className="text-xs text-dark-text-tertiary">
              Royalty Wallet
            </label>
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
          {!royaltyWallet && walletAddress && (
            <p className="flex items-center gap-1.5 text-[11px] text-dark-text-quaternary mt-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-dark-accent-success/70 shrink-0" />
              Defaults to your connected wallet
            </p>
          )}
        </div>

      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t border-dark-border-primary" />

      {/* ── Actions ───────────────────────────────────────────────────── */}
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

// Coded by Juan - two columns, drag-and-drop, royalties, and a "Next" button that actually goes next.
// P.S. - Fill it out. All of it. The blockchain is watching.
