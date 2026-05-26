'use client'

/**
 * MintPhasesForm - Step 3: Supply, pricing, and mint phase configuration.
 * Standard inputs for supply and price, quick-start templates, and per-phase config cards.
 * Each phase gets a colored left border — cyan for public, purple for allowlist.
 * (Because a list of identical grey boxes is nobody's idea of a good mint experience.)
 *
 * Templates are just preset phase arrays — no magic, no API, just setPhases([...]).
 * Allowlist counter counts non-empty lines. It doesn't validate addresses. That's deploy's job.
 *
 * @author Juan - The developer who gave phases a left border and a reason to live
 * (Coded with care, humor, and probably too much coffee)
 */

import { useEffect, useRef, useState } from 'react'
import {
  Plus, Trash2, ArrowRight, ArrowLeft, AlertCircle,
  ChevronDown, ChevronUp,
  Coins,
  Globe,
  Shield,
  Zap,
  GitBranch,
  Sparkles,
  Pencil,
  LockKeyhole,
} from 'lucide-react'
import Button from '@/components/ui/Button'
// Custom calendar popover — knows the user's timezone, unlike the native input
import DateTimePicker from '@/components/ui/DateTimePicker'
import type { MintPhase } from '@/hooks/useCreateCollectionForm'
import type { ShareAddressRow } from '@/components/features/create/create-types'
import { ROYALTY_SPLIT_MAX } from '@/components/features/create/create-types'

interface MintPhasesFormProps {
  totalSupply:    number
  mintPrice:      number | ''
  setMintPrice:   (v: number | '') => void
  freeMint:       boolean
  setFreeMint:    (v: boolean) => void
  phases:         MintPhase[]
  setPhases:      (p: MintPhase[]) => void
  fundReceivers:               ShareAddressRow[]
  updateFundReceiver:          (i: number, field: 'share' | 'address', value: string) => void
  addFundReceiver:             () => void
  removeFundReceiver:          (i: number) => void
  distributeFundReceiversEvenly:    () => void
  autoFillFundReceiversRemainder:   () => void
  fundReceiverTotal:           number
  fundReceiverError:           string | null
  walletAddress:               string | null
  onNext:         () => void
  onBack:         () => void
}

// Truncate a Solana address for display — first 6 + last 4 chars
function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Quick-start templates — clicking one replaces the phases array wholesale
const PHASE_TEMPLATES = [
  {
    id: 'public',
    label: 'Public Sale',
    subtitle: 'One open phase, anyone can mint',
    Icon: Zap,
    phases: [{ name: 'Public Sale', phaseType: 'public' as const, startDateTime: '' }],
  },
  {
    id: 'allowlist-public',
    label: 'Allowlist → Public',
    subtitle: 'Early access, then open to all',
    Icon: GitBranch,
    phases: [
      { name: 'Allowlist',   phaseType: 'allowlist' as const, startDateTime: '' },
      { name: 'Public Sale', phaseType: 'public'    as const, startDateTime: '' },
    ],
  },
  {
    id: 'multi',
    label: 'Multi-Phase',
    subtitle: '3-tier: allowlist, early bird, public',
    Icon: Sparkles,
    phases: [
      { name: 'Allowlist',   phaseType: 'allowlist' as const, startDateTime: '' },
      { name: 'Early Bird',  phaseType: 'public'    as const, startDateTime: '' },
      { name: 'Public Sale', phaseType: 'public'    as const, startDateTime: '' },
    ],
  },
]

// Detects which template matches the current phases by phaseType signature
function detectActiveTemplate(phases: MintPhase[]): string | null {
  const sig = phases.map(p => p.phaseType).join(',')
  if (phases.length === 1 && sig === 'public')                     return 'public'
  if (phases.length === 2 && sig === 'allowlist,public')           return 'allowlist-public'
  if (phases.length === 3 && sig === 'allowlist,public,public')    return 'multi'
  return null
}

function PhaseCard({
  phase, index, total,
  onChange, onRemove,
}: {
  phase:    MintPhase
  index:    number
  total:    number
  onChange: (p: MintPhase) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  function set<K extends keyof MintPhase>(key: K, value: MintPhase[K]) {
    onChange({ ...phase, [key]: value })
  }

  // Live count of non-empty lines in the allowlist textarea
  const addressCount = phase.allowlistRaw
    ? phase.allowlistRaw.split('\n').filter(l => l.trim().length > 0).length
    : 0

  return (
    <div
      className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary overflow-hidden border-l-2"
      style={{ borderLeftColor: phase.phaseType === 'public' ? '#00d4ff' : '#7c3aed' }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border-primary">
        {/* Colored phase number badge */}
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          phase.phaseType === 'public'
            ? 'bg-dark-accent-primary/15 text-dark-accent-primary'
            : 'bg-dark-accent-secondary/15 text-dark-accent-secondary'
        }`}>
          {index + 1}
        </span>
        <input
          type="text"
          value={phase.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Phase name"
          className="flex-1 bg-transparent text-sm font-medium text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none"
        />
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Public / Allowlist toggle with Globe/Shield icons */}
          <div className="flex rounded-lg overflow-hidden border border-dark-border-primary text-xs">
            {(['public', 'allowlist'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('phaseType', t)}
                className={`flex items-center gap-1 px-2.5 py-1 font-medium transition-colors capitalize ${
                  phase.phaseType === t
                    ? t === 'public'
                        ? 'bg-dark-accent-primary/15 text-dark-accent-primary'
                        : 'bg-dark-accent-secondary/15 text-dark-accent-secondary'
                    : 'text-dark-text-tertiary hover:text-dark-text-secondary'
                }`}
              >
                {t === 'public' ? <Globe className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setExpanded(v => !v)} className="text-dark-text-tertiary hover:text-dark-text-secondary transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {total > 1 && (
            <button type="button" onClick={onRemove} className="text-dark-text-tertiary hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-dark-text-tertiary mb-1.5">
              Start Date & Time <span className="text-dark-accent-error">*</span>
            </label>
            <DateTimePicker
              required
              value={phase.startDateTime}
              onChange={(v) => set('startDateTime', v)}
              placeholder="Pick start date & time"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-text-tertiary mb-1.5">
              End Date & Time <span className="text-dark-text-quaternary">(optional)</span>
            </label>
            <DateTimePicker
              value={phase.endDateTime ?? ''}
              onChange={(v) => set('endDateTime', v || undefined)}
              placeholder="No end date"
            />
          </div>
          <div>
            <label className="block text-xs text-dark-text-tertiary mb-1.5">
              Price Override <span className="text-dark-text-quaternary">(blank = global price)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={0.01}
                value={phase.priceOverride ?? ''}
                onChange={(e) => set('priceOverride', e.target.value || undefined)}
                placeholder="e.g. 0.5"
                className="w-full px-3 py-2 pr-12 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
              />
              <img src="/svg/solana-sol-logo.svg" alt="SOL" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark-text-tertiary mb-1.5">
              Max Per Wallet <span className="text-dark-text-quaternary">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              value={phase.maxPerWallet ?? ''}
              onChange={(e) => set('maxPerWallet', e.target.value || undefined)}
              placeholder="Unlimited"
              className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors"
            />
          </div>
          {phase.phaseType === 'allowlist' && (
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-dark-text-tertiary">
                  Allowlist Wallets <span className="text-dark-text-quaternary">(one address per line)</span>
                </label>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  addressCount > 0
                    ? 'bg-dark-accent-secondary/15 text-dark-accent-secondary'
                    : 'bg-dark-bg-tertiary text-dark-text-tertiary'
                }`}>
                  {addressCount} {addressCount === 1 ? 'address' : 'addresses'}
                </span>
              </div>
              <textarea
                rows={4}
                value={phase.allowlistRaw ?? ''}
                onChange={(e) => set('allowlistRaw', e.target.value || undefined)}
                placeholder={'Abc123...\nDef456...'}
                className="w-full px-3 py-2 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg text-sm font-mono text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MintPhasesForm({
  totalSupply,
  mintPrice,   setMintPrice,
  freeMint,    setFreeMint,
  phases,      setPhases,
  fundReceivers, updateFundReceiver, addFundReceiver, removeFundReceiver,
  distributeFundReceiversEvenly, autoFillFundReceiversRemainder,
  fundReceiverTotal, fundReceiverError,
  walletAddress,
  onNext, onBack,
}: MintPhasesFormProps) {
  const [error, setError] = useState<string | null>(null)

  // Tracks which rows are in edit mode — locked rows show a truncated address + pencil
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set())
  const prevLengthRef = useRef(fundReceivers.length)

  // Pre-fill row 0 with the connected wallet address when it first becomes available
  useEffect(() => {
    if (walletAddress && fundReceivers[0]?.address === '') {
      updateFundReceiver(0, 'address', walletAddress)
      // row 0 starts locked — not in editingRows
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  // When a new row is added, put it straight into edit mode
  useEffect(() => {
    if (fundReceivers.length > prevLengthRef.current) {
      setEditingRows(prev => new Set([...prev, fundReceivers.length - 1]))
    }
    prevLengthRef.current = fundReceivers.length
  }, [fundReceivers.length])

  // Derived — no useState needed. Highlights the matching template button.
  const activeTemplate = detectActiveTemplate(phases)

  function addPhase() {
    setPhases([...phases, { name: `Phase ${phases.length + 1}`, phaseType: 'public', startDateTime: '' }])
  }

  function updatePhase(i: number, p: MintPhase) {
    const next = [...phases]; next[i] = p; setPhases(next)
  }

  function removePhase(i: number) {
    setPhases(phases.filter((_, idx) => idx !== i))
  }

  // Wraps removeFundReceiver so editingRows indices stay in sync after a removal
  function handleRemoveFundReceiver(i: number) {
    removeFundReceiver(i)
    setEditingRows(prev => {
      const next = new Set<number>()
      prev.forEach(idx => {
        if (idx < i) next.add(idx)
        else if (idx > i) next.add(idx - 1)
      })
      return next
    })
  }

  function handleNext() {
    setError(null)
    const missingStart = phases.some(p => !p.startDateTime)
    if (missingStart) { setError('All phases need a start date and time.'); return }
    onNext()
  }

  return (
    <div className="space-y-7">

      {/* ── Section header ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-dark-text-primary">Mint Phases</h2>
        <p className="text-sm text-dark-text-tertiary mt-1">
          Set the total supply, mint price, and define who can mint when.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* ── Supply + Pricing ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-dark-text-secondary mb-2">
            Total Supply
          </label>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-dark-bg-secondary border border-dark-border-primary rounded-lg">
            <span className="text-sm font-semibold text-dark-text-primary">
              {totalSupply > 0 ? totalSupply.toLocaleString() : '—'}
            </span>
            <span className="ml-auto text-xs text-dark-text-tertiary">from uploaded files</span>
          </div>
        </div>

        <div>
          <label htmlFor="mint-price" className="block text-sm font-medium text-dark-text-secondary mb-2">
            Mint Price
          </label>
          <div className="relative">
            <input
              id="mint-price"
              type="number"
              min={0}
              step={0.01}
              value={freeMint ? '' : mintPrice}
              onChange={(e) => setMintPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g. 1.5"
              disabled={freeMint}
              className="w-full px-4 py-2.5 pr-9 bg-dark-bg-secondary border border-dark-border-primary rounded-lg text-sm text-dark-text-primary placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/50 focus:ring-1 focus:ring-dark-accent-primary/20 transition-colors disabled:opacity-40"
            />
            {/* Solana logo suffix — lives in /public/svg/ */}
            <img
              src="/svg/solana-sol-logo.svg"
              alt="SOL"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            />
          </div>
        </div>

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

      {/* ── Mint Proceeds Split ───────────────────────────────────────── */}
      {/* Where the primary sale SOL goes — not the same as royalties (secondary sales) */}
      <div className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary/50 p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-dark-accent-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Coins className="w-4 h-4 text-dark-accent-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-text-primary">Mint Proceeds Split</p>
            <p className="text-xs text-dark-text-tertiary mt-0.5">
              Where the primary sale SOL lands. Add multiple wallets — shares must total 100%.
            </p>
          </div>
        </div>

        {/* Helper actions + total */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={distributeFundReceiversEvenly}
            className="text-xs text-dark-text-tertiary hover:text-dark-text-secondary border border-dark-border-primary hover:border-dark-border-accent rounded-full px-3 py-1 transition-colors"
          >
            Distribute evenly
          </button>
          <button
            type="button"
            onClick={autoFillFundReceiversRemainder}
            className="text-xs text-dark-text-tertiary hover:text-dark-text-secondary border border-dark-border-primary hover:border-dark-border-accent rounded-full px-3 py-1 transition-colors"
          >
            Fill remainder
          </button>
          <div className={[
            'ml-auto text-xs font-medium px-2.5 py-1 rounded-full border',
            !fundReceiverError
              ? 'text-dark-accent-success border-dark-accent-success/30 bg-dark-accent-success/10'
              : 'text-amber-400 border-amber-400/30 bg-amber-400/10',
          ].join(' ')}>
            {fundReceiverTotal.toFixed(1)}% / 100%
          </div>
        </div>

        {/* Error banner */}
        {fundReceiverError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fundReceiverError}
          </div>
        )}

        {/* Recipient rows */}
        <div className="space-y-2">
          {fundReceivers.map((row, i) => (
            <div key={i} className="rounded-lg border border-dark-border-primary bg-dark-bg-tertiary overflow-hidden">
              {/* Share bar */}
              <div className="h-1 bg-dark-bg-secondary">
                <div
                  className="h-full bg-dark-accent-primary/50 transition-all duration-300"
                  style={{ width: `${Math.min(100, parseFloat(row.share) || 0)}%` }}
                />
              </div>
              <div className="flex gap-3 items-end p-3">
                {/* Share % */}
                <div className="w-20 shrink-0">
                  <label className="block text-[10px] text-dark-text-tertiary mb-1.5">Share %</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={row.share}
                      onChange={(e) => updateFundReceiver(i, 'share', e.target.value)}
                      className="w-full px-2.5 py-1.5 pr-5 bg-dark-bg-secondary border border-dark-border-primary rounded text-xs text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 transition-colors"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-dark-text-tertiary pointer-events-none">%</span>
                  </div>
                </div>
                {/* Address — locked display or editable input */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-[10px] text-dark-text-tertiary">Solana Address</label>
                    {row.address === walletAddress && row.address !== '' && (
                      <span className="text-[9px] font-medium text-dark-accent-success bg-dark-accent-success/10 border border-dark-accent-success/20 px-1.5 py-0.5 rounded-full leading-none">
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Locked state — truncated address + pencil to unlock */}
                  {!editingRows.has(i) && row.address !== '' ? (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-dark-bg-secondary border border-dark-border-primary rounded">
                      <code className="text-xs font-mono text-dark-text-secondary flex-1 truncate">
                        {truncateAddress(row.address)}
                      </code>
                      <button
                        type="button"
                        onClick={() => setEditingRows(prev => new Set([...prev, i]))}
                        className="text-dark-text-tertiary hover:text-dark-accent-primary transition-colors shrink-0"
                        title="Edit address"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Edit state — full input + lock button to confirm */
                    <div className="relative">
                      <input
                        type="text"
                        value={row.address}
                        onChange={(e) => updateFundReceiver(i, 'address', e.target.value)}
                        placeholder="Wallet address"
                        className="w-full px-2.5 py-1.5 pr-7 bg-dark-bg-secondary border border-dark-accent-primary/40 rounded text-xs text-dark-text-primary font-mono placeholder-dark-text-tertiary focus:outline-none focus:border-dark-accent-primary/60 transition-colors"
                        autoFocus={editingRows.has(i)}
                      />
                      {row.address !== '' && (
                        <button
                          type="button"
                          onClick={() => setEditingRows(prev => { const n = new Set(prev); n.delete(i); return n })}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-text-tertiary hover:text-dark-accent-primary transition-colors"
                          title="Lock address"
                        >
                          <LockKeyhole className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Remove */}
                {fundReceivers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFundReceiver(i)}
                    className="text-dark-text-tertiary hover:text-red-400 transition-colors pb-1.5 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add recipient */}
        <button
          type="button"
          onClick={addFundReceiver}
          disabled={fundReceivers.length >= ROYALTY_SPLIT_MAX}
          className="flex items-center gap-1.5 text-xs text-dark-accent-primary hover:text-dark-accent-primary/80 transition-colors font-medium disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" /> Add recipient
        </button>

      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t border-dark-border-primary" />

      {/* ── Quick Templates ───────────────────────────────────────────── */}
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

      {/* ── Phases ────────────────────────────────────────────────────── */}
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

      {/* ── Timeline strip ────────────────────────────────────────────── */}
      {phases.length > 0 && (
        <div className="space-y-1.5 pt-1">
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
              <p key={i} className="flex-1 text-center text-xs text-dark-text-tertiary truncate">{phase.name || `Phase ${i + 1}`}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="border-t border-dark-border-primary" />

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        <Button type="button" variant="primary" onClick={handleNext}>
          Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}

// Coded by Juan - phases configured, supply set, prices locked in.
// The timeline strip is 3 lines of code and somehow makes the whole form feel alive.
// P.S. - If it's a free mint, congrats. The collectors love you already.
