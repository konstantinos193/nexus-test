'use client'

/**
 * Create flow — Step 3: Deploy (Mint Phases).
 * Define mint phases with schedule, type, pricing, and allowlist.
 */

import { PhaseRow, toDateTimeLocal, getPhaseTimeError } from './create-types'

export interface CreateStep3DeployProps {
  phases: PhaseRow[]
  addPhase: () => void
  updatePhase: (i: number, field: keyof PhaseRow, value: string) => void
  setPhaseUseEndMint: (i: number, use: boolean) => void
  removePhase: (i: number) => void
  movePhase: (i: number, direction: -1 | 1) => void
}

export default function CreateStep3Deploy({
  phases,
  addPhase,
  updatePhase,
  setPhaseUseEndMint,
  removePhase,
  movePhase,
}: CreateStep3DeployProps) {
  return (
    <div className="nft-create-step-main nft-create-step3">
      <div className="nft-create-step3-header">
        <div className="nft-create-step3-header-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
          </svg>
        </div>
        <div className="nft-create-step3-header-text">
          <h2 className="nft-create-step3-title">Mint Phases</h2>
          <p className="nft-create-step3-subtitle">
            Schedule your launch with multiple mint phases — each with its own timing, price, and access rules.
          </p>
        </div>
      </div>

      {phases.length === 0 ? (
        <div className="nft-create-phase-empty-state">
          <div className="nft-create-phase-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3 className="nft-create-phase-empty-title">No mint phases yet</h3>
          <p className="nft-create-phase-empty-desc">
            Create phases to schedule your launch. Popular setups include a Whitelist phase followed by Public mint, or a single Public phase.
          </p>
          <button type="button" className="nft-create-phase-empty-cta" onClick={addPhase}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create First Phase
          </button>
        </div>
      ) : (
        <div className="nft-create-phase-container">
          <div className="nft-create-phase-list">
            {phases.map((phase, i) => (
              <div key={i} className={`nft-create-phase-card ${phase.phaseType === 'allowlist' ? 'nft-create-phase-card--allowlist' : ''}`}>
                <div className="nft-create-phase-card-header">
                  <div className="nft-create-phase-card-badge">
                    <span className="nft-create-phase-card-num">{i + 1}</span>
                  </div>
                  <div className="nft-create-phase-card-title-wrap">
                    <input
                      type="text"
                      className="nft-create-phase-card-title-input"
                      placeholder={phase.phaseType === 'allowlist' ? 'Whitelist Phase' : 'Public Phase'}
                      value={phase.name}
                      onChange={(e) => updatePhase(i, 'name', e.target.value)}
                    />
                    <span className={`nft-create-phase-card-type-tag ${phase.phaseType}`}>
                      {phase.phaseType === 'allowlist' ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          Allowlist
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M2 12h20"/>
                          </svg>
                          Public
                        </>
                      )}
                    </span>
                  </div>
                  <div className="nft-create-phase-card-actions">
                    <button
                      type="button"
                      className="nft-create-phase-action-btn"
                      onClick={() => movePhase(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="nft-create-phase-action-btn"
                      onClick={() => movePhase(i, 1)}
                      disabled={i === phases.length - 1}
                      title="Move down"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="nft-create-phase-action-btn nft-create-phase-action-btn--danger"
                      onClick={() => removePhase(i)}
                      title="Delete phase"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="nft-create-phase-card-body">
                  <div className="nft-create-phase-section nft-create-phase-section--type">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                      Access Type
                    </div>
                    <div className="nft-create-phase-type-toggle">
                      <button
                        type="button"
                        className={`nft-create-phase-type-btn ${phase.phaseType === 'public' ? 'active' : ''}`}
                        onClick={() => updatePhase(i, 'phaseType', 'public')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M2 12h20"/>
                        </svg>
                        Public
                      </button>
                      <button
                        type="button"
                        className={`nft-create-phase-type-btn ${phase.phaseType === 'allowlist' ? 'active' : ''}`}
                        onClick={() => updatePhase(i, 'phaseType', 'allowlist')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        Allowlist
                      </button>
                    </div>
                  </div>

                  <div className="nft-create-phase-section">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Schedule
                    </div>
                    <div className="nft-create-phase-schedule-grid">
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Start</label>
                        <input
                          type="datetime-local"
                          className="nft-create-phase-input"
                          value={phase.startDateTime || toDateTimeLocal(new Date())}
                          onChange={(e) => updatePhase(i, 'startDateTime', e.target.value)}
                        />
                      </div>
                      <div className="nft-create-phase-input-group">
                        <div className="nft-create-phase-end-toggle-row">
                          <label className="nft-create-phase-input-label">End mint</label>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={phase.useEndDateTime === 'true'}
                            className={`nft-create-phase-end-toggle ${phase.useEndDateTime === 'true' ? 'nft-create-phase-end-toggle--on' : ''}`}
                            onClick={() => setPhaseUseEndMint(i, phase.useEndDateTime !== 'true')}
                          >
                            <span className="nft-create-phase-end-toggle-track">
                              <span className="nft-create-phase-end-toggle-thumb" />
                            </span>
                            <span className="nft-create-phase-end-toggle-label">
                              {phase.useEndDateTime === 'true' ? 'On' : 'Off'}
                            </span>
                          </button>
                        </div>
                        {phase.useEndDateTime === 'true' && (
                          <input
                            type="datetime-local"
                            className="nft-create-phase-input nft-create-phase-input--end"
                            value={phase.endDateTime}
                            onChange={(e) => updatePhase(i, 'endDateTime', e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                    {getPhaseTimeError(phase) && (
                      <div className="nft-create-phase-error-banner">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {getPhaseTimeError(phase)}
                      </div>
                    )}
                  </div>

                  <div className="nft-create-phase-section">
                    <div className="nft-create-phase-section-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                      </svg>
                      Pricing &amp; Limits
                    </div>
                    <div className="nft-create-phase-settings-grid">
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">
                          Price
                          <span className="nft-create-phase-input-suffix">SOL</span>
                        </label>
                        <div className="nft-create-phase-input-with-icon">
                          <input
                            type="text"
                            className="nft-create-phase-input"
                            placeholder="0 = Free (leave empty for collection default)"
                            value={phase.priceOverride}
                            onChange={(e) => updatePhase(i, 'priceOverride', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Max per wallet</label>
                        <input
                          type="number"
                          className="nft-create-phase-input"
                          placeholder="Unlimited"
                          min={1}
                          value={phase.maxPerWallet}
                          onChange={(e) => updatePhase(i, 'maxPerWallet', e.target.value)}
                        />
                      </div>
                      <div className="nft-create-phase-input-group">
                        <label className="nft-create-phase-input-label">Phase supply</label>
                        <input
                          type="number"
                          className="nft-create-phase-input"
                          placeholder="Unlimited"
                          min={1}
                          value={phase.maxSupply}
                          onChange={(e) => updatePhase(i, 'maxSupply', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {phase.phaseType === 'allowlist' && (
                    <div className="nft-create-phase-section nft-create-phase-section--allowlist">
                      <div className="nft-create-phase-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="20" y1="8" x2="20" y2="14"/>
                          <line x1="23" y1="11" x2="17" y2="11"/>
                        </svg>
                        Allowlist Wallets
                        {phase.allowlistRaw.trim() && (
                          <span className="nft-create-phase-wallet-count">
                            {phase.allowlistRaw.split(/[\n,]+/).filter((a) => a.trim()).length} addresses
                          </span>
                        )}
                      </div>
                      <textarea
                        className="nft-create-phase-allowlist-input"
                        placeholder="Enter wallet addresses, one per line or comma-separated..."
                        rows={5}
                        value={phase.allowlistRaw}
                        onChange={(e) => updatePhase(i, 'allowlistRaw', e.target.value)}
                      />
                      <p className="nft-create-phase-allowlist-hint">
                        Tip: Paste from a spreadsheet or CSV file. Invalid addresses will be highlighted before deploy.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="nft-create-phase-add-btn" onClick={addPhase}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Another Phase
          </button>
        </div>
      )}
    </div>
  )
}
