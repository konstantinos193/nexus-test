'use client'

/**
 * FreezeUntilDatePicker - A fully custom date-time picker built entirely from scratch.
 * Opens a calendar popover rendered at document.body level via a React portal.
 * Why a portal? Because parent `overflow: hidden` clips absolutely-positioned children.
 * A portal sidesteps that completely. We live at the body level now.
 *
 * Features:
 * - Month/day calendar grid with keyboard navigation via ESC to close.
 * - Time inputs (hour + minute) in local time. No UTC confusion.
 * - "Now" quick button (clamped to minDate), "Clear" to reset, "Apply" to confirm.
 * - minDate support — disabled days are unclickable and visually muted.
 * - Popover position tracked from the trigger's getBoundingClientRect.
 *   When the trigger moves (scroll, resize), the popover position updates on open.
 *
 * Value format: "YYYY-MM-DDTHH:mm" — the datetime-local string format.
 * Timezone: user's local timezone. We don't fight the browser on this one.
 * The calendar works in local time. The blockchain converts from there. Fine.
 *
 * @author Juan - The developer who built a calendar from scratch in React,
 * questioned every decision exactly once at 2am, and shipped it anyway.
 * (Coded with care, humor, and a browser-testing session that could have been
 * solved by just using a native input. It couldn't, though. It really couldn't.)
 */

// React's full toolkit — ref for trigger + popover positioning,
// effect for click-outside + escape key, state for open/viewDate/selectedDate/time,
// callback for value sync. All of them. We use all of them.
import React, { useRef, useEffect, useState, useCallback } from 'react'

// createPortal — renders the popover at document.body, escaping parent clip contexts.
// Without this, any ancestor with overflow:hidden would eat our calendar alive.
import { createPortal } from 'react-dom'

// WEEKDAYS — displayed as column headers. Three-letter abbreviations.
// Sun through Sat. We don't customize this per locale. Scope creep is a silent killer.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Date helpers ──────────────────────────────────────────────────────────────

// toLocalDate — parses a datetime-local string into a Date object.
// Returns null for empty/invalid strings so the UI can show the placeholder.
// NaN check prevents silent "Invalid Date" objects from propagating.
function toLocalDate(value: string): Date | null {
  if (!value || value.trim() === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// toDatetimeLocalString — serializes a Date into "YYYY-MM-DDTHH:mm".
// This is what the parent receives via onChange. Matches datetime-local input format.
// Padded manually because toISOString() is UTC and we're in local time. Not the same thing.
function toDatetimeLocalString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

// formatDisplay — converts a Date to human-readable "medium date, short time".
// Shown in the trigger button text when a date is selected.
// Uses the browser's locale. Whatever language the user speaks, that language gets the date.
function formatDisplay(d: Date): string {
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// getMonthDays — builds the full 6-week (or shorter) calendar grid for the given month.
// Pads the start with nulls to align with the correct day-of-week column.
// Returns (number | null)[] — null = empty grid cell, number = day in month.
function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()   // 0 = Sunday start
  const daysInMonth = last.getDate()
  const rows = Math.ceil((startPad + daysInMonth) / 7) * 7
  const out: (number | null)[] = []
  // Fill leading empty cells
  for (let i = 0; i < startPad; i++) out.push(null)
  // Fill actual days
  for (let d = 1; d <= daysInMonth; d++) out.push(d)
  // Fill trailing empty cells to complete the final row
  while (out.length < rows) out.push(null)
  return out
}

// ── Props interface ────────────────────────────────────────────────────────────
// Minimal surface area. id, value, onChange, and optional min/placeholder/className.
export interface FreezeUntilDatePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  // min — optional lower bound. Days before minDate are disabled in the calendar.
  min?: string
  placeholder?: string
  className?: string
}

/**
 * FreezeUntilDatePicker — the main component.
 * Trigger button shows the formatted date or a placeholder.
 * Calendar popover appears below the trigger (portal-rendered at body level).
 */
export default function FreezeUntilDatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = 'Pick date & time',
  className = '',
}: FreezeUntilDatePickerProps) {
  // containerRef — the wrapper div around the trigger. Click-outside checks this.
  const containerRef = useRef<HTMLDivElement>(null)

  // triggerRef — the trigger button. We measure its getBoundingClientRect to position the popover.
  const triggerRef = useRef<HTMLButtonElement>(null)

  // popoverRef — the popover div. Click-inside the popover should NOT close it.
  const popoverRef = useRef<HTMLDivElement>(null)

  // open — whether the calendar popover is visible.
  const [open, setOpen] = useState(false)

  // popoverPos — fixed-position coords for the portal. Set on open, from trigger rect.
  // top + left because fixed positioning needs absolute screen coordinates.
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)

  // Parse initial/current values for local state initialization.
  // These are only used to seed state — changes to `value` prop are synced via syncFromValue.
  const initial = toLocalDate(value)
  const minDate = min ? toLocalDate(min) : null

  // viewDate — the month currently displayed in the calendar.
  // Starts at the selected date's month, or the current month, or minDate's month.
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (initial) return new Date(initial.getFullYear(), initial.getMonth(), 1)
    const now = new Date()
    // If today is before minDate, start at minDate's month instead of today.
    // Otherwise the user opens the calendar and can't click anything. Rude.
    if (minDate && now < minDate) return new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // selectedDate — the currently highlighted day. Null until a day is clicked.
  const [selectedDate, setSelectedDate] = useState<Date | null>(initial)

  // hour + minute — time portion of the selected datetime. Defaults to 12:00.
  // Stored as numbers so arithmetic is straightforward.
  const [hour, setHour] = useState(initial ? initial.getHours() : 12)
  const [minute, setMinute] = useState(initial ? initial.getMinutes() : 0)

  // syncFromValue — re-derives local state from the `value` prop.
  // Called when the prop changes externally (e.g., parent clears the value).
  // useCallback so the useEffect dependency array stays stable.
  const syncFromValue = useCallback(() => {
    const d = toLocalDate(value)
    setSelectedDate(d)
    if (d) {
      setHour(d.getHours())
      setMinute(d.getMinutes())
      // Jump the calendar view to the selected date's month
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [value])

  // Sync local state when value prop changes from the outside.
  useEffect(() => { syncFromValue() }, [value, syncFromValue])

  // Position the popover directly below the trigger when opening.
  // rect.bottom + 6px gap = the top of the popover. rect.left = left edge.
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopoverPos({ top: rect.bottom + 6, left: rect.left })
  }, [open])

  // Click-outside + Escape key handlers — close the popover when user clicks away.
  // Checks both containerRef (trigger area) and popoverRef (calendar area).
  // Click inside either → stay open. Click outside both → close.
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  // handleSelectDay — called when a calendar day cell is clicked.
  // Constructs the full datetime from the selected day + current hour/minute state.
  // Respects minDate — disabled days are unclickable but we double-check here.
  const handleSelectDay = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, hour, minute)
    if (minDate && d < minDate) return
    setSelectedDate(d)
  }

  // handleTimeChange — updates hour and minute, then updates the selectedDate if one exists.
  // We keep hour/minute as independent state so time can be set before a day is picked.
  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour)
    setMinute(newMinute)
    if (selectedDate) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), newHour, newMinute)
      setSelectedDate(d)
    }
  }

  // handleApply — confirms the selection and calls onChange.
  // Constructs final datetime from selectedDate + current hour/minute.
  // Respects minDate one more time (belt and suspenders).
  // Closes the popover on apply.
  const handleApply = () => {
    if (selectedDate) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute)
      if (minDate && d < minDate) return
      onChange(toDatetimeLocalString(d))
    }
    setOpen(false)
  }

  // handleClear — resets selectedDate to null and calls onChange with empty string.
  // Closes the popover. The trigger goes back to showing the placeholder.
  const handleClear = () => { setSelectedDate(null); onChange(''); setOpen(false) }

  // handleQuickNow — sets selectedDate + time to right now.
  // Respects minDate (can't set "now" if "now" is before the minimum).
  // Updates the calendar view to the current month.
  const handleQuickNow = () => {
    const now = new Date()
    if (minDate && now < minDate) return
    setSelectedDate(now)
    setHour(now.getHours())
    setMinute(now.getMinutes())
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  // Derived calendar display state — year, month number, month label string, day grid.
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const days = getMonthDays(viewYear, viewMonth)

  // isDayDisabled — returns true if this day is before minDate.
  // We compare date-only (ignore time) so a day on minDate is still selectable.
  const isDayDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    return minDate ? d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : false
  }

  // isDaySelected — returns true if this day matches the currently selected date.
  // Checks year + month + day so time differences don't cause false negatives.
  const isDaySelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear

  return (
    // Wrapper div — containerRef for click-outside detection. className passes through.
    <div ref={containerRef} className={`nft-create-freeze-until-picker-wrap ${className}`}>

      {/* Trigger button — shows formatted date or placeholder text.
          Clicking toggles the popover. aria-haspopup="dialog" for AT users.
          aria-expanded reflects open state so screen readers know what's happening. */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Unfreeze at date (optional). Opens calendar."
        className="nft-create-freeze-until-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Trigger text — selected date formatted, or placeholder if no selection.
            empty-placeholder class applies muted styling to the placeholder text. */}
        <span className={`nft-create-freeze-until-trigger-text ${!value ? 'empty-placeholder' : ''}`}>
          {value ? formatDisplay(toLocalDate(value)!) : placeholder}
        </span>
        {/* Calendar icon — the universal "I am a date picker" signal. */}
        <span className="nft-create-freeze-until-trigger-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </button>

      {/* Portal popover — only rendered when open + positioned + we're in a browser.
          document.body is the render target. Fixed positioning + high z-index.
          role="dialog" + aria-label for accessibility. */}
      {open && popoverPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className="nft-create-freeze-until-popover"
            role="dialog"
            aria-label="Pick unfreeze date and time (local time)"
            style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 99999 }}
          >

            {/* ── Calendar section ─────────────────────────────────────── */}
            <div className="nft-create-freeze-until-calendar">

              {/* Month navigation header — previous/next buttons + month+year label.
                  Clicking previous wraps December back to November of the year before.
                  Clicking next wraps January forward. Month arithmetic, done correctly. */}
              <div className="nft-create-freeze-until-calendar-header">
                <button
                  type="button"
                  className="nft-create-freeze-until-nav"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="nft-create-freeze-until-month-label">{monthLabel}</span>
                <button
                  type="button"
                  className="nft-create-freeze-until-nav"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
              </div>

              {/* Weekday headers — Sun Mon Tue Wed Thu Fri Sat.
                  Purely presentational. No interaction. They're just labels. */}
              <div className="nft-create-freeze-until-weekdays">
                {WEEKDAYS.map((w) => <span key={w} className="nft-create-freeze-until-weekday">{w}</span>)}
              </div>

              {/* Day grid — 7 columns, 4-6 rows depending on the month.
                  null cells = empty (padding). Number cells = clickable days.
                  Disabled days get the disabled class + disabled prop. */}
              <div className="nft-create-freeze-until-grid">
                {days.map((day, i) =>
                  // Empty grid cell — no interaction, no content, just takes up space
                  day === null ? (
                    <span key={`e-${i}`} className="nft-create-freeze-until-day empty" />
                  ) : (
                    // Day cell — selected + disabled states drive class names.
                    // Key includes year+month+day to prevent stale identity across month navigation.
                    <button
                      key={`${viewYear}-${viewMonth}-${day}`}
                      type="button"
                      className={`nft-create-freeze-until-day ${isDaySelected(day) ? 'selected' : ''} ${isDayDisabled(day) ? 'disabled' : ''}`}
                      onClick={() => handleSelectDay(day)}
                      disabled={isDayDisabled(day)}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* ── Time section ─────────────────────────────────────────── */}
            {/* Hour and minute inputs — numeric, local time.
                Hour: 0-23. Minute: 0-59. Both clamped on blur.
                Changes update both the local state and (if a day is selected) the selectedDate. */}
            <div className="nft-create-freeze-until-time">
              <span className="nft-create-freeze-until-time-label">Time (local)</span>
              <div className="nft-create-freeze-until-time-inputs">
                <div className="nft-create-freeze-until-time-field">
                  <label htmlFor={`${id}-hour`} className="nft-create-freeze-until-time-field-label">Hour</label>
                  <input
                    id={`${id}-hour`}
                    type="number"
                    min={0}
                    max={23}
                    value={hour}
                    onChange={(e) => handleTimeChange(Number(e.target.value) || 0, minute)}
                    onBlur={(e) => handleTimeChange(Math.min(23, Math.max(0, Number(e.target.value) || 0)), minute)}
                    className="nft-create-freeze-until-time-input"
                  />
                </div>
                {/* Separator — the colon between hour and minute. It earns its place. */}
                <span className="nft-create-freeze-until-time-sep">:</span>
                <div className="nft-create-freeze-until-time-field">
                  <label htmlFor={`${id}-minute`} className="nft-create-freeze-until-time-field-label">Min</label>
                  <input
                    id={`${id}-minute`}
                    type="number"
                    min={0}
                    max={59}
                    value={String(minute).padStart(2, '0')}
                    onChange={(e) => handleTimeChange(hour, Number(e.target.value) || 0)}
                    onBlur={(e) => handleTimeChange(hour, Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
                    className="nft-create-freeze-until-time-input"
                  />
                </div>
              </div>
            </div>

            {/* ── Action buttons ────────────────────────────────────────── */}
            {/* Now: jump to current time (clamped to minDate).
                Clear: reset the value entirely.
                Apply: confirm selection and call onChange. The important button. */}
            <div className="nft-create-freeze-until-actions">
              <button type="button" className="nft-create-freeze-until-btn secondary" onClick={handleQuickNow}>Now</button>
              <button type="button" className="nft-create-freeze-until-btn secondary" onClick={handleClear}>Clear</button>
              <button type="button" className="nft-create-freeze-until-btn primary" onClick={handleApply}>Apply</button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

// Coded by Juan — a full calendar component built from first principles.
// Portal-rendered to escape overflow:hidden ancestors. minDate-aware. Local timezone.
// Three action buttons. A month navigator. A 7×6 grid of days.
// It started as "just a date input". It became something more.
// We're not upset about it. We're almost proud.
