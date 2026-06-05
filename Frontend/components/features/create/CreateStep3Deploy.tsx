'use client'

/**
 * CreateStep3Deploy - Step 3 of the older Create flow: Mint Phases.
 * Configure launch phases with timing, pricing, and allowlists.
 * Public phases: anyone can mint. Allowlist phases: only the chosen ones.
 * Both types get the same card UI, just with different badge colors and one extra section.
 *
 * Despite the file name saying "Deploy", this is actually the Phases step.
 * The naming predates the current flow structure. We've made peace with it.
 * (Naming things is hard. File renaming is harder. Let's move on.)
 *
 * "Just launch it" was never a strategy. This step proves it.
 * You want a whitelist? A public phase? A multi-tier rollout?
 * This is where you build that. Carefully. With intention.
 *
 * @author Juan - The developer who made phase scheduling not terrifying
 * and gave each phase a left border so you can tell them apart at a glance.
 * (Coded with care, humor, and a deep mistrust of "just open it to everyone".)
 */

// Phase types + helpers — PhaseRow is the data shape, toDateTimeLocal formats dates,
// getPhaseTimeError validates start/end ordering. One bad date ruins a launch.
import { PhaseRow, toDateTimeLocal, getPhaseTimeError } from './create-types'

// ── Props interface ────────────────────────────────────────────────────────────
// Five operations: add, update, setUseEndMint, remove, move.
// The parent owns the phases array. This component renders it + fires callbacks.
export interface CreateStep3DeployProps {
  phases: PhaseRow[]
  addPhase: () => void
  updatePhase: (i: number, field: keyof PhaseRow, value: string) => void
  // setPhaseUseEndMint — toggles the end date on/off for a specific phase.
  // Stored as 'true'/'false' strings because PhaseRow fields are all strings.
  // Yes, strings. We know. The PhaseRow type was there before the interface was pretty.
  setPhaseUseEndMint: (i: number, use: boolean) => void
  removePhase: (i: number) => void
  // movePhase — reorders phases. -1 = move up, 1 = move down.
  // The UI disables up on index 0 and down on the last index. We're not monsters.
  movePhase: (i: number, direction: -1 | 1) => void
}

/**
 * CreateStep3Deploy — renders the phase list or an empty state.
 * Empty state has a "Create First Phase" CTA that actually adds a phase.
 * Phase list has a card per phase + an "Add Another Phase" button at the bottom.
 * Each card has: header (name, type, actions), body (type, schedule, pricing, allowlist).
 */
export default function CreateStep3Deploy({ phases, addPhase, updatePhase, setPhaseUseEndMint, removePhase, movePhase }: CreateStep3DeployProps) {
  return (
    <div className="nft-create-step-main nft-create-step3">

      {/* Step header — calendar icon + title + subtitle.
          "Schedule your launch" because a surprise launch is a bad launch. */}
      <div className="nft-create-step3-header">
        <div className="nft-create-step3-header-icon">
          {/* Calendar SVG — inline because lucide-react wasn't imported in this version.
              It's a calendar. It looks like one. It's fine. */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
          </svg>
        </div>
        <div className="nft-create-step3-header-text">
          <h2 className="nft-create-step3-title">Mint Phases</h2>
          <p className="nft-create-step3-subtitle">Schedule your launch with multiple mint phases — each with its own timing, price, and access rules.</p>
        </div>
      </div>

      {/* Empty state OR phase list — no phases shows the CTA, phases show the cards. */}
      {phases.length === 0 ? (

        // ── Empty state ────────────────────────────────────────────────────────
        // A big clock icon, a title, a description, and a button.
        // "No mint phases yet" — descriptive, not judgmental.
        // "Create First Phase" — optimistic, imperative. We believe in you.
        <div className="nft-create-phase-empty-state">
          <div className="nft-create-phase-empty-icon">
            {/* Clock SVG — time waits for no one, but your launch schedule can wait for configuration. */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3 className="nft-create-phase-empty-title">No mint phases yet</h3>
          <p className="nft-create-phase-empty-desc">Create phases to schedule your launch. Popular setups include a Whitelist phase followed by Public mint.</p>
          {/* CTA — calls addPhase. That's it. One click to go from zero to phase one. */}
          <button type="button" className="nft-create-phase-empty-cta" onClick={addPhase}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create First Phase
          </button>
        </div>

      ) : (

        // ── Phase list ─────────────────────────────────────────────────────────
        // One card per phase. Cards have a header + body. Body has four sections:
        // Access Type, Schedule, Pricing & Limits, and (for allowlist phases) Allowlist.
        <div className="nft-create-phase-container">
          <div className="nft-create-phase-list">
            {phases.map((phase, i) => (
              // Phase card — allowlist phases get the --allowlist modifier class.
              // That adds a purple tint to visually distinguish them from public phases.
              <div key={i} className={`nft-create-phase-card ${phase.phaseType === 'allowlist' ? 'nft-create-phase-card--allowlist' : ''}`}>

                {/* ── Card header ─────────────────────────────────────────── */}
                {/* Phase number badge, name input, type tag, and action buttons. */}
                <div className="nft-create-phase-card-header">
                  {/* Phase number badge — so you know this is Phase 1 of 3, not Phase Untitled. */}
                  <div className="nft-create-phase-card-badge"><span className="nft-create-phase-card-num">{i + 1}</span></div>

                  {/* Name input — inline edit. Placeholder adapts to phase type. */}
                  <div className="nft-create-phase-card-title-wrap">
                    <input
                      type="text"
                      className="nft-create-phase-card-title-input"
                      placeholder={phase.phaseType === 'allowlist' ? 'Whitelist Phase' : 'Public Phase'}
                      value={phase.name}
                      onChange={(e) => updatePhase(i, 'name', e.target.value)}
                    />
                    {/* Type tag — lock icon for allowlist, globe for public. Visual shorthand. */}
                    <span className={`nft-create-phase-card-type-tag ${phase.phaseType}`}>
                      {phase.phaseType === 'allowlist' ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Allowlist</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg> Public</>
                      )}
                    </span>
                  </div>

                  {/* Action buttons: move up, move down, delete.
                      Move up disabled on first phase. Move down disabled on last phase.
                      Delete always available. Phases can always be removed, even the first one.
                      (You can't delete what hasn't been saved to chain yet. Clean slate.) */}
                  <div className="nft-create-phase-card-actions">
                    <button type="button" className="nft-create-phase-action-btn" onClick={() => movePhase(i, -1)} disabled={i === 0} title="Move up">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button type="button" className="nft-create-phase-action-btn" onClick={() => movePhase(i, 1)} disabled={i === phases.length - 1} title="Move down">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    {/* Delete — red hover state because this is a destructive action.
                        We don't confirm. This is a draft. Undo is "add it back". */}
                    <button type="button" className="nft-create-phase-action-btn nft-create-phase-action-btn--danger" onClick={() => removePhase(i)} title="Delete phase">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>

                {/* ── Card body ────────────────────────────────────────────── */}
                <div className="nft-create-phase-card-body">

                  {/* Access Type toggle — Public vs Allowlist.
                      Clicking a button updates phaseType. The card CSS changes accordingly.
                      Visual feedback is immediate because we're not savages. */}
                  <div className="nft-create-phase-section nft-create-phase-section--type">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      Access Type
                    </div>
                    <div className="nft-create-phase-type-toggle">
                      {/* Public button — globe icon */}
                      <button type="button" className={`nft-create-phase-type-btn ${phase.phaseType === 'public' ? 'active' : ''}`} onClick={() => updatePhase(i, 'phaseType', 'public')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>
                        Public
                      </button>
                      {/* Allowlist button — lock icon */}
                      <button type="button" className={`nft-create-phase-type-btn ${phase.phaseType === 'allowlist' ? 'active' : ''}`} onClick={() => updatePhase(i, 'phaseType', 'allowlist')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Allowlist
                      </button>
                    </div>
                  </div>

                  {/* Schedule section — start date (required) + optional end date.
                      End date is toggled on/off with a switch. Off by default.
                      "End mint" toggle uses setPhaseUseEndMint — stored as string 'true'/'false'. */}
                  <div className="nft-create-phase-section">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Schedule
                    </div>
                    <div className="nft-create-phase-schedule-grid">
                      {/* Start date — required. toDateTimeLocal(new Date()) sets today as default. */}
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Start</label>
                        <input type="datetime-local" className="nft-create-phase-input" value={phase.startDateTime || toDateTimeLocal(new Date())} onChange={(e) => updatePhase(i, 'startDateTime', e.target.value)} />
                      </div>
                      {/* End date — optional toggle. Input only renders when useEndDateTime === 'true'. */}
                      <div className="nft-create-phase-input-group">
                        <div className="nft-create-phase-end-toggle-row">
                          <label className="nft-create-phase-input-label">End mint</label>
                          {/* Toggle switch — controls useEndDateTime. On/Off label changes. */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={phase.useEndDateTime === 'true'}
                            className={`nft-create-phase-end-toggle ${phase.useEndDateTime === 'true' ? 'nft-create-phase-end-toggle--on' : ''}`}
                            onClick={() => setPhaseUseEndMint(i, phase.useEndDateTime !== 'true')}
                          >
                            <span className="nft-create-phase-end-toggle-track"><span className="nft-create-phase-end-toggle-thumb" /></span>
                            <span className="nft-create-phase-end-toggle-label">{phase.useEndDateTime === 'true' ? 'On' : 'Off'}</span>
                          </button>
                        </div>
                        {/* End date input — conditional, only when toggle is on */}
                        {phase.useEndDateTime === 'true' && (
                          <input type="datetime-local" className="nft-create-phase-input nft-create-phase-input--end" value={phase.endDateTime} onChange={(e) => updatePhase(i, 'endDateTime', e.target.value)} />
                        )}
                      </div>
                    </div>
                    {/* Time validation error — end must be after start.
                        getPhaseTimeError checks this. If it fires, the user is warned.
                        We don't block the form — we warn and let them proceed. Bravely. */}
                    {getPhaseTimeError(phase) && (
                      <div className="nft-create-phase-error-banner">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {getPhaseTimeError(phase)}
                      </div>
                    )}
                  </div>

                  {/* Pricing & Limits — price override, max per wallet, phase supply.
                      All optional. Leave blank for collection defaults or unlimited. */}
                  <div className="nft-create-phase-section">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                      Pricing &amp; Limits
                    </div>
                    <div className="nft-create-phase-settings-grid">
                      {/* Price — SOL amount. 0 = free. Blank = inherit collection default.
                          The placeholder explains this so we don't have to write a tooltip. */}
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Price <span className="nft-create-phase-input-suffix">SOL</span></label>
                        <input type="text" className="nft-create-phase-input" placeholder="0 = Free (leave empty for collection default)" value={phase.priceOverride} onChange={(e) => updatePhase(i, 'priceOverride', e.target.value)} />
                      </div>
                      {/* Max per wallet — prevents one whale from minting everything.
                          Blank = unlimited. Some launches prefer chaos. We respect that. */}
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Max per wallet</label>
                        <input type="number" className="nft-create-phase-input" placeholder="Unlimited" min={1} value={phase.maxPerWallet} onChange={(e) => updatePhase(i, 'maxPerWallet', e.target.value)} />
                      </div>
                      {/* Phase supply — limits how many NFTs this phase can distribute.
                          Useful for "Allowlist gets first 500" type configurations. */}
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Phase supply</label>
                        <input type="number" className="nft-create-phase-input" placeholder="Unlimited" min={1} value={phase.maxSupply} onChange={(e) => updatePhase(i, 'maxSupply', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Allowlist section — only renders for allowlist phases.
                      Textarea: one address per line or comma-separated.
                      Address count shown live — counts non-empty splits. Informative, not validating.
                      We count. We don't validate individual addresses here. That's deploy's job. */}
                  {phase.phaseType === 'allowlist' && (
                    <div className="nft-create-phase-section nft-create-phase-section--allowlist">
                      <div className="nft-create-phase-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                        Allowlist Wallets
                        {/* Live address count — filters empty splits after splitting by newline/comma. */}
                        {phase.allowlistRaw.trim() && (
                          <span className="nft-create-phase-wallet-count">{phase.allowlistRaw.split(/[\n,]+/).filter((a) => a.trim()).length} addresses</span>
                        )}
                      </div>
                      {/* Allowlist textarea — paste from CSV, spreadsheet, or type manually.
                          5 rows visible. More scroll. Paste from wherever. We accept everything. */}
                      <textarea
                        className="nft-create-phase-allowlist-input"
                        placeholder="Enter wallet addresses, one per line or comma-separated..."
                        rows={5}
                        value={phase.allowlistRaw}
                        onChange={(e) => updatePhase(i, 'allowlistRaw', e.target.value)}
                      />
                      {/* Hint — "Tip: Paste from a spreadsheet or CSV file." because that's
                          genuinely how most people prepare allowlists. We're helpful. */}
                      <p className="nft-create-phase-allowlist-hint">Tip: Paste from a spreadsheet or CSV file.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Phase — at the bottom of the list.
              Always visible when there's at least one phase.
              Click it. Add another. Build the most elaborate phase structure in NFT history.
              We're not stopping you. */}
          <button type="button" className="nft-create-phase-add-btn" onClick={addPhase}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Another Phase
          </button>
        </div>
      )}
    </div>
  )
}

// Coded by Juan — phases, schedules, allowlists, phase supply caps, and a move-up/move-down
// reorder system because "just put the public phase first" is easier said than done.
// Launch like a professional. The clock icon demands it.
