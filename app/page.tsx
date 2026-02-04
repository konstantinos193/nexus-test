/**
 * Home Page - The landing page that welcomes users
 * This is the first impression, so it better be good
 * Because first impressions are everything (unlike second chances)
 * 
 * This is where it all begins - the page that greets visitors
 * If they don't like what they see here, they're probably not coming back
 * (And honestly, can you blame them?)
 * 
 * @author Juan - The developer who built this digital welcome mat
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import { siteDescription, siteTitleDefault, absoluteUrl, ogImagePath, siteName } from '@/lib/seo/config'
// Layout - header, footer, the scaffolding that holds our beautiful content
// Without it we're just a div floating in space (literally and metaphorically)
import Layout from '@/components/layout/Layout'
// HomePageContent - the hero, the collections, the features. The good stuff.
// Layout is the skeleton; this is the organs. And the personality. Mostly the personality.
import HomePageContent from '@/components/features/home/HomePageContent'

// SEO Metadata - because Google needs to know what we're about
// This is what shows up in search results and social media shares
// Because if nobody can find us, we're just screaming into the void
export const metadata: Metadata = {
  // Page title - the thing that shows up in browser tabs
  // Keep it short, because long titles get cut off in browser tabs
  title: { absolute: siteTitleDefault },
  
  // Description - the elevator pitch for search engines
  // This is what people see when they search for us
  // So it better be good (or at least not terrible)
  description: siteDescription,
  
  // Canonical URL - tells search engines "this is the real page"
  // Because duplicate content is a sin (and Google will punish us for it)
  alternates: { canonical: absoluteUrl('/') },
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/'),
    siteName,
    title: siteTitleDefault,
    description: siteDescription,
    images: [
      {
        url: absoluteUrl(ogImagePath),
        width: 1200,
        height: 630,
        alt: `${siteName} – Create & launch NFT collections`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitleDefault,
    description: siteDescription,
    images: [absoluteUrl(ogImagePath)],
  },
}

/**
 * Home Page Component - The main entry point
 * This is what gets rendered when someone visits the root URL
 * It's simple, clean, and delegates to other components
 * Because this page is just a wrapper (like a gift box, but for code)
 */
export default function Home() {
  return (
    // Layout wrapper - provides the header, footer, and overall structure
    // Because every page needs a frame for proper structure
    <Layout>
      {/* Home Page Content - the actual meat of the page
          This is where the hero, collections, and features live
          Because the Layout is just the skeleton, this is the organs
          (And yes, I'm comparing our homepage to a body. Deal with it.) */}
      <HomePageContent />
    </Layout>
  )
}

// Coded by Juan - because every good codebase needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Welcome to the homepage. Hope you like what you see! 
