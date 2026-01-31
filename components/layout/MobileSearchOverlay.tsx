'use client'

/**
 * MobileSearchOverlay - Full-screen search overlay for mobile
 * Tap search icon → overlay with pill bar + live results. Same UX as desktop.
 */

import { useEffect } from 'react'
import { X } from 'lucide-react'
import HeaderSearch from './HeaderSearch'
import styles from './MobileSearchOverlay.module.css'

interface MobileSearchOverlayProps {
  open: boolean
  onClose: () => void
}

export default function MobileSearchOverlay({ open, onClose }: MobileSearchOverlayProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Search collections"
    >
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button
            type="button"
            onClick={onClose}
            className={styles.close}
            aria-label="Close search"
          >
            <X className={styles.closeIcon} aria-hidden />
          </button>
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
