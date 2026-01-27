/**
 * SEO configuration – single source of truth for site metadata.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com).
 */

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nexus-nft-launchpad.vercel.app'

export const siteName = 'NeXus'
export const siteTitleDefault = 'NeXus – Create & Launch Your NFT Collections'
export const siteDescription =
  'Professional Solana NFT launchpad for creators. Create, prepare, and launch NFT collections on Solana with Web3 tools, IPFS storage, and seamless wallet integration.'
export const siteKeywords = [
  'Solana NFT launchpad',
  'Solana NFT',
  'NFT creator',
  'create NFT collection',
  'Web3',
  'Solana',
  'mint NFT',
  'NFT tools',
  'Phantom',
]
export const siteAuthor = 'NeXus Web3'
/** Copyright holder for footer and legal notices. */
export const siteCopyright = 'MarTech Networks'
export const twitterHandle = '@nexusweb3' // Update with real handle
export const locale = 'en_US'
export const themeColor = '#0a0a0f'
export const ogImagePath = '/share-image.png'

export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function pageTitle(title: string, template = true): string {
  return template ? `${title} | ${siteName}` : title
}
