import { NFTCollection } from '@/types'

/**
 * Static collection data for homepage and discover (Milestone1-style placeholders).
 * Placeholder names + placehold.net images so we index something when API is empty.
 *
 * @author Juan – The developer who filled the void with placeholders
 */

// placehold.net – square for avatar/card, landscape for banner
const PLACEHOLD_SQUARE = 'https://placehold.net/600x600.png'
const PLACEHOLD_BANNER = 'https://placehold.net/800x600.png'

/**
 * Mock collections for /collections page and discover pool.
 */
export const mockCollections: NFTCollection[] = [
  {
    id: '1',
    name: 'Placeholder',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 8421,
    price: 0.08,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Demo Drop',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x0987654321098765432109876543210987654321',
    blockchain: 'solana',
    totalSupply: 5000,
    minted: 5000,
    price: 0.12,
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Sample',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 2341,
    price: 0.05,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Example',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    blockchain: 'solana',
    totalSupply: 8000,
    minted: 6123,
    price: 0.1,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Test Mint',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x2222222222222222222222222222222222222222',
    blockchain: 'solana',
    totalSupply: 6000,
    minted: 4456,
    price: 0.15,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Preview',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x3333333333333333333333333333333333333333',
    blockchain: 'solana',
    totalSupply: 12000,
    minted: 1234,
    price: 0.03,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    name: 'Filler',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x4444444444444444444444444444444444444444',
    blockchain: 'solana',
    totalSupply: 9000,
    minted: 7890,
    price: 0.09,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '8',
    name: 'Dummy',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x5555555555555555555555555555555555555555',
    blockchain: 'solana',
    totalSupply: 7000,
    minted: 5678,
    price: 0.07,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

/**
 * Featured collections for home (hero, featured grid, hot collections).
 * Used as fallback when API returns empty so homepage always has indexable content.
 */
export const featuredCollections: NFTCollection[] = [
  {
    id: 'f1',
    name: 'Placeholder',
    description: 'Lorem ipsum dolor sit amet. Placeholder description for demo.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 3421,
    price: 0.08,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f2',
    name: 'Demo Drop',
    description: 'Consectetur adipiscing elit. Sample text for featured drop.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x0987654321098765432109876543210987654321',
    blockchain: 'solana',
    totalSupply: 5000,
    minted: 5000,
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f3',
    name: 'Sample',
    description: 'Sed do eiusmod tempor incididunt. Demo content.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 0,
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f4',
    name: 'Example',
    description: 'Ut labore et dolore magna. Demo content.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    blockchain: 'solana',
    totalSupply: 8000,
    minted: 2500,
    price: 0.05,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f5',
    name: 'Test Mint',
    description: 'Aliqua enim ad minim veniam. Filler text.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x2222222222222222222222222222222222222222',
    blockchain: 'solana',
    totalSupply: 6000,
    minted: 1800,
    price: 0.12,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f6',
    name: 'Preview',
    description: 'Quis nostrud exercitation. Demo content.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x3333333333333333333333333333333333333333',
    blockchain: 'solana',
    totalSupply: 12000,
    minted: 4500,
    price: 0.03,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f7',
    name: 'Filler',
    description: 'Ullamco laboris nisi ut aliquip. Temporary demo content.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x4444444444444444444444444444444444444444',
    blockchain: 'solana',
    totalSupply: 9000,
    minted: 3200,
    price: 0.07,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'f8',
    name: 'Dummy',
    description: 'Ex ea commodo consequat. Demo content.',
    imageUrl: PLACEHOLD_SQUARE,
    bannerUrl: PLACEHOLD_BANNER,
    creator: 'Creator',
    creatorAddress: '0x5555555555555555555555555555555555555555',
    blockchain: 'solana',
    totalSupply: 7000,
    minted: 2100,
    price: 0.09,
    status: 'minting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const now = Date.now()
const day = 24 * 60 * 60 * 1000

/**
 * Discover section pool: extends featured + mock with endDate, varied createdAt, free mints.
 * Used as fallback when API returns empty so discover tabs show indexable content.
 */
export const discoverCollections: NFTCollection[] = [
  ...featuredCollections.map((c, i) => ({
    ...c,
    createdAt: new Date(now - (i * 1.5 * day)).toISOString(),
    updatedAt: new Date(now - (i * 1.5 * day)).toISOString(),
    ...(i < 3 ? { endDate: new Date(now + (i + 1) * day).toISOString() } : {}),
    ...([1, 4, 6].includes(i) ? { price: 0 as number } : {}),
  })),
  ...mockCollections.map((c, i) => ({
    ...c,
    id: `d${c.id}`,
    createdAt: new Date(now - (8 + i) * day).toISOString(),
    updatedAt: new Date(now - (8 + i) * day).toISOString(),
    ...(i < 2 ? { endDate: new Date(now + (4 + i) * day).toISOString() } : {}),
    ...([2, 5].includes(i) ? { price: 0 as number } : {}),
  })),
]

/** Tab ids for discover section (match useDiscoverCollections) */
export type DiscoverTabId = 'trending' | 'new' | 'ending_soon' | 'free_mint'

/**
 * Filter discover placeholder pool by tab for fallback when API is empty.
 * trending = all; new = by createdAt desc; ending_soon = has endDate; free_mint = price 0.
 */
export function getDiscoverCollectionsByTab(tab: DiscoverTabId): NFTCollection[] {
  const list = [...discoverCollections]
  switch (tab) {
    case 'new':
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    case 'ending_soon':
      return list.filter((c) => c.endDate).slice(0, 12)
    case 'free_mint':
      return list.filter((c) => c.price === 0)
    default:
      return list
  }
}
