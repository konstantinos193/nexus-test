/**
 * Create Page Header Component
 * The title and copy that greet users on the create page
 * Because context matters (and "Create Collection" without explanation is vague)
 *
 * @author Juan - The developer who built this header
 * (Coded with care, humor, and probably too much coffee)
 */
export default function CreatePageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
        Create Collection
      </h1>
      <p className="text-dark-text-secondary">
        Start your NFT journey here. It's easier than you think
        (or harder, depending on your technical skills)
      </p>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Context is king. So we put a crown on it. 👑
