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

// NotFoundContent — the actual UI: the 404 number, the sad message, the "go home" CTA
// This is where we say "you're lost" without making the user feel bad about it
// Because it's probably not their fault. Probably. Unless they typed the URL themselves.
// Which they definitely did. But we won't say that.
import NotFoundContent from '@/components/features/not-found/NotFoundContent'

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
    // Fragment — clean, minimal, just the content component
    // The root layout handles the header/footer scaffolding
    // We just need to drop the error UI in and get out of the way
    <>
      {/* NotFoundContent — the 404 UI component
          Big "404" or illustration, friendly message, a button to go home
          Friendly. Clear. Not accusatory. We welcome the lost.
          (Even if they absolutely typed the wrong URL on purpose to test us.) */}
      <NotFoundContent />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — 404 handler, "please don't trap users" advocate, and lost-soul welcomer.
// Wrong URL? Happens to the best of us. The nav is right there. We believe in you.
// P.S. — If you designed a beautiful 404 page, it's not a failure. It's an experience.
