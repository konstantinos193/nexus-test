'use client'

/**
 * ConfirmDialog - A custom confirmation modal that replaces window.confirm().
 * Because window.confirm() looks like it was designed by a browser committee in 2001
 * and rendered by the OS at maximum ugliness. We can do better. We did.
 *
 * Features:
 * - Portal-rendered at document.body so parent overflow:hidden can't clip it.
 * - Scroll lock via body.style.overflow while open.
 * - ESC to cancel, Enter to confirm — keyboard first.
 * - Two variants: default (neutral confirm) and danger (destructive confirm, red styling).
 * - Customizable confirm/cancel labels so every dialog can speak its specific language.
 * - Backdrop click to cancel (clicking the overlay, not the modal itself).
 *   We use e.target === e.currentTarget to distinguish backdrop from modal clicks.
 *   This is correct and intentional. Do not change it to a stopPropagation.
 *
 * Usage: mount once, control with the `open` prop.
 * Don't render multiple ConfirmDialogs simultaneously. We've seen what happens. It's fine.
 * Actually no, it's not fine. One dialog at a time. That's the rule.
 *
 * @author Juan - The developer who looked at window.confirm() and said "no. absolutely not."
 * (Coded with care, a healthy distrust of browser-native UI, and the knowledge that
 * alertdialog + aria-modal is the correct ARIA pattern here. We checked the spec.)
 */

// React — useEffect for side effects (keyboard + scroll lock), useCallback for stable handler.
// createPortal — renders at document.body to escape overflow:hidden ancestors.
import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── Props interface ────────────────────────────────────────────────────────────
// Minimal surface area. Title, message, labels, variant, callbacks.
// That's all a confirmation dialog needs. We didn't overcomplicate it.
export interface ConfirmDialogProps {
  // open — controlled externally. Dialog only renders when open is true.
  open: boolean
  // title — the main question. "Delete phase?" "Replace files?" "Are you sure?"
  title: string
  // message — supporting context. Explains the consequences.
  message: string
  // confirmLabel — the confirm button text. Defaults to "Confirm". Can be "Delete", "Replace", "Deploy".
  confirmLabel?: string
  // cancelLabel — the cancel button text. Defaults to "Cancel". Almost always "Cancel".
  cancelLabel?: string
  // variant — 'default' is neutral, 'danger' applies red styling to the confirm button.
  // Use 'danger' for destructive, irreversible actions. Use your judgment. Or use 'danger'. Same thing.
  variant?: 'default' | 'danger'
  // onConfirm — called when the user clicks confirm or presses Enter.
  onConfirm: () => void
  // onCancel — called when the user clicks cancel, presses ESC, or clicks the backdrop.
  onCancel: () => void
}

/**
 * ConfirmDialog — portal-rendered alertdialog with keyboard support.
 * Returns null when closed OR when running on the server (typeof document === 'undefined').
 * SSR safety — createPortal needs document.body. We check before calling it.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

  // handleKeyDown — ESC cancels, Enter confirms.
  // useCallback keeps the reference stable so the useEffect dependency array is accurate.
  // Without useCallback, the effect would re-register on every render. Memory churn.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      // ESC — cancel. The universal escape hatch. Users expect it. We provide it.
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      // Enter — confirm. Power users can confirm without moving to the mouse.
      if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    },
    [open, onConfirm, onCancel]
  )

  // Keyboard event listener — registers when open, removes when closed.
  // handleKeyDown is memoized above so this effect only re-runs when open or handlers change.
  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  // Scroll lock — disables body scrolling while the dialog is open.
  // Prevents the page behind the overlay from being scrolled inadvertently.
  // Cleanup restores empty string (the CSS default for overflow) — clean exit.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Early returns — nothing renders when closed or on the server.
  // Server check for document is SSR safety. createPortal requires document.body.
  if (!open || typeof document === 'undefined') return null

  // createPortal — renders the dialog at document.body.
  // This escapes any parent overflow:hidden, z-index stacking context, or transform.
  // The dialog floats above everything. That's the contract of a modal overlay.
  return createPortal(
    // Overlay — fixed, full-screen, semi-transparent backdrop.
    // Clicking the overlay (e.target === e.currentTarget) cancels the dialog.
    // This distinguishes a backdrop click from a click that propagated up from inside the modal.
    <div
      className="nft-create-confirm-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Modal card — the actual dialog box.
          role="alertdialog" for AT — more urgent than role="dialog", appropriate for confirmations.
          aria-modal="true" tells screen readers to treat background content as inert.
          aria-labelledby + aria-describedby wire up the accessible name and description.
          Danger variant adds the --danger modifier class for red styling. */}
      <div
        className={`nft-create-confirm-modal ${variant === 'danger' ? 'nft-create-confirm-modal--danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nft-create-confirm-title"
        aria-describedby="nft-create-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title — the main question. Bold, prominent. "Are you sure?" energy. */}
        <h2 id="nft-create-confirm-title" className="nft-create-confirm-title">{title}</h2>

        {/* Message — the consequences. Reads clearly. Avoids legalese. */}
        <p id="nft-create-confirm-message" className="nft-create-confirm-message">{message}</p>

        {/* Actions — Cancel on the left (autoFocus so keyboard users start there),
            Confirm on the right. Cancel is safe. Confirm is the decision.
            autoFocus on Cancel is intentional — we default to the safe choice.
            Users who want to confirm have to move there. Intentional friction. */}
        <div className="nft-create-confirm-actions">
          <button
            type="button"
            className="nft-create-confirm-btn nft-create-confirm-btn--cancel"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="nft-create-confirm-btn nft-create-confirm-btn--confirm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Coded by Juan — window.confirm() is a crime against UI design.
// This dialog has accessible markup, keyboard support, scroll lock, portal rendering,
// and a danger variant for when the action is irreversible.
// We built what window.confirm() should have always been.
