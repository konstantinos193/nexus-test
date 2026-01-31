/**
 * 404 Not Found - The "this URL doesn't exist" page
 * Renders when a route doesn't match or notFound() is called
 * Because the internet is full of typos and dead links
 * (And we're not leaving people in the void with no escape)
 *
 * Uses Layout so they still get header and footer
 * One link home. No drama. No emoji.
 *
 * @author Juan - The developer who made getting lost slightly less awful
 * (Coded with care, humor, and probably too much coffee)
 */

// Layout - header + footer so they can navigate away
// Because trapping people on a 404 with no escape would be cruel
import Layout from '@/components/layout/Layout'
// Next link - for client-side nav to home
import Link from 'next/link'

export default function NotFound() {
  return (
    <Layout>
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        {/* Big 404 - so they know they're lost */}
        <h1 className="text-4xl font-bold text-dark-text-primary mb-2">404</h1>
        <p className="text-dark-text-secondary mb-6">
          This page doesn&apos;t exist.
        </p>
        {/* One link home - the escape hatch */}
        <Link
          href="/"
          className="font-semibold text-dark-accent-primary hover:underline"
        >
          Go home
        </Link>
      </main>
    </Layout>
  )
}

// Coded by Juan - because every good codebase needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Wrong URL? It happens. Head home. We'll be there.
