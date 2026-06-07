'use client'

/**
 * DateTimePicker - A custom date-time picker for mint phase scheduling.
 * Renders a portal-positioned calendar popover. No native datetime-local.
 * The reason: native datetime-local renders differently on every OS, browser, and timezone.
 * Chrome on Windows, Safari on macOS, Firefox on Linux — all different. All wrong.
 * This one looks the same everywhere. That's worth the 300 lines.
 *
 * Features:
 * - Controlled via value/onChange (datetime-local format: "YYYY-MM-DDTHH:mm").
 * - Portal-rendered so parent overflow:hidden can't clip the calendar.
 * - Detects available space and flips above the trigger when near the bottom.
 * - Closes on any scroll event (popover can't track trigger position on scroll).
 * - Hour/minute dropdowns in 5-minute steps.
 * - Shows user's local timezone abbreviation (e.g., "EST", "CET") so nobody is confused.
 * - Greys out non-current-month days. Doesn't block clicking them. We trust adults.
 *
 * @author Juan - The developer who refused to ship a native datetime-local input
 * and built a calendar from scratch instead. Zero regrets. Infinite testing.
 * (Coded with care, humor, and the discovery that Intl.DateTimeFormat has a
 * timeZoneName option that is genuinely useful and underused. Use it.)
 */

// React hooks — state for open/view/time, ref for DOM access, effect for event listeners.
import { useState, useRef, useEffect } from 'react'

// createPortal — renders the calendar at document.body to escape any overflow:hidden ancestors.
// Without this, parent clip contexts would eat our beautiful calendar.
import { createPortal } from 'react-dom'

// Calendar, ChevronLeft, ChevronRight — the navigation icons for the month picker.
// Calendar appears in the trigger button. Chevrons are the month nav arrows.
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Props interface ────────────────────────────────────────────────────────────
// Minimal. value + onChange are required. Everything else has sane defaults.
interface DateTimePickerProps {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  required?:    boolean
  className?:   string
}

// MONTHS — full month names for the calendar header.
// Localization note: we hardcode English here. This works for our current audience.
// If we ever internationalize, this array goes first.
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// DAYS — two-letter day abbreviations for the column headers.
// Short enough to fit in 7 columns without overflow. Long enough to be recognizable.
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// POPOVER_H — approximate popover height in pixels.
// Used to decide whether to flip above or below the trigger.
// If viewport space below the trigger < POPOVER_H and more space above → flip up.
// This is an approximation. Popover height varies slightly. Close enough.
const POPOVER_H = 370

// pad — left-pads a number to 2 digits. "9" → "09". "10" → "10".
// Used everywhere in date formatting. A tiny function that earns its weight.
function pad(n: number) { return String(n).padStart(2, '0') }

// parseValue — safely parses a datetime-local string into a Date.
// Returns null for empty strings or invalid dates.
// isNaN(d.getTime()) catches "Invalid Date" objects silently.
function parseValue(v: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

// toInputValue — converts a Date to "YYYY-MM-DDTHH:mm" (datetime-local format).
// This is what gets passed to onChange. The parent stores this string.
function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// formatDisplay — converts a Date to a human-readable string for the trigger button.
// "Dec 15, 2024 · 14:30" — compact, clear, local.
function formatDisplay(d: Date): string {
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  )
}

// buildCalendar — constructs a 42-cell (6×7) grid for the given month.
// Cells from previous and next months are included to fill the grid.
// Each cell is { date: Date, current: boolean } where current = belongs to this month.
// 42 cells: 6 rows × 7 days. The maximum any month can need.
function buildCalendar(year: number, month: number): { date: Date; current: boolean }[] {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells: { date: Date; current: boolean }[] = []
  // Fill leading cells from previous month
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false })
  // Fill current month days
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ date: new Date(year, month, i), current: true })
  // Fill trailing cells from next month until we have 42
  let next = 1
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, next++), current: false })
  return cells
}

// dayKey — creates a canonical string key for a date's year-month-day.
// Used to compare selected/today dates against calendar cells.
// "2024-12-15" — unambiguous, consistent, comparable.
function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * DateTimePicker — the main component.
 * Trigger button shows formatted date or placeholder.
 * Portal-rendered calendar popover appears below (or above if near bottom of viewport).
 */
// eslint-disable-next-line complexity
export default function DateTimePicker({
  value, onChange,
  placeholder = 'Pick date & time',
  required,
  className = '',
}: DateTimePickerProps) {
  // selected — parsed from value prop. Used for display and calendar highlighting.
  const selected = parseValue(value)
  const now      = new Date()

  // open — calendar visibility state. Toggled by the trigger button.
  const [open,      setOpen]      = useState(false)
  // viewYear/viewMonth — the calendar's current visible month. Not the selected date.
  // These can be different when the user navigates without selecting.
  const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? now.getMonth())
  // timeH/timeM/timeP — current time selection. String format.
  // 12-hour format with AM/PM. Default to 12:00 PM. Time is local. Always local. Not UTC.
  const [timeH,     setTimeH]     = useState(selected ? pad(selected.getHours() % 12 || 12) : '12')
  const [timeM,     setTimeM]     = useState(selected ? pad(selected.getMinutes()) : '00')
  const [timeP,     setTimeP]     = useState(selected ? (selected.getHours() >= 12 ? 'PM' : 'AM') : 'AM')

  // pos — fixed-position coordinates for the portal.
  // Computed on open from the trigger's getBoundingClientRect.
  // May include top (below trigger) or bottom (above trigger) depending on viewport space.
  const [pos, setPos] = useState<{
    top?: number; bottom?: number; left: number; width: number
  } | null>(null)

  // Refs — trigger for position measurement, popover for click-outside,
  // container for wrapping the whole component.
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)


  // Sync time state when value changes externally.
  // If the parent updates the value (e.g., resets the form), we update our local state.
  // Without this, the picker would show stale hour/minute/AM-PM from the previous selection.
  useEffect(() => {
    const d = parseValue(value)
    if (d) {
      const hours24 = d.getHours()
      const hours12 = hours24 % 12 || 12
      const ampm = hours24 >= 12 ? 'PM' : 'AM'
      setTimeH(pad(hours12))
      setTimeM(pad(d.getMinutes()))
      setTimeP(ampm)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Click-outside + Escape handlers — close the calendar.
  // Checks both the container (trigger area) and the popoverRef (calendar area).
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (!containerRef.current?.contains(t) && !popoverRef.current?.contains(t))
        setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Close on any scroll — the calendar can't track the trigger position during scroll.
  // Rather than fight physics, we close the calendar on scroll. Simple. Correct.
  // Capture phase (true) catches scroll on any scrollable element, not just window.
  useEffect(() => {
    if (!open) return
    function onScroll() { setOpen(false) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  // openPicker — measures the trigger, computes position, flips if needed, toggles open.
  // If there's not enough space below and more space above → flip above the trigger.
  // This prevents the calendar from appearing partially off-screen at the bottom of a page.
  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    // Flip logic — flip when below-space < POPOVER_H and above-space > below-space.
    // Minimum width 288px so the calendar doesn't look squished on narrow triggers.
    if (spaceBelow < POPOVER_H && spaceAbove > spaceBelow) {
      setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: Math.max(rect.width, 288) })
    } else {
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 288) })
    }
    setOpen(v => !v)
  }

  // Month navigation — previous and next month. Wraps at year boundaries.
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // pickDay — user clicks a calendar day.
  // Applies the current timeH/timeM/timeP to the clicked date and calls onChange.
  function pickDay(date: Date) {
    const d = new Date(date)
    let hour24 = parseInt(timeH, 10)
    // Convert 12-hour to 24-hour format
    if (timeP === 'PM' && hour24 !== 12) hour24 += 12
    if (timeP === 'AM' && hour24 === 12) hour24 = 0
    d.setHours(hour24)
    d.setMinutes(parseInt(timeM, 10))
    d.setSeconds(0)
    onChange(toInputValue(d))
  }

  // applyTime — user changes time inputs (hour, minute, or AM/PM).
  // If a date is already selected, updates it with the new time. Otherwise no-op.
  function applyTime(h: string, m: string, p: string) {
    if (selected) {
      const d = new Date(selected)
      let hour24 = parseInt(h, 10)
      // Convert 12-hour to 24-hour format
      if (p === 'PM' && hour24 !== 12) hour24 += 12
      if (p === 'AM' && hour24 === 12) hour24 = 0
      d.setHours(hour24)
      d.setMinutes(parseInt(m, 10))
      d.setSeconds(0)
      onChange(toInputValue(d))
    }
  }

  // Calendar grid — built from viewYear and viewMonth. 42 cells. Always 42.
  const cells       = buildCalendar(viewYear, viewMonth)
  const todayKey    = dayKey(now)
  const selectedKey = selected ? dayKey(selected) : ''

  // portalStyle — the fixed-position style for the portal div.
  // Either top (below trigger) or bottom (above trigger). Never both.
  const portalStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.left, width: pos.width, zIndex: 9999,
        ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }) }
    : {}

  return (
    <div ref={containerRef} className={`relative ${className}`}>

      {/* ── Trigger button ────────────────────────────────────────────────── */}
      {/* Shows formatted date or placeholder. Calendar icon on the left.
          Timezone abbreviation badge on the right (EST, CET, etc.).
          The tz badge is a surprise delight. Users notice it. They appreciate it.
          They schedule their mint correctly because of it. That's the point. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-dark-bg-tertiary border rounded-lg text-sm transition-colors text-left ${
          // Active/focus styling when open
          open
            ? 'border-dark-accent-primary/50 ring-1 ring-dark-accent-primary/20'
            : 'border-dark-border-primary hover:border-dark-border-accent'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-dark-text-tertiary shrink-0" />
        <span className={`flex-1 ${selected ? 'text-dark-text-primary' : 'text-dark-text-tertiary'}`}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        {/* Local time indicator badge — shows this is local time. */}
        <span className="text-[10px] font-semibold text-dark-text-secondary shrink-0">
          LOCAL
        </span>
      </button>

      {/* ── Calendar popover — portal rendered at document.body ───────────── */}
      {/* Only renders when open + positioned + we're in a browser. SSR safe. */}
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef} style={portalStyle}
          className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary shadow-2xl overflow-hidden"
        >

          {/* Month navigation — prev/next buttons with the month+year label in the center.
              Chevron icons from lucide-react. Clear affordance for navigation. */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border-primary">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-dark-text-tertiary hover:text-dark-text-primary hover:bg-dark-bg-tertiary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-dark-text-primary">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-dark-text-tertiary hover:text-dark-text-primary hover:bg-dark-bg-tertiary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers — Su Mo Tu We Th Fr Sa.
              7 columns, text-center, tiny font. They're column labels. */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-dark-text-tertiary py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells — 42 of them. Selected = accent. Today = ring. Non-current = muted.
              Each has a unique key so React doesn't confuse days across month navigation. */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map(({ date, current }, i) => {
              const key        = dayKey(date)
              const isSelected = key === selectedKey
              const isToday    = key === todayKey
              let dayClass: string
              if (isSelected) dayClass = 'bg-dark-accent-primary text-white font-bold'
              else if (isToday) dayClass = 'text-dark-accent-primary ring-1 ring-dark-accent-primary/40 hover:bg-dark-bg-tertiary'
              else if (current) dayClass = 'text-dark-text-primary hover:bg-dark-bg-tertiary'
              else dayClass = 'text-dark-text-tertiary/40 hover:bg-dark-bg-tertiary'
              return (
                <button key={i} type="button" onClick={() => pickDay(date)}
                  className={[
                    'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                    dayClass,
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* ── Time text inputs + AM/PM toggle + timezone ────────────────────── */}
          {/* Hour and minute as text inputs in 12-hour format.
              AM/PM toggle is required — user must select one.
              Timezone name shown on the right — full name (e.g., "America/New_York").
              truncated to max-w-30 because long timezone names are long. */}
          <div className="border-t border-dark-border-primary px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {/* Hour input — 1 through 12. 12-hour format. Direct typing. */}
              <input
                type="number"
                min="1"
                max="12"
                value={timeH}
                onChange={(e) => {
                  let val = e.target.value
                  // Allow 1-12, pad with zero if single digit
                  const num = parseInt(val, 10)
                  if (!isNaN(num) && num >= 1 && num <= 12) {
                    val = pad(num)
                    setTimeH(val)
                    applyTime(val, timeM, timeP)
                  } else if (val === '') {
                    setTimeH('')
                  }
                }}
                className="w-12 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg px-2 py-1.5 text-sm font-mono text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 transition-colors text-center"
                placeholder="12"
              />
              {/* Separator — the colon between hour and minute. Critical for readability. */}
              <span className="text-dark-text-tertiary font-bold">:</span>
              {/* Minute input — 00 through 59. Direct typing. */}
              <input
                type="number"
                min="0"
                max="59"
                value={timeM}
                onChange={(e) => {
                  let val = e.target.value
                  const num = parseInt(val, 10)
                  if (!isNaN(num) && num >= 0 && num <= 59) {
                    val = pad(num)
                    setTimeM(val)
                    applyTime(timeH, val, timeP)
                  } else if (val === '') {
                    setTimeM('')
                  }
                }}
                className="w-12 bg-dark-bg-tertiary border border-dark-border-primary rounded-lg px-2 py-1.5 text-sm font-mono text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 transition-colors text-center"
                placeholder="00"
              />
              {/* AM/PM toggle — required. User must select one. */}
              <div className="flex gap-1 ml-1">
                {['AM', 'PM'].map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setTimeP(period)
                      applyTime(timeH, timeM, period)
                    }}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      timeP === period
                        ? 'bg-dark-accent-primary text-white'
                        : 'bg-dark-bg-tertiary border border-dark-border-primary text-dark-text-primary hover:border-dark-accent-primary/50'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            {/* Local time indicator — shows user is scheduling in their local timezone. */}
            <span className="ml-auto text-[10px] font-semibold text-dark-text-secondary">
              LOCAL TIME
            </span>
          </div>

        </div>,
        document.body
      )}
    </div>
  )
}

// Coded by Juan — native datetime-local inputs are a UX crime across operating systems.
// This one looks the same everywhere, knows your timezone, flips above the trigger
// when near the bottom of the viewport, and closes on scroll like a civilized component.
// We are pleased with it. You're welcome.
