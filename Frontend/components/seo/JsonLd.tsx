/**
 * JSON-LD structured data for SEO (Organization, WebSite).
 * Renders safely into the document head.
 */

import { siteUrl, siteName, siteDescription, siteCopyright } from '@/lib/seo/config'

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  logo: `${siteUrl}/NeXus_Web3_Logo.png`,
  copyrightHolder: { '@type': 'Organization', name: siteCopyright },
  sameAs: [
    // Add social media profiles here when available
    // 'https://twitter.com/nexusweb3',
    // 'https://discord.gg/nexus',
    // 'https://github.com/nexus',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    availableLanguage: 'English',
  },
}

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

function safeJsonLd(obj: object): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
}

export default function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
      />
    </>
  )
}
