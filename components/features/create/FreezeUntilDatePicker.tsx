'use client'

/**
 * Date-time picker for "Unfreeze at date" — opens a calendar popover in user's local timezone.
 * Value is stored as datetime-local string (YYYY-MM-DDTHH:mm).
 * Uses a portal to render the popover at body level (avoids parent overflow clipping).
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDate(value: string): Date | null {
  if (!value || value.trim() === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDatetimeLocalString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function formatDisplay(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const total = startPad + daysInMonth
  const rows = Math.ceil(total / 7) * 7
  const out: (number | null)[] = []
  for (let i = 0; i < startPad; i++) out.push(null)
  for (let d = 1; d <= daysInMonth; d++) out.push(d)
  while (out.length < rows) out.push(null)
  return out
}

export interface FreezeUntilDatePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
  className?: string
}

export default function FreezeUntilDatePicker({
  id,
  value,
  onChange,
  min,
  placeholder = 'Pick date & time',
  className = '',
}: FreezeUntilDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null)
  const initial = toLocalDate(value)
  const minDate = min ? toLocalDate(min) : null

  const [viewDate, setViewDate] = useState<Date>(() => {
    if (initial) return new Date(initial.getFullYear(), initial.getMonth(), 1)
    const now = new Date()
    if (minDate && now < minDate) return new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState<Date | null>(initial)
  const [hour, setHour] = useState(initial ? initial.getHours() : 12)
  const [minute, setMinute] = useState(initial ? initial.getMinutes() : 0)

  const syncFromValue = useCallback(() => {
    const d = toLocalDate(value)
    setSelectedDate(d)
    if (d) {
      setHour(d.getHours())
      setMinute(d.getMinutes())
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [value])

  useEffect(() => {
    syncFromValue()
  }, [value, syncFromValue])

  // Calculate popover position when opened
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopoverPos({
      top: rect.bottom + 6,
      left: rect.left,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handlePrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const handleSelectDay = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, hour, minute)
    if (minDate && d < minDate) return
    setSelectedDate(d)
  }

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour)
    setMinute(newMinute)
    if (selectedDate) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), newHour, newMinute)
      setSelectedDate(d)
    }
  }

  const handleApply = () => {
    if (selectedDate) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute)
      if (minDate && d < minDate) return
      onChange(toDatetimeLocalString(d))
    }
    setOpen(false)
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange('')
    setOpen(false)
  }

  const handleQuickNow = () => {
    const now = new Date()
    if (minDate && now < minDate) return
    setSelectedDate(now)
    setHour(now.getHours())
    setMinute(now.getMinutes())
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const days = getMonthDays(viewYear, viewMonth)

  const isDayDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    return minDate ? d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : false
  }

  const isDaySelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    )
  }

  return (
    <div ref={containerRef} className={`nft-create-freeze-until-picker-wrap ${className}`}>
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
        <span className={`nft-create-freeze-until-trigger-text ${!value ? 'empty-placeholder' : ''}`}>
          {value ? formatDisplay(toLocalDate(value)!) : placeholder}
        </span>
        <span className="nft-create-freeze-until-trigger-icon" aria-hidden>
          <CalendarIcon />
        </span>
      </button>

      {open && popoverPos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className="nft-create-freeze-until-popover"
            role="dialog"
            aria-label="Pick unfreeze date and time (local time)"
            style={{
              position: 'fixed',
              top: popoverPos.top,
              left: popoverPos.left,
              zIndex: 99999,
            }}
          >
            <div className="nft-create-freeze-until-calendar">
              <div className="nft-create-freeze-until-calendar-header">
                <button
                  type="button"
                  className="nft-create-freeze-until-nav"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft />
                </button>
                <span className="nft-create-freeze-until-month-label">{monthLabel}</span>
                <button
                  type="button"
                  className="nft-create-freeze-until-nav"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight />
                </button>
              </div>
              <div className="nft-create-freeze-until-weekdays">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="nft-create-freeze-until-weekday">
                    {w}
                  </span>
                ))}
              </div>
              <div className="nft-create-freeze-until-grid">
                {days.map((day, i) =>
                  day === null ? (
                    <span key={`e-${i}`} className="nft-create-freeze-until-day empty" />
                  ) : (
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

            <div className="nft-create-freeze-until-time">
              <span className="nft-create-freeze-until-time-label">Time (local)</span>
              <div className="nft-create-freeze-until-time-inputs">
                <div className="nft-create-freeze-until-time-field">
                  <label htmlFor={`${id}-hour`} className="nft-create-freeze-until-time-field-label">
                    Hour
                  </label>
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
                <span className="nft-create-freeze-until-time-sep">:</span>
                <div className="nft-create-freeze-until-time-field">
                  <label htmlFor={`${id}-minute`} className="nft-create-freeze-until-time-field-label">
                    Min
                  </label>
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

            <div className="nft-create-freeze-until-actions">
              <button type="button" className="nft-create-freeze-until-btn secondary" onClick={handleQuickNow}>
                Now
              </button>
              <button type="button" className="nft-create-freeze-until-btn secondary" onClick={handleClear}>
                Clear
              </button>
              <button type="button" className="nft-create-freeze-until-btn primary" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
