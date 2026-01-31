'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Traps focus inside container. Tab cycles within; ESC not handled here (handle in onEscape).
 * On mobile, initialFocus: false avoids focus jump / scroll when the trap activates.
 */
export function useFocusTrap(
  isActive: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options?: { onEscape?: () => void; initialFocus?: boolean }
) {
  const previousActive = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const el = containerRef.current
    previousActive.current = document.activeElement as HTMLElement | null

    const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const shouldFocus = options?.initialFocus !== false
    if (first && shouldFocus) first.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        options?.onEscape?.()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = el.querySelectorAll<HTMLElement>(FOCUSABLE)
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      previousActive.current?.focus?.()
    }
  }, [isActive, containerRef, options?.onEscape, options?.initialFocus])
}
