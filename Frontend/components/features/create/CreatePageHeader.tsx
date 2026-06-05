/**
 * CreatePageHeader - The standalone heading block for the Create page.
 * A title and a subtitle. That's it. That's the whole component.
 * Kept alive for layouts that need the heading outside of CreatePageContent's sidebar.
 * The main flow uses its own inline heading now — this is the understudy.
 *
 * It waits backstage, patient, ready to step in when the sidebar design is abandoned
 * and someone says "just give me a big h1 at the top." That day may come.
 * (Redundancy isn't always bad. Lawyers would agree. This file would agree louder.)
 *
 * @author Juan - The developer who built this heading and watched it get replaced by a sidebar,
 * then kept it anyway because deleting code feels irreversible and existence is fragile.
 * (Coded with care, coffee, and the quiet dignity of a component that knows its role.)
 */

/**
 * CreatePageHeader — renders an h1 and a subtitle paragraph.
 * No props. No state. No drama. Just words on a dark background.
 * "No smart-contract experience required" — we mean it. The wizard handles it.
 * If you find yourself reading this component's source code, you've gone too deep.
 */
export default function CreatePageHeader() {
  return (
    // mb-8 — breathing room below the heading before the form begins.
    // Because cramming a title directly onto a form is disrespectful to both.
    <div className="mb-8">
      {/* The headline. Bold. Large. Unambiguous.
          "New Collection" — not "Launch Your Drop", not "Create NFTs", not "Mint Now".
          Just: what it is. Clean. */}
      <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
        New Collection
      </h1>
      {/* The sub-headline. Three things, one sentence.
          Upload artwork. Go live. No Solidity required.
          If this doesn't make the user feel capable, nothing will. */}
      <p className="text-dark-text-secondary">
        Set up your Solana collection, upload your artwork, and go live —
        all from one place. No smart-contract experience required.
      </p>
    </div>
  )
}

// Coded by Juan — the backup heading. Humble. Present. Ready at a moment's notice.
// If the sidebar ever falls, this component steps forward, clears its throat,
// and says "New Collection" in a dignified 4xl font weight.
// That's not nothing. That's something. That's enough.
