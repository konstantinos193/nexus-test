'use client'

/**
 * ToolCard.tsx
 * One card in the tools grid. Icon, name, description, and a link that says "Use Tool."
 * If nobody clicks it, did we even ship?
 *
 * @author Juan – card pusher and purveyor of false hope
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import styles from './ToolCard.module.css'

export interface ToolCardProps {
  name: string
  description: string
  icon: LucideIcon
  href: string
}

export default function ToolCard({ name, description, icon: Icon, href }: ToolCardProps) {
  return (
    <article className={styles.card}>
      {/* Icon: so the card doesn't look like a tombstone */}
      <div className={styles.iconWrap}>
        <Icon className={styles.icon} />
      </div>
      <div className={styles.header}>
        <h3 className={styles.cardTitle}>{name}</h3>
      </div>
      <p className={styles.desc}>{description}</p>
      <div className={styles.actions}>
        <Link
          href={href}
          className={`${styles.btn} ${styles.btnPrimary}`}
          aria-label={`Use ${name}`}
        >
          Use Tool
        </Link>
      </div>
    </article>
  )
}

// — Juan. Click the link. Do it. We're watching. (We're not.)
