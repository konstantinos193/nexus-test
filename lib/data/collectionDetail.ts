import type { CollectionDetail } from '@/types'

/**
 * Mock collection detail for /collections NFT detail page (wireframe).
 * Swap for API later; for now we fake it like our hopes and dreams.
 */
export const mockCollectionDetail: CollectionDetail = {
  id: 'nexus-demo',
  slug: 'nexus-genesis-demo',
  name: 'NeXus Genesis',
  description:
    'NeXus Genesis is the flagship NFT collection powering the launchpad. Holders get staking rewards, game integrations, token airdrops, and governance access. Short description of the collection. Lore, utility, and roadmap summary live here.',
  imageUrl: '/nexuslogo_nobg.png',
  bannerUrl: '/NeXus_Web3_Logo.png',
  creator: 'NeXus Studio',
  creatorAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  blockchain: 'solana',
  totalSupply: 5000,
  minted: 3420,
  price: 0.69,
  status: 'minting',
  verified: true,
  floorPrice: 1.24,
  volume: 3420,
  owners: 1892,
  utility: [
    'Staking rewards',
    'Game / Roblox integration',
    'Token airdrops',
    'Governance access',
  ],
  roadmap: ['Phase 1', 'Phase 2', 'Phase 3'],
  traits: [
    { name: 'Background', count: 12 },
    { name: 'Eyes', count: 9 },
    { name: 'Headwear', count: 7 },
    { name: 'Special', count: 3 },
  ],
  galleryItems: Array.from({ length: 8 }, (_, i) => ({
    id: String(i + 1).padStart(3, '0'),
    imageUrl: '/NeXus_Web3_Logo.png',
  })),
  activity: [
    { type: 'minted', tokenId: '#1423', user: 'Jeff', when: '2 mins ago' },
    { type: 'listed', tokenId: '#982', user: '—', when: '5 mins ago', price: 1.3 },
    { type: 'sold', tokenId: '#417', user: '—', when: '12 mins ago', price: 1.1 },
  ],
  mintStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  discordUrl: 'https://discord.com',
  twitterUrl: 'https://x.com',
  secondaryMarketUrl: 'https://magiceden.io',
}
