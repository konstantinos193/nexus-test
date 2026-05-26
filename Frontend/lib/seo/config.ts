/**
 * SEO Configuration - Single source of truth for site metadata
 * This file contains all the SEO-related constants and utilities
 * Because scattering SEO config everywhere is a recipe for disaster
 * 
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com)
 * Or prepare to face the consequences of broken canonical URLs
 * 
 * @author Juan - The developer who organized this SEO mess
 * (Coded with care, humor, and probably too much coffee)
 */

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexus-web3.com'

export const siteName = 'NeXus'
export const siteTitleDefault = 'NeXus Web3 Launchpad – Beyond NFTs'
export const siteDescription =
  'NeXus is a next-generation blockchain incubation and tokenization platform. Launch tokens, tokenize real estate, mint NFTs, and access DeFi tools — powered by MarTech Networks.'
export const siteKeywords = [
  'Web3 launchpad',
  'blockchain tokenization',
  'real estate tokenization',
  'NFT minting platform',
  'token launch',
  'DeFi tools',
  'Solana NFT launchpad',
  'NFT creator tools',
  'startup incubation Web3',
  'IDO launchpad',
  'Web3',
]
export const siteAuthor = 'NeXus Web3'
/** Copyright holder for footer and legal notices. */
export const siteCopyright = 'MarTech Networks'
export const twitterHandle = '@nexusweb3' // Update with real handle
export const locale = 'en_US'
export const themeColor = '#0a0a0f'
export const ogImagePath = '/hero-bg.jpg'

export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageTitle(title: string, template = true): string {
  return template ? `${title} | ${siteName}` : title
}

// Coded by Juan - because every good config needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - SEO: making Google happy since... always. 🚀
