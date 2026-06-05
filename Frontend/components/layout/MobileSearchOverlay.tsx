'use client'

/**
 * MobileSearchOverlay - The full-screen search experience for mobile users.
 * Tap the search icon in the header → this slides in from somewhere dark.
 * Contains a HeaderSearch in overlay variant, autoFocused so the keyboard appears immediately.
 * Closes on ESC, backdrop tap, or when a result is selected.
 *
 * Scroll lock on the body while open — because nothing is more annoying than
 * accidentally scrolling the page behind an open modal.
 * We lock it. We restore it. We are responsible adults.
 *
 * Portal? No portal needed here — this is a direct child of the Header render tree.
 * The header renders it conditionally. The overlay covers everything via fixed positioning.
 * z-index does the heavy lifting. The backdrop does the aesthetic lifting.
 *
 * @author Juan - The mobile search whisperer. Tap. Type. Find. Close.
 * No dark pattern scroll trapping. We lock scroll, we unlock scroll. Clean hands.
 * (Coded with care, and the knowledge that mobile search overlays
 * either feel native and fast or feel like a broken drawer. Ours feels native.)
 */

// useEffect — for scroll lock and ESC key handler. Both are cleanup-required side effects.
// We don't use state here. This component is stateless beyond the open prop.
import { useEffect } from 'react'

// X — the close button icon. Universally understood. No label needed.
// (We add aria-hidden because the button has an aria-label. The icon is decorative.)
import { X } from 'lucide-react'

// HeaderSearch — the search input + dropdown. Reused in overlay variant.
// variant="overlay" + autoFocus makes it behave correctly in this context.
// onResultSelect → onClose so navigating to a result closes the overlay.
import HeaderSearch from './HeaderSearch'

// MobileSearchOverlay.module.css — overlay positioning, backdrop blur, slide-in animation.
// The sheet and backdrop are separate elements so we can animate them independently.
import styles from './MobileSearchOverlay.module.css'

// ── Props interface ────────────────────────────────────────────────────────────
// open — controlled externally by the Header's mobileSearchOpen state.
// onClose — called when the user wants to close (ESC, backdrop tap, result select).
interface MobileSearchOverlayProps {
  open: boolean
  onClose: () => void
}

/**
 * MobileSearchOverlay — renders a full-screen overlay when open is true.
 * Returns null when closed so it doesn't pollute the DOM when inactive.
 * Scroll lock is handled via body.style.overflow in useEffect.
 * The previous overflow value is restored on cleanup — no global state mutation leaks.
 */
export default function MobileSearchOverlay({ open, onClose }: MobileSearchOverlayProps) {

  // Scroll lock — prevents the background page from scrolling while the overlay is open.
  // Saves the previous overflow value so we restore exactly what was there.
  // This matters if something else already set overflow before us.
  useEffect(() => {
    if (!open) return
    // Lock: disable body scroll. The user is in the overlay now.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Cleanup: restore previous overflow when the overlay closes.
    // If the component unmounts while open, this still fires. React guarantees it.
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // ESC key handler — global keyboard listener while overlay is open.
  // ESC is the universal "I want out" key. We honor that.
  // Removed on cleanup so it doesn't fire after the overlay closes.
  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Early return — nothing in the DOM when closed.
  // The two useEffects above are no-ops when open=false (they return early).
  // So this return null is safe and keeps the DOM clean.
  if (!open) return null

  return (
    // Overlay container — fixed, full-screen, dialog role for AT.
    // aria-modal="true" tells screen readers that content behind this is inert.
    // aria-label describes the purpose for non-visual users.
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Search collections"
    >
      {/* Backdrop — the dark area behind the sheet. Tap to close.
          aria-hidden because it's decorative. Keyboard users use ESC instead.
          onClick calls onClose. The stopPropagation on the sheet below prevents
          sheet taps from bubbling up to this backdrop tap handler. */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden />

      {/* Sheet — the white(ish) panel that slides up from the bottom.
          stopPropagation prevents clicks inside the sheet from closing the overlay.
          This is correct UX. Clicking inside a modal should not close the modal. */}
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>

          {/* Close button — X icon, top-left or top-right of the sheet.
              aria-label describes it for screen readers (the icon is aria-hidden below). */}
          <button
            type="button"
            onClick={onClose}
            className={styles.close}
            aria-label="Close search"
          >
            <X className={styles.closeIcon} aria-hidden />
          </button>

          {/* Search input — HeaderSearch in overlay variant.
              autoFocus = true so the mobile keyboard appears immediately on open.
              The user tapped the search button. They're ready to type. We respect that.
              onResultSelect = onClose so picking a result closes the overlay. */}
          <div className={styles.searchWrap}>
            <HeaderSearch
              variant="overlay"
              autoFocus
              onResultSelect={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Coded by Juan — tap search, see this, type a name, find a collection, tap a result, gone.
// Six steps. Zero friction. Scroll lock on open. Scroll unlock on close. ESC works.
// This is mobile UX as it should be.
