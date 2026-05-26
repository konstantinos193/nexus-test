'use client'

/**
 * ConfirmDialog - Custom confirmation modal, replaces native window.confirm().
 * Used for replace confirmations, leave-page prompts, and anything scary.
 * Because native confirm() looks terrible. We have standards.
 *
 * @author Juan - The developer who made dialogs not look like 1998
 * (Coded with care, humor, and probably too much coffee)
 */

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    },
    [open, onConfirm, onCancel]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="nft-create-confirm-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className={`nft-create-confirm-modal ${variant === 'danger' ? 'nft-create-confirm-modal--danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nft-create-confirm-title"
        aria-describedby="nft-create-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="nft-create-confirm-title" className="nft-create-confirm-title">{title}</h2>
        <p id="nft-create-confirm-message" className="nft-create-confirm-message">{message}</p>
        <div className="nft-create-confirm-actions">
          <button type="button" className="nft-create-confirm-btn nft-create-confirm-btn--cancel" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="nft-create-confirm-btn nft-create-confirm-btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Coded by Juan - because window.confirm() is a crime against UI
