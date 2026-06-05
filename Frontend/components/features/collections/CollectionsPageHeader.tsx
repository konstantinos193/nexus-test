'use client'

/**
 * CollectionsPageHeader – The single word at the top of the collections page.
 * That word is "Collections". It does not move. It does not filter. It is simply there.
 * (Sometimes restraint is the bravest design decision.)
 *
 * The props accept a search handler and initial search value — both unused currently.
 * They exist because someone, at some point, thought they'd be needed.
 * They weren't. But they stayed. Like furniture in a house you can't redecorate.
 *
 * @author Juan – The developer who wrote a component around a single <h1>
 * (Coded with care, minimalism, and the quiet acceptance of scope creep that never came)
 */

// CSS module — positions the title correctly, keeps it from floating into the void
import styles from './CollectionsPageHeader.module.css'

/** Props: two optional values that currently do nothing. A monument to forward planning. */
interface CollectionsPageHeaderProps {
  onSearchChange?: (query: string) => void  // Reserved for future search integration. Still waiting.
  initialSearch?: string                     // Initial search value. Currently a philosophical concept.
}

/**
 * CollectionsPageHeader — The crown of the collections page.
 * One div. One h1. One word. That word is "Collections."
 * It communicates everything the user needs to know about where they are.
 * (Which is: on the collections page. Yes.)
 */
export default function CollectionsPageHeader({
  onSearchChange,       // Accepted, not used. Don't judge. Plans change.
  initialSearch = ''    // Default to empty string — the correct amount of initial search
}: CollectionsPageHeaderProps) {
  return (
    // The wrap div — provides positioning context for the title
    <div className={styles.wrap}>
      {/* The title — "Collections". One word. All the context needed.
          This is the page heading. It stays. It does not move. It is eternal.
          (Or at least until someone asks for breadcrumbs. Then it gets company.) */}
      <h1 className={styles.title}>Collections</h1>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because even a single h1 deserves to know why it exists.
// (It exists to tell users where they are. Mission accomplished. Ship it.)
// ─────────────────────────────────────────────────────────────────────────────
