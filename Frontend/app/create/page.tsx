/**
 * Create Page - Where creators go to create chaos
 * This is where the magic happens (or at least where we try to make it happen)
 * Because creating NFTs shouldn't require a computer science degree
 * (If it did, we'd have way fewer users. And way fewer bugs. Silver linings.)
 *
 * @author Juan - The developer who made "create" actually creatable
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

// CreatePageContent - the form, the uploads, the "oh no what blockchain" dropdown
// This is where creators either thrive or repeatedly hit "Back" in confusion
import CreatePageContent from '@/components/features/create/CreatePageContent'

/**
 * Create Page - Main entry for /create
 * Wraps the create flow in Layout. Short and sweet. Unlike the actual create flow.
 */
export default function CreatePage() {
  return (
    <>
      {/* CreatePageContent - upload art, set metadata, pick chain, ship it
          The real work happens here. We're just the wrapper. The envelope. The supportive parent. */}
      <CreatePageContent />
    </>
  )
}

// Coded by Juan - because every good page needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Create something cool. Or chaos. Both work. 🎨

