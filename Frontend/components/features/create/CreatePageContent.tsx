'use client'

/**
 * CreatePageContent - The four-step wizard that turns a wallet and an idea
 * into an NFT collection on Solana. Or at least tries very hard to.
 *
 * Left sidebar: vertical step progress + live collection preview.
 * Right panel: the active step's form — one at a time, like a responsible adult.
 * Steps: Collection Details → Media & Metadata → Mint Phases → Deploy.
 * (Four steps instead of one because "click and pray" is not a launch strategy.
 * We've been burned before.)
 *
 * Architecture note: outer component guards on WalletReadyContext before rendering
 * the inner component. The inner calls Phantom SDK hooks. If WalletReadyContext is
 * false and you call usePhantom(), the SDK throws into the void. We guard against that.
 * (Consistency keeps the bugs away. Wallets keep the lawyers away. Pick your battles.)
 *
 * @author Juan - The developer who gave this page a sidebar, a live preview,
 * and four actual working steps instead of one infinite scroll of despair.
 * (Coded with care, humor, and enough coffee to fuel a small rocket launch.)
 */

// React essentials — context for the wallet guard, state for step tracking, effects for redirect.
import { useContext, useState, useEffect } from 'react'

// Next.js router — redirects to the new collection page after deploy.
// We leave this page the moment the collection is live. Dramatic exit.
import { useRouter } from 'next/navigation'

// Link — for the "← Collections" back link in the sidebar.
// Because navigating without a link is like walking backwards into a room.
import Link from 'next/link'

// Icons — each step has one. They live in the sidebar step list.
// ArrowLeft = go back. Layers = collection. FolderUp = upload. CalendarRange = phases. Rocket = deploy.
import { ArrowLeft, Layers, FolderUp, CalendarRange, Rocket } from 'lucide-react'

// Step forms — one per step. Each handles its own slice of the creation ceremony.
// They receive flat props and call the hook's handlers. Pure UI with attitude.
import CollectionForm    from './CollectionForm'
import MediaMetadataForm from './MediaMetadataForm'
import MintPhasesForm    from './MintPhasesForm'
import DeployForm        from './DeployForm'

// useCreateCollectionForm — the hook that owns ALL state across all four steps.
// It's a big hook. It has opinions. It keeps the wizard honest.
import { useCreateCollectionForm } from '@/hooks/useCreateCollectionForm'

// WalletReadyContext — becomes true after wallet adapters have initialized on the client.
// This takes approximately one effect cycle after hydration. Brief. But necessary.
// Rendering wallet hooks before this is true = crash = embarrassing.
import { WalletReadyContext } from '@/components/providers/WalletReadyContext'

// ── Step config ──────────────────────────────────────────────────────────────
// The four steps. Labels, hints, icons. Used in the VerticalSteps sidebar.
// Order matters. Index matters. Step IDs are 1-based. Humans prefer 1-based.
const STEPS = [
  { id: 1, label: 'Collection Details', hint: 'Name, images & royalties',   Icon: Layers       },
  { id: 2, label: 'Media & Metadata',   hint: 'Upload NFT files to IPFS',   Icon: FolderUp     },
  { id: 3, label: 'Mint Phases',        hint: 'Pricing, timing & access',   Icon: CalendarRange },
  { id: 4, label: 'Deploy',             hint: 'Go live on Solana',          Icon: Rocket       },
]

// ── Vertical step indicator ──────────────────────────────────────────────────
/**
 * VerticalSteps — the sidebar progress tracker.
 * Three states per step: done (green check), active (accent, shows hint), locked (muted).
 * Connecting lines between steps change color once a step is completed.
 * It's a UI metaphor for progress. We all need those sometimes.
 */
function VerticalSteps({ currentStep }: { currentStep: number }) {
  return (
    <div>
      {STEPS.map((s, i) => {
        // Three mutually exclusive states. One step, one truth, one destiny.
        const isActive = s.id === currentStep
        const isDone   = s.id < currentStep
        const isLocked = s.id > currentStep

        return (
          <div key={s.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              {/* Step number circle — green check if done, accent if active, grey if locked.
                  The check mark is earned. The number is just potential. */}
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 transition-colors',
                isDone   ? 'bg-dark-accent-success/15 border-dark-accent-success/50 text-dark-accent-success' : '',
                isActive ? 'bg-dark-accent-primary/15 border-dark-accent-primary   text-dark-accent-primary' : '',
                isLocked ? 'bg-dark-bg-secondary      border-dark-border-primary   text-dark-text-tertiary'  : '',
              ].join(' ')}>
                {isDone ? '✓' : s.id}
              </div>
              {/* Connecting line — only between steps, not after the last one.
                  Green when the step below it is done. Grey otherwise.
                  A tiny green line is worth a thousand loading spinners. */}
              {i < STEPS.length - 1 && (
                <div className={[
                  'w-px flex-1 my-1 min-h-8',
                  isDone ? 'bg-dark-accent-success/25' : 'bg-dark-border-primary',
                ].join(' ')} />
              )}
            </div>
            {/* Step label + hint — hint only shows on the active step.
                Because showing all four hints simultaneously is information overload. */}
            <div className={i < STEPS.length - 1 ? 'pb-6 pt-0.5' : 'pt-0.5'}>
              <p className={[
                'text-sm font-medium leading-none',
                isActive ? 'text-dark-text-primary'   : '',
                isLocked ? 'text-dark-text-tertiary'  : '',
                isDone   ? 'text-dark-text-secondary' : '',
              ].join(' ')}>
                {s.label}
              </p>
              {/* Hint — only shown on the active step. A whisper, not a shout. */}
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
/**
 * CollectionPreview — the sidebar card that shows what the collection will look like.
 * Updates in real-time as the user types a name or uploads a PFP.
 * No upload, no network. Just a local object URL and a little optimism.
 * "Untitled Collection" until proven otherwise. We've all been there.
 */
function CollectionPreview({ name, imageFile }: { name: string; imageFile: File | null }) {
  // previewUrl — object URL for the PFP file. Created on mount, revoked on cleanup.
  // If this leaks, it's a very small leak. Still, we clean it up. We have standards.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    // Create URL when file exists. Clear when file is removed. Revoke on cleanup.
    const url = imageFile ? URL.createObjectURL(imageFile) : null
    setPreviewUrl(url)
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [imageFile])

  return (
    <div className="rounded-xl border border-dark-border-primary overflow-hidden bg-dark-bg-secondary">
      {/* Image area — square, object-cover. Placeholder shows the Layers icon + "Cover image" hint. */}
      <div className="aspect-square bg-dark-bg-tertiary relative">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          // Empty state — dashed box, Layers icon, gentle prompt.
          // "Cover image" is not sarcastic. It genuinely is where the cover image goes.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dark-text-tertiary">
            <div className="w-12 h-12 rounded-xl bg-dark-bg-primary border border-dashed border-dark-border-accent flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs">Cover image</span>
          </div>
        )}
      </div>
      {/* Metadata strip — collection name + Solana + Draft badges.
          "Untitled Collection" until the user types something. It's a placeholder. Not a judgment. */}
      <div className="px-3 py-3 border-t border-dark-border-primary">
        <p className="text-sm font-semibold text-dark-text-primary truncate leading-snug">
          {name.trim() || 'Untitled Collection'}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          {/* Solana badge — because we only do one chain here. Dark mode. No exceptions. */}
          <span className="text-xs px-2 py-0.5 rounded-md bg-dark-accent-primary/10 border border-dark-accent-primary/25 text-dark-accent-primary font-medium">
            Solana
          </span>
          {/* Draft badge — this is a work in progress until it isn't. */}
          <span className="text-xs px-2 py-0.5 rounded-md bg-dark-bg-tertiary border border-dark-border-primary text-dark-text-tertiary">
            Draft
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Inner component ───────────────────────────────────────────────────────────
/**
 * CreatePageContentInner — the actual page, rendered only after wallet adapters are ready.
 * Reads form state from useCreateCollectionForm(). Passes everything down as flat props.
 * Redirects to the collection page after a successful deploy.
 * (The last thing this component ever does before unmounting is send you to your new collection.)
 */
function CreatePageContentInner() {
  // Next.js router — used for post-deploy redirect. The wizard's final act.
  const router = useRouter()

  // form — the mega-hook. Owns step, all field values, upload state, deploy state, everything.
  // If this hook is unhappy, the wizard is unhappy. Keep the hook happy.
  const form   = useCreateCollectionForm()

  // Redirect effect — watches for isSuccess + createdCollection to both be truthy.
  // When they are, we navigate. We don't ask. We just go.
  // Prefer slug over id for human-readable URLs. The blockchain gives us IDs.
  // We give users slugs. (The slug is a gift.)
  useEffect(() => {
    if (form.isSuccess && form.createdCollection) {
      router.push(`/drops/${form.createdCollection.slug ?? form.createdCollection.id}`)
    }
  }, [form.isSuccess, form.createdCollection, router])

  return (
    <div className="min-h-screen bg-dark-bg-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Two-column layout: sticky sidebar left, form right.
            On mobile, they stack. On desktop, the sidebar stays fixed while you scroll the form.
            lg:sticky lg:top-24 — because nobody wants to scroll back up to check progress. */}
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT: Sticky sidebar ──────────────────────────────────── */}
          {/* The sidebar contains: back link, heading, step progress, divider, live preview.
              Everything you need to know about where you are and what it looks like so far. */}
          <aside className="w-full lg:w-60 shrink-0 lg:sticky lg:top-24 lg:self-start">
            {/* Back link — "← Collections". Small. Unobtrusive. Life-saving. */}
            <Link
              href="/collections"
              className="inline-flex items-center gap-1.5 text-sm text-dark-text-tertiary hover:text-dark-text-secondary transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Collections
            </Link>
            {/* Page heading — "New Collection" + "Deploy on Solana".
                Bold. Brief. Reminds you what you're here to do. */}
            <div className="mb-7">
              <h1 className="text-xl font-bold text-dark-text-primary tracking-tight">New Collection</h1>
              <p className="text-sm text-dark-text-tertiary mt-1">Deploy on Solana</p>
            </div>
            {/* Step progress — vertical, numbered, connecting lines.
                Glanceable at any point in the wizard without reading anything. */}
            <div className="mb-7">
              <VerticalSteps currentStep={form.step} />
            </div>
            {/* Divider — clean visual break between progress and preview. */}
            <div className="border-t border-dark-border-primary mb-6" />
            {/* Live preview — updates as the user fills in Step 1.
                "Preview" label in uppercase because section headers are bold and slightly serious. */}
            <div>
              <p className="text-xs font-semibold text-dark-text-tertiary uppercase tracking-wider mb-3">Preview</p>
              <CollectionPreview name={form.collectionName} imageFile={form.imageFile} />
            </div>
          </aside>

          {/* ── RIGHT: Active step form ───────────────────────────────── */}
          {/* Only one step renders at a time. The others politely wait their turn.
              No animation between steps. No confusion. Just the form you need right now. */}
          <main className="flex-1 min-w-0">
            {/* Step 1: Collection Details — the foundation.
                Name, symbol, description, standard, images, royalties, social links.
                If Step 1 is a mess, everything downstream is a mess. No pressure. */}
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
                twitterUrl={form.twitterUrl}            setTwitterUrl={form.setTwitterUrl}
                discordUrl={form.discordUrl}            setDiscordUrl={form.setDiscordUrl}
                websiteUrl={form.websiteUrl}            setWebsiteUrl={form.setWebsiteUrl}
                isConnected={form.isConnected}
                walletAddress={form.walletAddress}
                onNext={form.handleStep1Next}
              />
            )}

            {/* Step 2: Media & Metadata — upload everything to IPFS.
                Two drag-drop zones. Live preview grid. A big gradient upload button.
                Object URLs, IPFS CIDs, and the quiet prayer that the upload finishes. */}
            {form.step === 2 && (
              <MediaMetadataForm
                imageFiles={form.imageFiles}        setImageFiles={form.setImageFiles}
                metadataFiles={form.metadataFiles}  setMetadataFiles={form.setMetadataFiles}
                imagesBaseUri={form.imagesBaseUri}
                metadataBaseUri={form.metadataBaseUri}
                step2State={form.step2State}
                step2Error={form.step2Error}
                uploadProgress={form.uploadProgress}
                onUpload={form.handleMediaUpload}
                onNext={form.nextStep}
                onBack={form.prevStep}
              />
            )}

            {/* Step 3: Mint Phases — supply, price, and phase scheduling.
                Fund receivers split, allowlist wallets, start/end times per phase.
                The most configuration of any step. The user earns Step 4. */}
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

            {/* Step 4: Deploy — the finish line.
                Collection preview, pre-flight checklist, key numbers, phase timeline,
                "what happens when you deploy" explainer, and THE button.
                Big. Important. Permanent. Deploy on Solana, forever. */}
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
                estimatedFee={form.estimatedFee}
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
/**
 * CreatePageContent — the exported component. Exported. Used in the page.
 * Waits for wallet adapters to initialize before rendering the inner component.
 * While waiting, renders a skeleton — shimmer boxes where the content will be.
 * This pause is brief: one effect cycle after hydration.
 * (The skeleton is not a failure state. It's a polite pause. We respect that.)
 */
export default function CreatePageContent() {
  // WalletReadyContext — false until wallet adapters have mounted client-side.
  // usePhantom() and friends will throw if called before this is true.
  // We guard here so the inner component can call them without ceremony.
  const walletReady = useContext(WalletReadyContext)

  // Skeleton loading state — renders while wallet adapters are initializing.
  // Not an error. Not a slow network. Just the JavaScript hydration tax.
  // Animated pulse so users know the page is alive, just thinking.
  if (!walletReady) {
    return (
      <div className="min-h-screen bg-dark-bg-primary">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10">
          {/* Sidebar skeleton — mimics the back link, heading, and subtitle. */}
          <aside className="w-full lg:w-60 shrink-0">
            <div className="h-4 w-24 rounded bg-dark-bg-secondary animate-pulse mb-6" />
            <div className="h-6 w-40 rounded bg-dark-bg-secondary animate-pulse mb-2" />
            <div className="h-4 w-28 rounded bg-dark-bg-secondary animate-pulse" />
          </aside>
          {/* Form skeleton — mimics the step header, subtitle, and a large form area. */}
          <main className="flex-1">
            <div className="h-10 w-48 rounded-lg bg-dark-bg-secondary animate-pulse mb-2" />
            <div className="h-5 w-72 rounded bg-dark-bg-secondary animate-pulse mb-8" />
            <div className="h-96 rounded-xl bg-dark-bg-secondary animate-pulse" />
          </main>
        </div>
      </div>
    )
  }

  // Wallet is ready. Render the real thing. The wizard begins.
  return <CreatePageContentInner />
}

// Coded by Juan — four steps. Real navigation. A live preview that updates as you type.
// A skeleton state so you don't panic during the 50ms hydration pause.
// Steps 2, 3, and 4 exist now. All of them. Working. On Solana.
// You're welcome. Now go deploy something.
