'use client'

/**
 * ToolsPageContent.tsx
 * The orchestrator for /tools. Puts the hero up top and a grid of tool cards below.
 * Like HomePageContent but with fewer dreams and more "Use Tool" buttons.
 *
 * @author Juan – conductor of the tools orchestra (one instrument, but we tried)
 */

import ToolsPageHero from './ToolsPageHero'
import ToolCard from './ToolCard'
import { solanaTools } from './toolsData'
import styles from './ToolsPageContent.module.css'

export default function ToolsPageContent() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ToolsPageHero />
        {/* Solana tools: the section that hopes we add more one day */}
        <section className={styles.section} aria-labelledby="solana-tools-heading">
          <div className={styles.sectionHeader}>
            <h2 id="solana-tools-heading" className={styles.sectionTitle}>
              Solana Tools
            </h2>
          </div>
          <div className={styles.grid}>
            {solanaTools.map((tool) => (
              <ToolCard
                key={tool.id}
                name={tool.name}
                description={tool.description}
                icon={tool.icon}
                href={tool.href}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// — Juan. If the grid is empty, blame toolsData. We did our part.
