'use client'

import Link from 'next/link'
import { useId } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  title?: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  size?: 'compact' | 'default' | 'page'
}

function GemSVG({ strokeId, fillId }: { strokeId: string; fillId: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={strokeId} x1="6" y1="6" x2="74" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={fillId} x1="6" y1="6" x2="74" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      {/* Outer diamond */}
      <path
        d="M40 5 L75 38 L40 75 L5 38 Z"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.5"
        fill={`url(#${fillId})`}
      />
      {/* Girdle */}
      <line x1="5" y1="38" x2="75" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.35" />
      {/* Upper-left facet */}
      <line x1="40" y1="5" x2="22" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.55" />
      {/* Upper-right facet */}
      <line x1="40" y1="5" x2="58" y2="38" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.55" />
      {/* Lower-left facet */}
      <line x1="22" y1="38" x2="40" y2="75" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.3" />
      {/* Lower-right facet */}
      <line x1="58" y1="38" x2="40" y2="75" stroke={`url(#${strokeId})`} strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  )
}

function ActionEl({ action, primary }: { action: EmptyStateAction; primary: boolean }) {
  const cls = primary ? styles.primaryAction : styles.secondaryAction
  if (action.href) {
    return <Link href={action.href} className={cls}>{action.label}</Link>
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  )
}

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Check back soon.',
  action,
  secondaryAction,
  size = 'default',
}: EmptyStateProps) {
  const uid = useId()
  const strokeId = `es-s-${uid.replace(/:/g, '')}`
  const fillId = `es-f-${uid.replace(/:/g, '')}`

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      {size !== 'compact' && <div className={styles.glow} aria-hidden="true" />}
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          <GemSVG strokeId={strokeId} fillId={fillId} />
        </div>
        {size !== 'compact' && <div className={styles.divider} aria-hidden="true" />}
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {(action || secondaryAction) && (
          <div className={styles.actions}>
            {action && <ActionEl action={action} primary />}
            {secondaryAction && <ActionEl action={secondaryAction} primary={false} />}
          </div>
        )}
      </div>
    </div>
  )
}
