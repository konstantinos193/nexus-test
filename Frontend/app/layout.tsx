/**
 * Root Layout - The constitutional foundation of this entire Next.js app
 * Wraps every single page. Every. Single. One.
 * This is the skeleton. Everything else is organs. (Yes, we use anatomy metaphors. Deal with it.)
 *
 * Break this file and you break everything. The whole app. Every route. All of it.
 * No pressure. Just... be careful. Please.
 *
 * Responsibilities:
 * - Global fonts (because default system fonts are a crime against design)
 * - SEO metadata (so Google doesn't think we're a scam site)
 * - Viewport config (responsive design isn't optional in 2026)
 * - Dark mode class on <html> (light mode is for peasants, and we are not peasants)
 * - Provider stack (wallets, queries, the works)
 * - Global CSS (because inline styles scale about as well as my patience on Mondays)
 *
 * @author Juan - The developer who laid this foundation and prays nobody touches it
 * (Coded with care, dark humor, and the quiet terror of knowing this file affects everything)
 */

// Next.js types — Metadata and Viewport, the TypeScript contracts we honor
// Miss one of these and the compiler will remind you loudly. Repeatedly.
import type { Metadata, Viewport } from 'next'

// Plus Jakarta Sans — a clean, modern Google Font that isn't Comic Sans
// Variable font because we're efficient like that. One file, infinite weights.
// If you switch this font, half the design breaks. You've been warned.
import { Plus_Jakarta_Sans } from 'next/font/google'

// Global CSS — the styles that govern the entire app's baseline appearance
// This is where Tailwind base, dark mode tokens, and scrollbar overrides live
// Touch this file and suddenly nothing looks right. Classic cascade.
import './globals.css'

// JsonLd — injects schema.org structured data into <head> for rich search results
// The difference between a bland search result and a fancy one with site links
// Google is watching. We dress accordingly.
import JsonLd from '@/components/seo/JsonLd'

// QueryProvider — wraps the app in React Query context
// Every useQuery and useMutation call in this app depends on this existing
// Remove it and watch 40 hooks explode simultaneously. Spectacular. Not recommended.
import QueryProvider from '@/components/providers/QueryProvider'

// PhantomProviderClient — our custom Solana wallet provider (Phantom + Solflare)
// Handles the SSR/browser mismatch so Next.js doesn't panic on first render
// Without this, wallet hooks return undefined and users can't connect. Game over.
import PhantomProviderClient from '@/components/providers/PhantomProviderClient'

// Layout — the header, nav, footer scaffold that wraps every page's content
// Without it we're just raw content floating in a void like a lost NFT
import Layout from '@/components/layout/Layout'

// Footer — the bottom of every page. Links, copyright, the legal stuff.
// Nobody reads it, but the lawyers want it there. So it's there.
import Footer from '@/components/layout/Footer'

// ── Font Configuration ────────────────────────────────────────────────────────
// Plus Jakarta Sans — loaded once, applied everywhere via CSS variable
// display: swap means text is visible during font load (no invisible flash of nothing)
// adjustFontFallback reduces Cumulative Layout Shift. CLS scores matter. Allegedly.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],          // Latin subset only — we're not shipping a full unicode font for no reason
  variable: '--font-sans',     // CSS variable so Tailwind's font-sans utility picks it up
  display: 'swap',             // Show fallback while font loads. Nobody likes staring at blank text.
  preload: true,               // Preload the font file so it's ready before the browser asks
  adjustFontFallback: true,    // Tweak fallback metrics to minimize layout shifts. CLS is a silent killer.
})

// ── SEO Config Imports ────────────────────────────────────────────────────────
// All the identity tokens — name, URL, description, socials, colors, images
// The whole brand fingerprint in one import. Handle with care.
// These power both the <metadata> export below and the JsonLd component above
import {
  siteUrl,          // The canonical base URL. Everything resolves against this.
  siteName,         // The site's display name. Shows up everywhere. Be proud of it.
  siteTitleDefault, // The default <title>. What tabs show. What Google shows. Make it count.
  siteDescription,  // The meta description. 155 chars to make someone click. Good luck.
  siteKeywords,     // Keywords. Google says they don't matter. We include them anyway.
  siteAuthor,       // Who made this? Juan. But officially, the team. You know how it is.
  twitterHandle,    // @handle for Twitter Card attribution. Still relevant. Apparently.
  themeColor,       // The mobile browser chrome tint color. Small detail. Big vibe.
  ogImagePath,      // The OG image path — what shows up in social link previews
                    // A bad OG image is the difference between a click and a scroll-past
} from '@/lib/seo/config'

// ── Viewport ──────────────────────────────────────────────────────────────────
// Tells browsers how to scale and what color the top chrome should be
// Separated from metadata in Next.js 13+ because of course it is
// (Framework evolution: things get split into more files over time. Always.)
export const viewport: Viewport = {
  width: 'device-width',   // Responsive. Mobile-first. Not 1999.
  initialScale: 1,         // Don't zoom in on load. We trust our font sizes.
  themeColor: themeColor,  // Tints the mobile browser chrome. Android especially.
                           // Small thing. But opening the app and seeing the right color feels good.
}

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// The complete metadata object that Next.js injects into every page's <head>
// This is the root-level default — page-level metadata overrides specific fields
// Think of it as the "if nobody else claims it, this is what shows up" config
// Google's gotta know who we are. This is our introduction.
export const metadata: Metadata = {
  // Base URL — all relative metadata URLs are resolved against this
  // Get this wrong and OG images, canonical URLs, and sitemaps all break
  metadataBase: new URL(siteUrl),

  // Title config — default for pages without their own title, template for those that do
  // "%s | NeXus" = "Collections | NeXus", "FAQ | NeXus", etc.
  // Consistent branding across every tab in every browser. As intended.
  title: {
    default: siteTitleDefault,
    template: `%s | ${siteName}`, // The template slot. Pages fill in the %s.
  },

  // Description — the elevator pitch. 155 chars. Make them count.
  // This is what users see in search results before deciding to click (or not).
  description: siteDescription,

  // Keywords — the old-school SEO tag that Google "ignores" but we include
  // because Bing still cares and we respect all search engines equally.
  // (We don't. But still.)
  keywords: siteKeywords,

  // Author — credit where it's due. We made this. It's documented now.
  authors: [{ name: siteAuthor, url: siteUrl }],
  creator: siteAuthor,
  publisher: siteAuthor,

  // Format detection — prevents mobile browsers from auto-linking phone numbers and emails
  // Because we don't want random numbers on the page becoming phantom phone links
  // Happened to someone once. They called the number. It was a pizza place.
  formatDetection: {
    telephone: false, // No. That number is a wallet address prefix, not a phone.
    email: false,     // No. That string is not an email, browser. Stop trying.
    address: false,   // No. That text is not a postal address. Please.
  },

  // Open Graph — what shows up when someone shares our URL on Discord, Telegram, Slack
  // The preview card with image, title, and description
  // A good OG card = clicks. A missing one = sadness. We choose clicks.
  openGraph: {
    type: 'website',            // We're a website. Not a book. Not a movie. A website.
    locale: 'en_US',            // English, US. The default lingua franca of the internet.
    url: siteUrl,               // The canonical URL of the site
    siteName,                   // The display name in the card
    title: siteTitleDefault,    // The headline of the card
    description: siteDescription, // The body copy of the card
    images: [
      {
        url: ogImagePath,       // The hero image — please make this look good
        width: 1200,            // Standard OG image width
        height: 630,            // Standard OG image height (1.91:1 ratio, classic)
        alt: `${siteName} – The Next-Generation Web3 Launchpad`,
        // Alt text for accessibility and for the one screen reader that crawls OG images
      },
    ],
  },

  // Twitter Card — the specialized OG for Twitter/X previews
  // summary_large_image = big banner card, not the tiny square thumbnail
  // Because tiny thumbnails are for accounts with things to hide. We have nothing to hide.
  twitter: {
    card: 'summary_large_image', // The big one. The whole card. Make it pop.
    title: siteTitleDefault,
    description: siteDescription,
    creator: twitterHandle,      // @ourhandle — attribution in the card footer
    images: [ogImagePath],       // Same image as OG. Consistency is a virtue.
  },

  // Robots — the crawl policy. Index us. Follow our links. Tell your friends.
  // We have nothing to hide (see: transparency, also the Privacy Policy page)
  // max-snippet and max-image-preview are the SEO version of "go ahead, take it all"
  robots: {
    index: true,    // Yes. Index us. Please. We need the traffic.
    follow: true,   // Yes. Follow our links. We vouch for them. Mostly.
    googleBot: {
      index: true,                  // Specifically for Google's bot. Extra polite.
      follow: true,                 // Follow all the links, Googlebot. All of them.
      'max-video-preview': -1,      // No limit on video previews. We don't have videos but still.
      'max-image-preview': 'large', // Show the full image in search. We're proud of our images.
      'max-snippet': -1,            // No limit on text snippet length. Show it all.
    },
  },

  // Icons — favicon and Apple touch icon
  // The tiny image that lives in browser tabs and bookmark folders
  // Yes, it matters. People notice when it's missing. They don't say anything. But they notice.
  icons: {
    icon: '/favicon.png',           // Standard favicon — tabs, bookmarks, history
    apple: '/NeXus_Web3_Logo.png',  // Apple touch icon — iOS home screen, because Apple
  },

  // Manifest — PWA manifest for progressive web app capabilities
  // Install-to-home-screen, offline mode, native-feel. Future-proofing.
  // (Or just checking the "has manifest" box. Both are valid motivations.)
  manifest: '/manifest.json',

  // Canonical — the definitive URL for the root of the site
  // Because sometimes the same content is accessible at multiple URLs
  // and we need to tell crawlers "this one is the real one, ignore the others"
  alternates: {
    canonical: siteUrl,
  },

  // Category — a hint to Google about what kind of site this is
  // "technology" feels right for a Web3 NFT launchpad on Solana
  category: 'technology',
}

// ── Root Layout Component ─────────────────────────────────────────────────────

/**
 * RootLayout - The outermost wrapper for every single page in the app
 * Renders the <html> and <body> elements that Next.js can't render itself
 * Every page's content flows through this component. Every. Single. One.
 *
 * The provider stack order matters:
 * QueryProvider must be outside everything that uses React Query hooks
 * PhantomProviderClient must be outside everything that uses wallet hooks
 * Layout/Footer are inside because they use both
 *
 * Get the nesting wrong and you get "hook called outside of provider" errors.
 * Those errors are fun to debug. (They are not fun to debug.)
 */
export default function RootLayout({
  children,
}: {
  // children — the actual page content. Whatever Next.js routes to.
  // Could be the homepage. Could be the 404. Could be anything.
  // We don't know. We don't judge. We just render.
  children: React.ReactNode
}) {
  return (
    // HTML element — the root of the document tree
    // lang="en" for accessibility and translation tools
    // className="dark" because dark mode is superior, light mode is for peasants,
    // and we made this decision once and now we never revisit it
    <html lang="en" className="dark">
      {/* Body — where all the visible content actually lives
          Font variable applied here so every component can inherit it via CSS
          bg-dark-bg-primary and text-dark-text-primary set the base dark theme
          antialiased smooths subpixel rendering. Jagged text is not our brand.
          min-h-screen ensures the body fills the viewport even on short pages
          Because a half-height body with a white flash below it looks amateur */}
      <body className={`${plusJakarta.variable} ${plusJakarta.className} font-sans bg-dark-bg-primary text-dark-text-primary min-h-screen antialiased`}>

        {/* QueryProvider — React Query context. The data fetching nervous system.
            Provides caching, refetching, deduplication, and background updates.
            Without this, every useQuery() in the app throws a context error.
            Every. Single. One. All at once. It's a spectacle. Not a good one. */}
        <QueryProvider>

          {/* PhantomProviderClient — Solana wallet context (Phantom + Solflare)
              Wraps the wallet adapter providers with an SSR safety check
              So we never try to access window.solana during server render
              SSR + browser-only wallet APIs = pain. This component absorbs that pain for us. */}
          <PhantomProviderClient>

            {/* JsonLd — schema.org structured data injected into <head>
                Enables rich search results: site links, breadcrumbs, FAQ snippets
                Invisible to users. Catnip for search engine crawlers.
                Google sees this and thinks we're professional. We are. Mostly. */}
            <JsonLd />

            {/* Layout — the nav/header/footer shell for every page
                Receives Footer as a prop so the server can render it alongside children
                children = the page content. Layout provides the frame. The art hangs inside. */}
            <Layout footer={<Footer />}>{children}</Layout>

          </PhantomProviderClient>
        </QueryProvider>
      </body>
    </html>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — the foundation architect who whispers "please don't break this" to every deploy.
// This file is the bones. Everything else is just flesh and animations.
// Dark mode is on by default. It will stay that way. This is not a democracy.
