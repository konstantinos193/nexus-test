/**
 * Create Page - Where Creators Go to Deploy Their Chaos Onto the Blockchain
 * The entry point for the 4-step NFT collection creation flow
 * Step 1: Basic Info. Step 2: Artwork. Step 3: Phases. Step 4: Deploy and pray.
 * Because creating NFTs shouldn't require a computer science degree or a shaman.
 * (If it did, we'd have way fewer users. And way fewer bugs. Both, actually.)
 *
 * This file is intentionally sparse. It's a wrapper. A vessel.
 * The actual 4-step form logic, file uploads, wallet interactions, and existential dread
 * all live inside CreatePageContent. We just summon it.
 *
 * Note: 'use client' is here because CreatePageContent needs browser APIs
 * (file inputs, wallet connections, drag-and-drop). Server rendering it would be a disaster.
 * A beautiful, confusing, hydration-error-filled disaster.
 *
 * @author Juan - The developer who made "create" actually doable by normal humans
 * (Coded with care, dark humor, and the hope that users actually finish Step 4)
 */

'use client'
// 'use client' — marks this file and its children as client-side rendered
// Required because CreatePageContent uses hooks, browser APIs, and wallet interactions
// Server Components can't hold countdown timers, file pickers, or a user's wallet anxiety

// CreatePageContent — the real thing. The form wizard. The 4-step journey.
// Step 1: Collection basics (name, symbol, description, royalties)
// Step 2: Artwork upload (collection image, banner — the visual identity)
// Step 3: Mint phases (allowlist / public, prices, dates, supply limits)
// Step 4: Review and deploy to Solana (the moment of truth)
// This is where creators either thrive or hit "Back" in quiet confusion.
// We've tried to make it as smooth as possible. "As possible" is doing work in that sentence.
import CreatePageContent from '@/components/features/create/CreatePageContent'

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * CreatePage - The exported default for the /create route
 * Renders when someone navigates to /create, clicks "Create Collection" in the nav,
 * or follows a CTA from the homepage, dashboard, or wherever else we linked it.
 *
 * This component's entire job: render CreatePageContent inside a fragment.
 * That's it. We are the envelope. CreatePageContent is the letter inside.
 * The letter contains 4 steps, multiple form fields, file uploads, and blockchain calls.
 * The envelope just... wraps it. Humbly.
 */
export default function CreatePage() {
  return (
    // Fragment — because adding a wrapper div here would break the full-height layout
    // CreatePageContent manages its own spacing and max-width. We trust it.
    <>
      {/* CreatePageContent — the 4-step collection creation wizard
          Handles everything: form state, validation, uploads to IPFS, wallet signing, deploy
          "Upload art, set metadata, pick your phases, ship it to Solana" — that's the pitch
          The real work happens in here. We're just the wrapper. The supportive outer layer.
          The parent who drives them to the venue but doesn't get on stage.
          (We're very proud of CreatePageContent. It does a lot. It deserves more credit.) */}
      <CreatePageContent />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — because this page doesn't render itself (even though Next.js tries really hard).
// Step 1. Step 2. Step 3. Step 4. Deploy. Done. You're a Web3 creator now.
// P.S. — Create something cool. Or chaotic. Both end up on-chain either way.
