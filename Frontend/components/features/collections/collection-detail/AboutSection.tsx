'use client'

/**
 * AboutSection – The collection's elevator pitch, clipped to 240 characters.
 * Enough to understand what this NFT project is about. Not enough to read the whitepaper.
 * (If the description is under 240 chars, we show it all. The toggle disappears. Honesty.)
 *
 * "Read More" expands the full text. "Read Less" puts it back in the box.
 * The toggle is stateful because content collapsed state is sacred data — it belongs in React.
 * (Or at least, that's what Juan tells himself. It's one useState. It's fine.)
 *
 * @author Juan – The developer who decided 240 chars is the correct tease-to-reveal ratio
 * (Coded with care, slice(), and the eternal belief that good descriptions sell collections)
 */

// useState — one boolean state to toggle between clipped and full text
// Minimalist. One hook. One job. Respect the simplicity.
import { useState } from 'react'
// The CollectionDetail type — our data contract for what a full collection looks like
import type { CollectionDetail } from '@/types'

/**
 * AboutSection — Shows the collection description, clipped to 240 characters by default.
 * Reveals full text on "Read More". Hides it again on "Read Less".
 * (It's a toggle. It works. Stop overthinking it.)
 */
export default function AboutSection({ collection }: { collection: CollectionDetail }) {
  // expanded: false = show clipped text; true = show full description
  const [expanded, setExpanded] = useState(false)

  // The clip threshold — 240 characters is enough to sell a collection without overwhelming.
  // Below this and the "Read More" button never appears. A small mercy for brevity.
  const CLIP = 240

  // Is the full description longer than the clip? If not, there's nothing to expand.
  const hasMore = collection.description.length > CLIP

  // The text to display — either full or clipped with an ellipsis
  // The ellipsis is an actual '…' char, not three dots. Typography matters.
  const text = expanded || !hasMore
    ? collection.description          // Full text — either expanded or already short enough
    : collection.description.slice(0, CLIP) + '…'  // Clipped — the tease

  return (
    // cp-section is a global collection-page section class — consistent spacing with other sections
    <section className="cp-section">
      {/* Section heading — "About". Informative. Restrained. Perfect. */}
      <h2 className="cp-section-title">About</h2>

      {/* The description text — could be 10 words or 10 paragraphs.
          We handle both. The CLIP constant is the mediator. */}
      <p className="cp-section-content">{text}</p>

      {/* Read More / Read Less toggle — only rendered when the description is actually long.
          No button for short descriptions — it would just say "Read More" and show the same text.
          That would be embarrassing. We check hasMore first. */}
      {hasMore && (
        <button
          type="button"
          className="cp-read-more"
          // Toggle expanded — the simplest state flip in this codebase
          onClick={() => setExpanded((e) => !e)}
        >
          {/* Label flips based on state — "Read More" when collapsed, "Read Less" when open */}
          {expanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Coded by Juan — because 240 characters is a tease, not a commitment.
// (Read More exists for the curious. Read Less exists for the regretful.)
// ─────────────────────────────────────────────────────────────────────────────
