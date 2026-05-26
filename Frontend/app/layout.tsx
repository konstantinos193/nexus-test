/**
 * Root Layout Component - The foundation of the entire app
 * This wraps every page and provides the global structure
 * Because every app needs a root, and this is ours
 * (Think of it as the foundation of a house, but for code)
 * 
 * This is where we set up:
 * - Global fonts (because default fonts are boring)
 * - SEO metadata (because Google needs to know we exist)
 * - Theme configuration (because dark mode is superior)
 * - Global styles (because inline styles are not ideal)
 * 
 * @author Juan - The developer who built this foundation
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import JsonLd from '@/components/seo/JsonLd'
import QueryProvider from '@/components/providers/QueryProvider'
import PhantomProviderClient from '@/components/providers/PhantomProviderClient'
import Layout from '@/components/layout/Layout'
import Footer from '@/components/layout/Footer'

// Font configuration - because default fonts are basic
// Plus Jakarta Sans - a modern, clean font that doesn't look like Comic Sans
// We use variable fonts because they're efficient and modern
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'], // Only Latin characters, because we're not fancy
  variable: '--font-sans', // CSS variable name, because we like organization
  display: 'swap', // Swap display strategy - shows fallback while loading
  // Because nobody likes invisible text while fonts load
  preload: true, // Preload font for faster rendering
  adjustFontFallback: true, // Adjust fallback font metrics for better CLS
})

// SEO Configuration imports - all the stuff Google cares about
// Because if Google doesn't know we exist, we're just screaming into the void
import {
  siteUrl,
  siteName,
  siteTitleDefault,
  siteDescription,
  siteKeywords,
  siteAuthor,
  twitterHandle,
  themeColor,
  ogImagePath,
  absoluteUrl,
} from '@/lib/seo/config'

// Viewport configuration - tells browsers how to render the page
// Because responsive design isn't optional (it's 2026, not 1999)
export const viewport: Viewport = {
  width: 'device-width', // Use device width for responsive design
  initialScale: 1, // Start at 100% zoom, because we're not trying to trick users
  themeColor: themeColor, // Theme color for mobile browsers
  // Because even mobile browsers deserve nice colors
}

// SEO Metadata - the stuff that makes Google happy
// This is what shows up in search results, social shares, and browser tabs
// Because if nobody can find us, we're just a pretty website nobody visits
export const metadata: Metadata = {
  // Base URL for all metadata - because relative URLs are confusing
  metadataBase: new URL(siteUrl),
  
  // Page title configuration
  // Default title for when no specific title is set
  // Template for when pages want to add their own title
  // Because every page deserves a title (unlike some people's social media)
  title: {
    default: siteTitleDefault,
    template: `%s | ${siteName}`, // Format: "Page Name | Site Name"
  },
  
  // Description - the elevator pitch for search engines
  // This is what people see when they search for us
  // So it better be good (or at least not terrible)
  description: siteDescription,
  
  // Keywords - because SEO in 2026 still uses keywords
  // (Even though Google says they don't matter, they totally do)
  keywords: siteKeywords,
  
  // Author information - who made this masterpiece
  // Because credit where credit is due (and we're not thieves)
  authors: [{ name: siteAuthor, url: siteUrl }],
  creator: siteAuthor,
  publisher: siteAuthor,
  
  // Format detection - tells browsers not to auto-detect phone numbers, emails, etc.
  // Because we don't want browsers turning our text into clickable links
  // (Unless we explicitly want that, which we don't)
  formatDetection: {
    telephone: false, // Don't auto-detect phone numbers
    email: false, // Don't auto-detect emails
    address: false, // Don't auto-detect addresses
  },
  
  // Open Graph metadata - for when people share us on social media
  // This is what shows up in those fancy preview cards
  // Because we want to look good when people share us (unlike my dating profile)
  openGraph: {
    type: 'website', // It's a website, not a book or movie
    locale: 'en_US', // English, US locale (because we're not fancy)
    url: siteUrl, // The URL of the site
    siteName, // The name of the site
    title: siteTitleDefault, // The title for social shares
    description: siteDescription, // The description for social shares
    images: [
      {
        url: absoluteUrl(ogImagePath), // The image that shows up in shares
        width: 1200, // Standard OG image size
        height: 630, // Standard OG image size
        alt: `${siteName} – The Next-Generation Web3 Launchpad`, // Alt text for accessibility
        // Because even social media previews need alt text
      },
    ],
  },
  
  // Twitter Card metadata - same as Open Graph, but for Twitter
  // Because Twitter users deserve nice previews too
  // (Even if the platform itself is a dumpster fire)
  twitter: {
    card: 'summary_large_image', // Large image card (the fancy one)
    title: siteTitleDefault,
    description: siteDescription,
    creator: twitterHandle, // Twitter handle of the creator
    images: [absoluteUrl(ogImagePath)], // Image for Twitter cards
  },
  
  // Robots configuration - tells search engines what to do
  // Because we want Google to index us (unlike some secret websites)
  robots: {
    index: true, // Yes, please index us
    follow: true, // Yes, please follow our links
    googleBot: {
      index: true, // Google, index us
      follow: true, // Google, follow our links
      'max-video-preview': -1, // No limit on video previews
      'max-image-preview': 'large', // Large image previews
      'max-snippet': -1, // No limit on text snippets
      // Because we want Google to show as much as possible
    },
  },
  
  // Icons - the favicon and app icons
  // Because every site needs an icon (or it looks unprofessional)
  icons: {
    icon: '/favicon.png', // Standard favicon
    apple: '/NeXus_Web3_Logo.png', // Apple touch icon (for iOS)
    // Because Apple users deserve nice icons too
  },
  
  // Manifest - PWA manifest file
  // Because progressive web apps are the future (or so they say)
  manifest: absoluteUrl('/manifest.json'),
  
  // Canonical URL - tells search engines "this is the real page"
  // Because duplicate content is a sin (and Google will punish us for it)
  alternates: {
    canonical: siteUrl,
  },
  
  // Category - what kind of site this is
  // Because categorization helps with SEO (and organization)
  category: 'technology', // We're a tech site, obviously
}

/**
 * Root Layout Component - The wrapper for all pages
 * This is what Next.js uses to wrap every page
 * It provides the HTML structure, fonts, and global styles
 * Because every page needs a foundation (and we're not building on sand)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // HTML root - the foundation of the entire page
    // We set lang="en" because we speak English (mostly)
    // We set className="dark" because dark mode is superior
    // (And because light mode is for peasants)
    <html lang="en" className="dark">
      {/* Body - where all the content lives
          We apply the font variable and font class
          We set background and text colors
          We enable antialiasing because jagged text is ugly
          min-h-screen ensures the page is at least full height
          Because empty space at the bottom is sad */}
      <body className={`${plusJakarta.variable} ${plusJakarta.className} font-sans bg-dark-bg-primary text-dark-text-primary min-h-screen antialiased`}>
        {/* QueryProvider - React Query for data fetching
            This enables all the useQuery hooks throughout the app
            Because fetching data shouldn't be complicated */}
        <QueryProvider>
          {/* SolanaWalletProvider - custom in-house wallet context (Solflare + Phantom)
              Handles mounted check internally so SSR never sees browser-only APIs */}
          <PhantomProviderClient>
            <JsonLd />
            <Layout footer={<Footer />}>{children}</Layout>
          </PhantomProviderClient>
        </QueryProvider>
      </body>
    </html>
  )
}

// Coded by Juan - because every good layout needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - This is the foundation. Don't break it. 🏗️
