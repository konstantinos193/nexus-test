/**
 * 404 Not Found Page - The "oops, that URL doesn't exist" experience
 * Renders when a route doesn't match or notFound() is called.
 * Uses Layout (Header + Footer) so users can still navigate away.
 * Because trapping people on a 404 with no escape would be cruel.
 * (We're nice like that. Lost? Here's a header. Here's a footer. Find your way home.)
 *
 * @author Juan - The developer who made getting lost slightly less awful
 * (Coded with care, humor, and probably too much coffee)
 */

// Layout - header, footer. Even 404s need a frame. Escape routes matter.
import Layout from '@/components/layout/Layout'
// NotFoundContent - the actual "404" message, maybe a funny illustration, CTA to go home
// This is where we say "you're lost" without being mean about it
import NotFoundContent from '@/components/features/not-found/NotFoundContent'

/**
 * NotFound - Renders when someone hits a dead-end URL
 * We wrap in Layout so they're not stuck in the void. We've all been there.
 */
export default function NotFound() {
  return (
    <Layout>
      {/* NotFoundContent - the "this page doesn't exist" UI. Friendly. Helpful. Not cruel. */}
      <NotFoundContent />
    </Layout>
  )
}

// Coded by Juan - 404 handler and "please don't trap users" advocate
// (Lost? We've got you. Header. Footer. Navigate away. You're welcome.)
// P.S. - Wrong URL? It happens. Head home. We'll be there. 🏠
