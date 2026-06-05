/**
 * Home Page - The landing page that welcomes users, strangers, and curious Googlebots
 * This is the first impression, so it better be good.
 * Because first impressions are everything (unlike second chances, which we also don't get).
 *
 * This is where it all begins — the page that greets visitors before they bounce.
 * If they don't like what they see here, they're probably not coming back.
 * (And honestly, can you blame them? The internet has infinite tabs.)
 *
 * No data fetching. No drama. Just a component and a prayer.
 * The real work is in HomePageContent. We are merely the stage.
 *
 * @author Juan - The developer who built this digital welcome mat
 * (Coded with care, dark humor, and an amount of coffee that should concern a physician)
 */

// Next.js Metadata type — the TypeScript contract for our SEO promises
// Without this type, we'd be writing metadata in the dark. More than usual.
import type { Metadata } from 'next'

// SEO config — the holy trinity of title, description, and canonical URL
// Google's gotta know we exist. Otherwise we're just a URL screaming into the void.
// (Not poetic. Just factual.)
import { siteDescription, siteTitleDefault, absoluteUrl } from '@/lib/seo/config'

// HomePageContent — the hero, the collections preview, the features, the whole show
// This is the organ; we're just the ribcage. Important, but nobody comes to see the ribcage.
// Without it we're just an empty wrapper begging for purpose.
import HomePageContent from '@/components/features/home/HomePageContent'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// The stuff that shows up in search results, browser tabs, and social previews.
// Basically our public-facing resume. Make it count.
// Because if nobody finds us, we're just a beautifully designed 404 waiting to happen.
export const metadata: Metadata = {
  // Page title — the thing browser tabs display when they run out of space
  // Keep it crisp. Google cuts it off around 60 chars anyway. Classic Google.
  title: { absolute: siteTitleDefault },

  // Description — our elevator pitch to search engines and their users
  // 155 characters to convince someone this is worth a click.
  // No pressure. (There's pressure.)
  description: siteDescription,

  // Canonical URL — the official, one-true URL for this page
  // Tells search engines "stop indexing 47 variants, THIS is the one"
  // Because duplicate content is a sin and Google is the judge.
  alternates: { canonical: absoluteUrl('/') },

  // Open Graph — for those fancy social preview cards when someone shares us
  // This is the difference between a link that gets clicks and a link that gets ignored.
  // We prefer clicks. Strongly.
  openGraph: {
    title: siteTitleDefault,
    description: siteDescription,
    url: absoluteUrl('/'),
  },

  // Twitter Card — same vibe as OG, but for the bird (or whatever X is now)
  // Because Twitter users deserve nice previews too.
  // (The platform has its chaos; our metadata does not.)
  twitter: {
    title: siteTitleDefault,
    description: siteDescription,
  },
}

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * Home - The root page component. Short, clean, and to the point.
 * This component's entire job is to exist and render HomePageContent.
 * It does this admirably. We are proud of it.
 *
 * If you're wondering why there's no data fetching here:
 * that's the HomePageContent component's problem. Not ours.
 * (Separation of concerns. Beautiful thing.)
 */
export default function Home() {
  return (
    // Fragment — because wrapping in a div would be wasteful and we care about the DOM tree
    // (We care about the DOM tree more than we care about Mondays, which is a low bar)
    <>
      {/* HomePageContent — the actual reason users are here
          Hero section, featured collections, pitch text, CTA buttons — all of it.
          This is the organs. We're the ribcage. The anatomy metaphor stands.
          If this doesn't render, we have bigger problems than a missing comment. */}
      <HomePageContent />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — because this page doesn't render itself (even though Next.js tries really hard).
// First impressions matter. This one's ours. We spent 47 seconds choosing the font.
// P.S. — Welcome. Look around. Don't forget to mint something.
