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
export const siteTitleDefault = 'NeXus – The Solana NFT Launchpad for Creators'
export const siteDescription =
  'NeXus is the Solana NFT launchpad built for creators. Upload your art, go live on-chain, and reach collectors — no smart-contract experience needed.'
export const siteKeywords = [
  'Web3 launchpad',
  'NFT minting platform',
  'no-code NFT launch',
  'Solana NFT launchpad',
  'launch NFT collection',
  'NFT creator tools',
  'Solana NFT',
  'mint NFT on Solana',
  'IPFS NFT storage',
  'Phantom wallet',
  'Web3',
]
export const siteAuthor = 'NeXus Web3'
/** Copyright holder for footer and legal notices. */
export const siteCopyright = 'MarTech Networks'
export const twitterHandle = '@nexusweb3' // Update with real handle
export const locale = 'en_US'
export const themeColor = '#0a0a0f'
export const ogImagePath = '/NeXus_Web3_Logo._2.png'

export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageTitle(title: string, template = true): string {
  return template ? `${title} | ${siteName}` : title
}

// Coded by Juan - because every good config needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - SEO: making Google happy since... always. 🚀
