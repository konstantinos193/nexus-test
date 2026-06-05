'use client'

/**
 * CreateStep4Success - Step 4: Deploy & Review.
 * The penultimate screen before you commit your collection to the blockchain forever.
 * Shows a summary card, a pre-flight checklist, a permanence warning, and action buttons.
 *
 * "Deploy Collection" and "Deploy & Open Mint" are the two launch paths.
 * Both are disabled until a wallet is connected. We hold the line.
 * "Save as Draft" is always available. "Create new collection" is the reset button.
 *
 * This component is older than DeployForm — it predates the full visual redesign.
 * DeployForm is the current production deploy step. This one still lives in the codebase
 * for feature parity in alternative flows. Neither is wrong. Both ship things.
 * (The blockchain doesn't care which component you used. It just takes your SOL.)
 *
 * @author Juan - The developer who made the Deploy button look scary on purpose.
 * It should look scary. It should inspire a pause. It does. Good.
 * (Coded with care, humor, and a deep respect for immutability.)
 */

// PhaseRow — the phase data shape. Used to render the phase count summary.
import { PhaseRow } from './create-types'

// METADATA_STANDARDS — maps value ('Core', 'Metaplex', 'CNFT') to display label.
// We look up the label so the user sees "Standard (DAS)" instead of "Core".
// Humans prefer readable labels. We accommodate that.
const METADATA_STANDARDS = [
  { value: 'Core' as const, label: 'Standard (DAS)' },
  { value: 'Metaplex' as const, label: 'Legacy' },
  { value: 'CNFT' as const, label: 'Compressed' },
]

// ── Props interface ────────────────────────────────────────────────────────────
// Everything needed to render the summary + drive the action buttons.
// connected drives the disabled state of the deploy buttons. That's the final gate.
export interface CreateStep4SuccessProps {
  // Collection identity — name and image for the summary card
  collectionName: string
  collectionImage: string | null
  // Mint configuration — supply, price, free-mint flag
  totalSupply: string
  mintPrice: string
  freeMint: boolean
  // Royalty + freeze config — shown in the summary list
  royaltyPercent: number
  freezeCollection: boolean
  freezeUntilDate: string
  // Phases — count and names for the summary
  phases: PhaseRow[]
  // Metadata standard — looked up in METADATA_STANDARDS for display label
  metadataStandard: 'Core' | 'Metaplex' | 'CNFT'
  // connected — wallet connection state. Deploy buttons are disabled when false.
  // If you're not connected, you're not deploying. Full stop.
  connected: boolean
  // Draft state — draftSavedAt timestamp and save callback
  draftSavedAt: number | null
  onSaveDraft: () => void
  // onStartNewCollection — resets the wizard for another collection.
  // Because one collection is never enough.
  onStartNewCollection: () => void
}

/**
 * CreateStep4Success — renders the final review screen.
 * Summary card shows everything you've configured.
 * Pre-flight checklist gives you a gut-check before deploying.
 * Warning makes it clear: once deployed, it's done. Forever. On-chain.
 */
export default function CreateStep4Success({
  collectionName, collectionImage, totalSupply, mintPrice, freeMint, royaltyPercent,
  freezeCollection, freezeUntilDate, phases, metadataStandard, connected, draftSavedAt,
  onSaveDraft, onStartNewCollection,
}: CreateStep4SuccessProps) {
  return (
    // Main container — step-level wrapper, full-width form flow
    <div className="nft-create-step-main">

      {/* Step title — "Deploy & Review". The final chapter.
          We use &amp; because JSX escapes matter.
          Pedantic? Yes. Correct? Also yes. */}
      <h2 className="nft-create-step-title">Deploy &amp; Review</h2>

      {/* ── Summary card ─────────────────────────────────────────────────── */}
      {/* Shows: collection image, name, blockchain + standard, and a bullet list of settings.
          This is the "do you like what you see?" moment before the point of no return. */}
      <div className="nft-create-summary-card">
        <div className="nft-create-summary-row">
          {/* Collection image — only renders if one was uploaded.
              No image? No thumbnail. The name will have to carry it alone. */}
          {collectionImage && <img src={collectionImage} alt="" className="nft-create-summary-thumb" />}
          <div className="nft-create-summary-meta">
            {/* Collection name — fallback to "Collection name" if somehow empty here.
                The wizard should have caught that in Step 1. We're being defensive anyway. */}
            <h3>{collectionName || 'Collection name'}</h3>
            {/* Solana ◆ Standard — chain identity + metadata standard.
                The ◆ is decorative. We like it. It stays. */}
            <p>Solana ◆ {METADATA_STANDARDS.find((m) => m.value === metadataStandard)?.label ?? 'Standard (DAS)'}</p>
            {/* Summary list — five fixed items + conditional phases line.
                ◆ is the placeholder when a value is missing. It's a diamond. We're fancy. */}
            <ul className="nft-create-summary-list">
              <li>Supply: {totalSupply || '◆'}</li>
              <li>Mint price: {freeMint ? 'Free' : mintPrice || '◆'}</li>
              <li>Royalties: {royaltyPercent}%</li>
              {/* Freeze — "until [date]", "until sold out", or "off".
                  Three distinct states. One line. It's compact but complete. */}
              <li>
                Freeze: {freezeCollection
                  ? freezeUntilDate
                    ? `until ${new Date(freezeUntilDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`
                    : 'until sold out'
                  : 'off'}
              </li>
              {/* Phases — only shows when phases exist. Count + comma-separated names.
                  If you named your phases "Phase 1", "Phase 2", "Phase 3"... that's fine.
                  Creative phase naming is encouraged but not required. */}
              {phases.length > 0 && (
                <li>Phases: {phases.length} — {phases.map((p, i) => (p.name || `Phase ${i + 1}`)).join(', ')}</li>
              )}
              <li>Go live: on deploy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Pre-flight checklist ─────────────────────────────────────────── */}
      {/* Advisory. Not blocking. Four items that should be true before deploy.
          If any of these are false when you click Deploy, you'll find out the hard way.
          We give you the checklist so you don't have to find out the hard way. */}
      <div className="nft-create-field">
        <label className="nft-create-label">Pre-Flight Checks</label>
        <ul className="nft-create-checks">
          <li>Wallet connected</li>
          <li>Metadata valid</li>
          <li>Supply matches assets</li>
          <li>Royalties under limit</li>
        </ul>
      </div>

      {/* ── Permanence warning ───────────────────────────────────────────── */}
      {/* The most important text on this screen. "Cannot be changed."
          Not "might be hard to change". Not "we recommend caution".
          Cannot. Be. Changed. The blockchain is not a text editor. */}
      <div className="nft-create-warning">Once deployed, collection settings cannot be changed.</div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      {/* Four buttons. Three are primary actions, one is utility.
          Deploy Collection: creates the collection, minting opens later.
          Deploy & Open Mint: creates and immediately opens minting.
          Save as Draft: saves progress without deploying. No SOL spent.
          Create new collection: resets the wizard. Start over. */}
      <div className="nft-create-footer-actions" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Save as Draft — always available, no wallet required.
            Because sometimes you're not ready. That's okay. */}
        <button type="button" className="nft-create-btn nft-create-btn-secondary" onClick={onSaveDraft}>
          Save as Draft
        </button>
        {/* Deploy Collection — primary action. Requires wallet. Immutable. */}
        <button type="button" className="nft-create-btn nft-create-btn-primary" disabled={!connected} aria-disabled={!connected}>
          Deploy Collection
        </button>
        {/* Deploy & Open Mint — deploys and immediately opens minting.
            For when you want to go from zero to live in one click.
            Also requires wallet. Also immutable. Also forever. */}
        <button type="button" className="nft-create-btn nft-create-btn-primary" disabled={!connected} aria-disabled={!connected}>
          Deploy &amp; Open Mint
        </button>
        {/* Create new collection — calls onStartNewCollection, resets the form.
            For the truly prolific. For the people who deploy six collections on a Tuesday. */}
        <button type="button" className="nft-create-btn nft-create-btn-back" onClick={onStartNewCollection}>
          Create new collection
        </button>
      </div>

      {/* Draft saved indicator — appears after saving.
          Green check. Small text. "✓ Draft saved". The quiet reassurance we all need. */}
      {draftSavedAt && <div className="nft-create-draft-saved">✓ Draft saved</div>}
    </div>
  )
}

// Coded by Juan — you shipped it. Against all odds, the transaction went through.
// The checklist was a formality. The warning was genuine. The permanence is real.
// Celebrate briefly, then start on the next thing.
