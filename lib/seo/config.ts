/**
 * SEO Configuration – Single Source of Truth for Site Metadata
 * The place where we tell search engines who we are (and hope they believe us)
 * Because if Google doesn't know we exist, we're just screaming into the void
 * (And the void doesn't have good SEO, trust me, I've checked)
 * 
 * This is like our resume for search engines
 * Except search engines are pickier than HR departments
 * And they judge us silently, without giving feedback
 * (Unlike real HR departments, which also judge silently, but at least they send rejection emails)
 * 
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://yourdomain.com)
 * Because hardcoding URLs is for amateurs (and we're not amateurs, we're professionals)
 * (Or at least we pretend to be professionals, which is basically the same thing)
 * 
 * @author Juan - The developer who configured this SEO masterpiece
 * (Coded with care, humor, and probably too much coffee)
 * P.S. - SEO is like magic, except it's not magic, it's just keywords and metadata
 */

// Site URL - the base URL for our entire site
// Falls back to Vercel URL if not set in production
// Because we need a URL, and if we don't have one, we're just a bunch of files floating in space
// Use ternary instead of ?? to avoid SWC nullish_coalescing transformer bug (Next 16 / swc_ecma_transformer)
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL != null ? process.env.NEXT_PUBLIC_SITE_URL : 'https://nexus-nft-launchpad.vercel.app'

// Site name - what we call ourselves
// Because every site needs a name (and "Untitled Document" is taken)
export const siteName = 'NeXus'

// Default page title - what shows up in browser tabs
// Keep it descriptive, because users have 47 tabs open and can't remember which one is us
export const siteTitleDefault = 'NeXus – Create & Launch Your NFT Collections'

// Site description - the elevator pitch for search engines
// This is what people see when they search for us
// So it better be good (or at least not terrible)
// It's like a Tinder bio, but for search results
export const siteDescription =
  'Professional Solana Web3 launchpad for creators. Create, prepare, and launch NFT collections on Solana with Web3 tools, IPFS storage, and seamless wallet integration.'

// Site keywords - the words we want to rank for
// Because keywords are like wishes - if you say them enough, maybe they'll come true
// (Except keywords actually work, unlike wishes, which are just hopes and dreams)
export const siteKeywords = [
  'Solana Web3 launchpad',
  'Solana NFT',
  'NFT creator',
  'create NFT collection',
  'Web3',
  'Solana',
  'mint NFT',
  'NFT tools',
  'NFT layer generator',
  'NFT rarity',
  'Solana NFT rarity',
  'Phantom',
]

// Site author - who made this (or at least who claims to have made this)
export const siteAuthor = 'NeXus Web3'

// Copyright holder - the legal entity that owns this code
// Because copyright notices are legally required (and we don't want to get sued)
// (And getting sued is expensive, unlike this comment, which is free)
/** Copyright holder for footer and legal notices. */
export const siteCopyright = 'MarTech Networks'

// Twitter handle - our social media presence (or lack thereof)
export const twitterHandle = '@MartechNetworks'

// Social URLs - single source of truth for SEO and links
export const twitterUrl = 'https://x.com/MartechNetworks'
export const discordUrl = 'https://discord.gg/dWTDBzKuXv'

// Locale - the language/region we're targeting
// Because not everyone speaks English (shocking, I know)
export const locale = 'en_US'

// Theme color - the color that shows in browser UI
// Because browsers need to know what color to use (and we're helpful like that)
export const themeColor = '#0a0a0f'

// OG image path - the image that shows when people share us
// Because we want to look good when people share us (and bad images get ignored)
export const ogImagePath = '/share-image.png'

/**
 * Absolute URL function - converts relative paths to absolute URLs
 * Because sometimes you need the full URL (and sometimes you don't)
 * This handles both cases (because we're helpful like that)
 * 
 * @param path - The path to convert (can be relative or already absolute)
 * @returns The absolute URL (because absolute URLs are absolute, not relative)
 * 
 * It's like a GPS for URLs - it tells you exactly where you are
 * (Except it's for URLs, not physical locations, so it's more like a URL GPS)
 */
export function absoluteUrl(path: string): string {
  // If it's already an absolute URL, return it as-is
  // Because we're not going to mess with something that's already working
  // (Unlike my life, which I mess with constantly)
  return path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Page Title function - generates page titles with site name
 * Because every page needs a title (and "Untitled Page" is not a good title)
 * 
 * @param title - The page title (the part that's unique to this page)
 * @param template - Whether to include site name (default: true)
 * @returns The formatted page title (because formatted titles are better than unformatted ones)
 * 
 * This is like a title generator, but for web pages
 * (And it's more reliable than those online title generators, which are just random words)
 */
export function pageTitle(title: string, template = true): string {
  // If template is true, add site name (because context is important)
  // If template is false, just return the title (because sometimes you want just the title)
  // It's like choosing between "Page Title | Site Name" or just "Page Title"
  // (And we're giving you the choice, because we're nice like that)
  return template ? `${title} | ${siteName}` : title
}

// Coded by Juan - because every good config file needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - SEO is like a game, except the rules are unclear and the prize is visibility
// And visibility is important, because if nobody can find us, we're just a URL in the void
