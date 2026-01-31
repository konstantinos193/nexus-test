/**
 * JsonLd - Structured data for SEO (Organization + WebSite)
 * Renders script tags into the document so Google knows who we are
 * Because if we don't tell them, they'll guess. And they're bad at guessing
 *
 * Schema.org types: Organization (who we are), WebSite (what we are)
 * potentialAction = SearchAction so Google can show a search box in results
 *
 * @author Juan - The developer who spoke schema.org
 * (Coded with care, humor, and probably too much coffee)
 */

// SEO config - site URL, name, description, copyright, social URLs
// Because we need one source of truth (and we're not typing these twice)
import { siteUrl, siteName, siteDescription, siteCopyright, twitterUrl, discordUrl } from '@/lib/seo/config'

// Organization - the entity behind the site
// Google uses this for knowledge panels and "official" badges
// Because claiming to be official without schema is like showing up without ID
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  logo: `${siteUrl}/NeXus_Web3_Logo.png`,
  copyrightHolder: { '@type': 'Organization', name: siteCopyright },
  sameAs: [twitterUrl, discordUrl],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    availableLanguage: 'English',
  },
}

// WebSite - the site itself + optional search action
// SearchAction tells Google we have search; they can show a search box in SERPs
// Because making it easy to search from Google is free real estate
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/collections?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

// Escape < and > so they don't break the script tag or get parsed as HTML
// Because unescaped angle brackets in JSON-LD = broken page and a sad Googlebot
function safeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}

export default function JsonLd() {
  return (
    <>
      {/* Organization script - who we are */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
      />
      {/* WebSite script - what we are + search action */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
      />
    </>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Google reads this. We read the room.
