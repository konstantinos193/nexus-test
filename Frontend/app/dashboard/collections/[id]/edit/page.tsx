/**
 * Edit Collection Page - The "I want to change something" destination
 * Renders when a creator clicks "Manage" on a collection card in the dashboard
 * One job: mount the EditCollectionClient and get out of the way
 *
 * This file is intentionally minimal. The edit logic, form state, and API calls
 * all live in EditCollectionClient — a Client Component that handles the heavy lifting.
 * We exist to provide the page-level metadata and the Server Component wrapper.
 *
 * The [id] in the route path is the collection's database ID
 * EditCollectionClient reads it via useParams() — no need to forward it as a prop
 * (Next.js App Router handles the plumbing so we don't have to)
 *
 * @author Juan - The developer who made "edit" actually work after deployment
 * (Coded with minimal ceremony and a great deal of trust in EditCollectionClient)
 */

// Metadata type — the TypeScript shape for Next.js <head> configuration
// Even a minimal page deserves a title in the browser tab
// "Edit Collection" is descriptive. Creators know exactly where they are.
import type { Metadata } from 'next'

// EditCollectionClient — the actual edit form component
// Reads the collection ID from URL params, fetches the collection, renders the form
// Handles field updates, image uploads, phase management, and the "Save Changes" call
// All the complexity lives here. This page file just summons it.
import EditCollectionClient from '@/components/features/collections/edit/EditCollectionClient'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Minimal metadata for the edit page — just a title
// No canonical URL defined here because edit pages are wallet-gated (not public content)
// Google can index it if it wants, but there's nothing to see without a wallet
export const metadata: Metadata = {
  // Title — "Edit Collection" in the browser tab
  // Clear, descriptive, creator-facing. No ambiguity about where you are.
  title: 'Edit Collection',
}

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * EditCollectionPage - The exported default for /dashboard/collections/[id]/edit
 * The thinnest possible server wrapper over a client component
 * Metadata lives here; everything else lives in EditCollectionClient
 *
 * Why not just use EditCollectionClient as the page directly?
 * Because Client Components can't export metadata in Next.js 13+.
 * This thin wrapper is the price we pay for that framework constraint.
 * It's a very small price. We pay it willingly.
 */
export default function EditCollectionPage() {
  // Render EditCollectionClient directly — no wrapper div, no fragment drama
  // The client component manages its own layout and spacing
  // Trust it. It knows what it's doing. (Usually.)
  return <EditCollectionClient />
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — edit page wrapper and "just let EditCollectionClient handle it" philosopher.
// Thin file. Big responsibility. Edit your collection. Ship the changes. Don't break anything.
// P.S. — The [id] is in the URL. EditCollectionClient reads it. You don't have to forward it.
