/**
 * CreatePageHeader - Heading block for the create page.
 * Kept around for layouts that need it standalone.
 * The main CreatePageContent uses the sidebar heading now — this is the backup.
 * (Redundancy isn't always bad. Lawyers would agree.)
 *
 * @author Juan - The developer who renamed "Launch Your Drop" into something original
 * (Coded with care, humor, and probably too much coffee)
 */
export default function CreatePageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
        New Collection
      </h1>
      <p className="text-dark-text-secondary">
        Set up your Solana collection, upload your artwork, and go live —
        all from one place. No smart-contract experience required.
      </p>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Context is king. So we put a crown on it. 👑
