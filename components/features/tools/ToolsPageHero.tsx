'use client'

/**
 * ToolsPageHero.tsx
 * The hero block for /tools: badge, big title, one line of copy.
 * Same vibe as the homepage hero so we don't give users an identity crisis.
 *
 * @author Juan – hero wrangler and part-time motivational liar
 */

import styles from './ToolsPageHero.module.css'

export default function ToolsPageHero() {
  return (
    <header className={styles.hero}>
      <span className={styles.badge}>Creator toolkit</span>
      <h1 className={styles.title}>Tools</h1>
      <p className={styles.sub}>
        Powerful tools to help you manage and interact with your NFTs.
      </p>
    </header>
  )
}

// — Juan. "Powerful." We said it. No take-backs.
