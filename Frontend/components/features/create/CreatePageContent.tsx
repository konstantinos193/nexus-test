'use client'

/**
 * CreatePageContent - Four-step wizard for launching an NFT collection on Solana.
 * Left sidebar: vertical step progress + live preview. Right: the active step's form.
 * Steps: Collection Details → Media & Metadata → Mint Phases → Deploy.
 * (Four steps instead of one because "click and pray" is not a launch strategy.)
 *
 * Pattern: outer guard on WalletReadyContext; inner calls Phantom SDK hooks.
 * Same guard as WalletConnect — usePhantom() throws outside its provider.
 * (Consistency keeps the bugs away. Wallets keep the lawyers away.)
 *
 * @author Juan - The developer who gave this page a second column and four real steps
 * (Coded with care, humor, and probably too much coffee)
 */

import { useContext, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Icons — navigation and step identity
import { ArrowLeft, Layers, FolderUp, CalendarRange, Rocket } from 'lucide-react'

// Step forms — each handles its own slice of the creation flow
import CollectionForm    from './CollectionForm'
import MediaMetadataForm from './MediaMetadataForm'
import MintPhasesForm    from './MintPhasesForm'
import DeployForm        from './DeployForm'

// The hook that owns all state across all four steps
import { useCreateCollectionForm } from '@/hooks/useCreateCollectionForm'
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'

// ── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Collection Details', hint: 'Name, images & royalties',   Icon: Layers       },
  { id: 2, label: 'Media & Metadata',   hint: 'Upload NFT files to IPFS',   Icon: FolderUp     },
  { id: 3, label: 'Mint Phases',        hint: 'Pricing, timing & access',   Icon: CalendarRange },
  { id: 4, label: 'Deploy',             hint: 'Go live on Solana',          Icon: Rocket       },
]

// ── Vertical step indicator ──────────────────────────────────────────────────
function VerticalSteps({ currentStep }: { currentStep: number }) {
  return (
    <div>
      {STEPS.map((s, i) => {
        const isActive = s.id === currentStep
        const isDone   = s.id < currentStep
        const isLocked = s.id > currentStep

        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-colors',
                isDone   ? 'bg-dark-accent-success/15 border-dark-accent-success/50 text-dark-accent-success' : '',
                isActive ? 'bg-dark-accent-primary/15 border-dark-accent-primary   text-dark-accent-primary' : '',
                isLocked ? 'bg-dark-bg-secondary      border-dark-border-primary   text-dark-text-tertiary'  : '',
              ].join(' ')}>
                {isDone ? '✓' : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={[
                  'w-px flex-1 my-1 min-h-8',
                  isDone ? 'bg-dark-accent-success/25' : 'bg-dark-border-primary',
                ].join(' ')} />
              )}
            </div>
            <div className={i < STEPS.length - 1 ? 'pb-6 pt-0.5' : 'pt-0.5'}>
              <p className={[
                'text-sm font-medium leading-none',
                isActive ? 'text-dark-text-primary'   : '',
                isLocked ? 'text-dark-text-tertiary'  : '',
                isDone   ? 'text-dark-text-secondary' : '',
              ].join(' ')}>
                {s.label}
              </p>
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

// ── Live preview card ─────────────────────────────────────────────────────────
function CollectionPreview({ name, imageFile }: { name: string; imageFile: File | null }) {
  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imageFile]
  )

  return (
    <div className="rounded-xl border border-dark-border-primary overflow-hidden bg-dark-bg-secondary">
      <div className="aspect-square bg-dark-bg-tertiary relative">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dark-text-tertiary">
            <div className="w-12 h-12 rounded-xl bg-dark-bg-primary border border-dashed border-dark-border-accent flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs">Cover image</span>
          </div>
        )}
      </div>
      <div className="px-3 py-3 border-t border-dark-border-primary">
        <p className="text-sm font-semibold text-dark-text-primary truncate leading-snug">
          {name.trim() || 'Untitled Collection'}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-md bg-dark-accent-primary/10 border border-dark-accent-primary/25 text-dark-accent-primary font-medium">
            Solana
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-dark-bg-tertiary border border-dark-border-primary text-dark-text-tertiary">
            Draft
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Inner component ───────────────────────────────────────────────────────────
function CreatePageContentInner() {
  const router = useRouter()
  const form   = useCreateCollectionForm()

  // Redirect to the new collection page once deployed
  if (form.isSuccess && form.createdCollection) {
    router.push(`/drops/${form.createdCollection.slug ?? form.createdCollection.id}`)
    return null
  }

  return (
    <div className="min-h-screen bg-dark-bg-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT: Sticky sidebar ──────────────────────────────────── */}
          <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24 lg:self-start">
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-sm text-dark-text-tertiary hover:text-dark-text-secondary transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Collections
            </Link>
            <div className="mb-7">
              <h1 className="text-xl font-bold text-dark-text-primary tracking-tight">New Collection</h1>
              <p className="text-sm text-dark-text-tertiary mt-1">Deploy on Solana</p>
            </div>
            <div className="mb-7">
              <VerticalSteps currentStep={form.step} />
            </div>
            <div className="border-t border-dark-border-primary mb-6" />
            <div>
              <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider mb-3">Preview</p>
              <CollectionPreview name={form.collectionName} imageFile={form.imageFile} />
            </div>
          </aside>

          {/* ── RIGHT: Active step form ───────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {form.step === 1 && (
              <CollectionForm
                collectionName={form.collectionName}    setCollectionName={form.setCollectionName}
                symbol={form.symbol}                    setSymbol={form.setSymbol}
                description={form.description}          setDescription={form.setDescription}
                imageFile={form.imageFile}              setImageFile={form.setImageFile}
                bannerFile={form.bannerFile}             setBannerFile={form.setBannerFile}
                metadataStandard={form.metadataStandard} setMetadataStandard={form.setMetadataStandard}
                royaltyPercent={form.royaltyPercent}    setRoyaltyPercent={form.setRoyaltyPercent}
                royaltyWallet={form.royaltyWallet}      setRoyaltyWallet={form.setRoyaltyWallet}
                isConnected={form.isConnected}
                walletAddress={form.walletAddress}
                onNext={form.handleStep1Next}
              />
            )}

            {form.step === 2 && (
              <MediaMetadataForm
                imageFiles={form.imageFiles}        setImageFiles={form.setImageFiles}
                metadataFiles={form.metadataFiles}  setMetadataFiles={form.setMetadataFiles}
                imagesBaseUri={form.imagesBaseUri}
                metadataBaseUri={form.metadataBaseUri}
                step2State={form.step2State}
                step2Error={form.step2Error}
                onUpload={form.handleMediaUpload}
                onNext={form.nextStep}
                onBack={form.prevStep}
              />
            )}

            {form.step === 3 && (
              <MintPhasesForm
                totalSupply={form.totalSupply}
                mintPrice={form.mintPrice}      setMintPrice={form.setMintPrice}
                freeMint={form.freeMint}        setFreeMint={form.setFreeMint}
                phases={form.phases}            setPhases={form.setPhases}
                fundReceivers={form.fundReceivers}
                updateFundReceiver={form.updateFundReceiver}
                addFundReceiver={form.addFundReceiver}
                removeFundReceiver={form.removeFundReceiver}
                distributeFundReceiversEvenly={form.distributeFundReceiversEvenly}
                autoFillFundReceiversRemainder={form.autoFillFundReceiversRemainder}
                fundReceiverTotal={form.fundReceiverTotal}
                fundReceiverError={form.fundReceiverError}
                walletAddress={form.walletAddress}
                onNext={form.nextStep}
                onBack={form.prevStep}
              />
            )}

            {form.step === 4 && (
              <DeployForm
                collectionName={form.collectionName}
                symbol={form.symbol}
                description={form.description}
                metadataStandard={form.metadataStandard}
                royaltyPercent={form.royaltyPercent}
                royaltyWallet={form.royaltyWallet}
                walletAddress={form.walletAddress}
                imageFile={form.imageFile}
                bannerFile={form.bannerFile}
                imageFiles={form.imageFiles}
                metadataFiles={form.metadataFiles}
                imagesBaseUri={form.imagesBaseUri}
                metadataBaseUri={form.metadataBaseUri}
                totalSupply={form.totalSupply}
                mintPrice={form.mintPrice}
                freeMint={form.freeMint}
                phases={form.phases}
                isConnected={form.isConnected}
                submitState={form.submitState}
                isDeploying={form.isDeploying}
                error={form.error}
                onDeploy={form.handleDeploy}
                onBack={form.prevStep}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// ── Outer component ───────────────────────────────────────────────────────────
// Waits for wallet adapters before rendering. Brief — one effect cycle after hydration.
export default function CreatePageContent() {
  const walletReady = useContext(WalletReadyContext)

  if (!walletReady) {
    return (
      <div className="min-h-screen bg-dark-bg-primary">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10">
          <aside className="w-full lg:w-60 shrink-0">
            <div className="h-4 w-24 rounded bg-dark-bg-secondary animate-pulse mb-6" />
            <div className="h-6 w-40 rounded bg-dark-bg-secondary animate-pulse mb-2" />
            <div className="h-4 w-28 rounded bg-dark-bg-secondary animate-pulse" />
          </aside>
          <main className="flex-1">
            <div className="h-10 w-48 rounded-lg bg-dark-bg-secondary animate-pulse mb-2" />
            <div className="h-5 w-72 rounded bg-dark-bg-secondary animate-pulse mb-8" />
            <div className="h-96 rounded-xl bg-dark-bg-secondary animate-pulse" />
          </main>
        </div>
      </div>
    )
  }

  return <CreatePageContentInner />
}

// Coded by Juan - four steps. Real navigation. No more hardcoded useState(1).
// P.S. - Steps 2, 3, and 4 exist now. You're welcome.
