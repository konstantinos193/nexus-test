'use client'

/**
 * DateTimePicker - A custom datetime picker that doesn't look like a 1995 browser form.
 * Shows a portal-rendered calendar + spinner time inputs, always in the user's local timezone.
 * Flips above the trigger when there's no room below. Closes on any scroll.
 * (Native datetime-local renders differently on every OS. This one doesn't.)
 *
 * Value format matches datetime-local: "YYYY-MM-DDTHH:mm".
 * Timezone detected via Intl.DateTimeFormat — no library, no config, no guessing.
 *
 * @author Juan - The developer who refused to ship a native datetime input
 * (Coded with care, humor, and probably too much coffee)
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateTimePickerProps {
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  required?:    boolean
  className?:   string
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Approximate popover height — used to decide whether to flip above the trigger
const POPOVER_H = 370

function pad(n: number) { return String(n).padStart(2, '0') }

function parseValue(v: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplay(d: Date): string {
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  )
}

function buildCalendar(year: number, month: number): { date: Date; current: boolean }[] {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells: { date: Date; current: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false })
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ date: new Date(year, month, i), current: true })
  let next = 1
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, next++), current: false })
  return cells
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function DateTimePicker({
  value, onChange,
  placeholder = 'Pick date & time',
  required,
  className = '',
}: DateTimePickerProps) {
  const selected = parseValue(value)
  const now      = new Date()

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? now.getMonth())
  const [timeH,     setTimeH]     = useState(selected ? pad(selected.getHours())   : '12')
  const [timeM,     setTimeM]     = useState(selected ? pad(selected.getMinutes()) : '00')

  // Fixed-position coords for the portal — may be top or bottom depending on available space
  const [pos, setPos] = useState<{
    top?: number; bottom?: number; left: number; width: number
  } | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Timezone info — browser only
  const tzName = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  const tzAbbr = typeof window !== 'undefined'
    ? (new Intl.DateTimeFormat('en', { timeZoneName: 'short' })
        .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'local')
    : 'UTC'

  // Sync time state when value changes externally
  useEffect(() => {
    const d = parseValue(value)
    if (d) {
      setTimeH(pad(d.getHours()))
      setTimeM(pad(d.getMinutes()))
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Close on outside click
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

  // Close on any scroll — prevents the popover from drifting away from the trigger
  useEffect(() => {
    if (!open) return
    function onScroll() { setOpen(false) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    // Flip above if not enough room below and more room above
    if (spaceBelow < POPOVER_H && spaceAbove > spaceBelow) {
      setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: Math.max(rect.width, 288) })
    } else {
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 288) })
    }
    setOpen(v => !v)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function pickDay(date: Date) {
    const d = new Date(date)
    d.setHours(parseInt(timeH, 10))
    d.setMinutes(parseInt(timeM, 10))
    d.setSeconds(0)
    onChange(toInputValue(d))
  }

  function applyTime(h: string, m: string) {
    if (selected) {
      const d = new Date(selected)
      d.setHours(parseInt(h, 10))
      d.setMinutes(parseInt(m, 10))
      d.setSeconds(0)
      onChange(toInputValue(d))
    }
  }

  // Hour options 00-23, minute options in 5-min steps
  const HOURS   = Array.from({ length: 24 }, (_, i) => pad(i))
  const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5))

  const cells       = buildCalendar(viewYear, viewMonth)
  const todayKey    = dayKey(now)
  const selectedKey = selected ? dayKey(selected) : ''

  const portalStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.left, width: pos.width, zIndex: 9999,
        ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }) }
    : {}

  return (
    <div ref={containerRef} className={`relative ${className}`}>

      {/* ── Trigger ───────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-dark-bg-tertiary border rounded-lg text-sm transition-colors text-left ${
          open
            ? 'border-dark-accent-primary/50 ring-1 ring-dark-accent-primary/20'
            : 'border-dark-border-primary hover:border-dark-border-accent'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-dark-text-tertiary shrink-0" />
        <span className={`flex-1 ${selected ? 'text-dark-text-primary' : 'text-dark-text-tertiary'}`}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <span className="text-[10px] font-mono text-dark-text-tertiary shrink-0 bg-dark-bg-secondary border border-dark-border-primary px-1.5 py-0.5 rounded">
          {tzAbbr}
        </span>
      </button>

      {/* ── Popover — portal so overflow-hidden ancestors can't clip it ─ */}
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef} style={portalStyle}
          className="rounded-xl border border-dark-border-primary bg-dark-bg-secondary shadow-2xl overflow-hidden"
        >

          {/* Month navigation */}
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

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-dark-text-tertiary py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map(({ date, current }, i) => {
              const key        = dayKey(date)
              const isSelected = key === selectedKey
              const isToday    = key === todayKey
              return (
                <button key={i} type="button" onClick={() => pickDay(date)}
                  className={[
                    'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-dark-accent-primary text-white font-bold'
                      : isToday
                        ? 'text-dark-accent-primary ring-1 ring-dark-accent-primary/40 hover:bg-dark-bg-tertiary'
                        : current
                          ? 'text-dark-text-primary hover:bg-dark-bg-tertiary'
                          : 'text-dark-text-tertiary/40 hover:bg-dark-bg-tertiary',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* ── Time dropdowns + timezone ──────────────────────────────── */}
          <div className="border-t border-dark-border-primary px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select
                value={timeH}
                onChange={(e) => { setTimeH(e.target.value); applyTime(e.target.value, timeM) }}
                className="bg-dark-bg-tertiary border border-dark-border-primary rounded-lg px-2 py-1.5 text-sm font-mono text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 transition-colors cursor-pointer"
              >
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="text-dark-text-tertiary font-bold">:</span>
              <select
                value={timeM}
                onChange={(e) => { setTimeM(e.target.value); applyTime(timeH, e.target.value) }}
                className="bg-dark-bg-tertiary border border-dark-border-primary rounded-lg px-2 py-1.5 text-sm font-mono text-dark-text-primary focus:outline-none focus:border-dark-accent-primary/50 transition-colors cursor-pointer"
              >
                {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <span className="ml-auto text-[10px] text-dark-text-tertiary truncate max-w-30 text-right" title={tzName}>
              {tzName}
            </span>
          </div>

        </div>,
        document.body
      )}
    </div>
  )
}

// Coded by Juan - native datetime inputs are a crime against design.
// This one knows your timezone, flips when near the bottom, and closes on scroll like a civilized component.
