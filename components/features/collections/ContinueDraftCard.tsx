'use client'

/**
 * ContinueDraftCard - Shown when localStorage has an unsaved create draft
 * Links to /create to resume the flow (Details, Upload, or before Deploy)
 */

import Link from 'next/link'
import { FileEdit } from 'lucide-react'
import styles from './ContinueDraftCard.module.css'

interface ContinueDraftCardProps {
  draftName?: string
  step?: number
}

const STEP_LABELS: Record<number, string> = {
  1: 'Details',
  2: 'Upload',
  3: 'Deploy',
  4: 'Success',
}

export default function ContinueDraftCard({ draftName, step = 1 }: ContinueDraftCardProps) {
  return (
    <Link href="/create" className={styles.card}>
      <div className={styles.iconWrap}>
        <FileEdit className={styles.icon} />
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>
          {draftName ? `Continue: ${draftName}` : 'Continue draft'}
        </h3>
        <p className={styles.subtitle}>
          Resume from step {step}: {STEP_LABELS[step] ?? 'Details'}
        </p>
      </div>
    </Link>
  )
}
