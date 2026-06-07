/**
 * 404 Not Found Page - The "you took a wrong turn and ended up here" experience
 * Renders whenever a route doesn't match OR when any server component calls notFound()
 * Uses the global Layout so users can still navigate away instead of being trapped
 * Because trapping people on a dead-end page with no escape is genuinely cruel.
 * (We're nice like that. Lost? Here's a header. Here's a footer. You're free to go.)
 *
 * This file is actually important for UX despite doing almost nothing.
 * A naked 404 with no navigation = bounce rate goes vertical.
 * A 404 with a header = "oh I can click to go home." Retention. Magic.
 *
 * Common triggers:
 * - User typed a URL wrong (classic)
 * - An old link that no longer exists (also classic)
 * - A dynamic route that returned notFound() (very developer of them)
 * - Someone just exploring. Happens more than you'd think.
 *
 * @author Juan - The developer who made getting lost slightly less existentially distressing
 * (Coded with empathy, humor, and the knowledge that we've all hit a 404 before)
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * NotFound - The exported page component for the 404 state
 * Called automatically by Next.js when no route matches or notFound() is invoked
 * We wrap in a fragment (not a Layout) because the root layout already provides structure
 * Adding another Layout here would double-render the nav. Nobody wants double nav.
 *
 * The real question: does anyone design their 404 pages first?
 * Juan does. Because a good 404 is a retention tool dressed as an error page.
 */
export default function NotFound() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-12 text-center" aria-labelledby="not-found-heading">
      <div className="max-w-md">
        <h1 id="not-found-heading" className="text-6xl lg:text-8xl font-bold leading-none tracking-tight text-gray-500">
          404
        </h1>
        <p className="text-lg font-medium text-white mt-3">Page not found</p>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 mt-8 px-6 py-3 text-sm font-medium text-cyan-400 no-underline rounded-lg border border-gray-700 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </section>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — 404 handler, "please don't trap users" advocate, and lost-soul welcomer.
// Wrong URL? Happens to the best of us. The nav is right there. We believe in you.
// P.S. — If you designed a beautiful 404 page, it's not a failure. It's an experience.
