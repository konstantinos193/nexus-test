import type {
  ActivityLog,
  AdminStats,
  Collection,
  Creator,
  PaginatedResponse,
} from '../types'

export const mockCollections: Collection[] = [
  {
    id: '1a2b3c4d-0001-0000-0000-000000000001',
    slug: 'cosmic-apes-k1a2b',
    name: 'Cosmic Apes',
    description: 'A collection of 2000 uniquely generated ape NFTs traveling through the cosmos.',
    imageUrl: '',
    creator: 'CryptoCreator',
    creatorAddress: 'So1anaWa11etAddress1111111111111111111111111',
    blockchain: 'solana',
    totalSupply: 2000,
    minted: 1450,
    price: 0.5,
    status: 'minting',
    effectiveStatus: 'minting',
    featured: true,
    mintStart: new Date(Date.now() - 86400000 * 3).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    mintAddress: 'M1ntAddr3ss111111111111111111111111111111111',
    txSignature: 'tx1111111111111111111111111111111111111111111111111111111111111111',
    royaltyBasisPoints: 500,
    platformFeeBasisPoints: 100,
    twitterUrl: 'https://twitter.com/cosmicapes',
    discordUrl: 'https://discord.gg/cosmicapes',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '1a2b3c4d-0002-0000-0000-000000000002',
    slug: 'pixel-pandas-k2c3d',
    name: 'Pixel Pandas',
    description: '500 hand-drawn pixel art pandas on Solana.',
    imageUrl: '',
    creator: 'PixelLab',
    creatorAddress: 'So1anaWa11etAddress2222222222222222222222222',
    blockchain: 'solana',
    totalSupply: 500,
    minted: 500,
    price: 0.25,
    status: 'completed',
    effectiveStatus: 'completed',
    featured: false,
    mintStart: new Date(Date.now() - 86400000 * 30).toISOString(),
    endDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    mintAddress: 'M1ntAddr3ss222222222222222222222222222222222',
    txSignature: 'tx2222222222222222222222222222222222222222222222222222222222222222',
    royaltyBasisPoints: 300,
    platformFeeBasisPoints: 100,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '1a2b3c4d-0003-0000-0000-000000000003',
    slug: 'neon-dragons-k3e4f',
    name: 'Neon Dragons',
    description: 'Legendary 3D dragons minted on Solana with unique traits.',
    imageUrl: '',
    creator: 'DragonForge',
    creatorAddress: 'So1anaWa11etAddress3333333333333333333333333',
    blockchain: 'solana',
    totalSupply: 1000,
    minted: 0,
    price: 1.0,
    status: 'ready',
    effectiveStatus: 'ready',
    featured: true,
    mintStart: new Date(Date.now() + 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 9).toISOString(),
    mintAddress: 'M1ntAddr3ss333333333333333333333333333333333',
    txSignature: 'tx3333333333333333333333333333333333333333333333333333333333333333',
    royaltyBasisPoints: 700,
    platformFeeBasisPoints: 150,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '1a2b3c4d-0004-0000-0000-000000000004',
    slug: 'sol-punks-k4g5h',
    name: 'SOL Punks',
    description: 'Free mint — 10,000 punk-style characters for the Solana community.',
    imageUrl: '',
    creator: 'SolanaDevs',
    creatorAddress: 'So1anaWa11etAddress4444444444444444444444444',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 3200,
    price: undefined,
    status: 'minting',
    effectiveStatus: 'minting',
    featured: false,
    mintStart: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    mintAddress: 'M1ntAddr3ss444444444444444444444444444444444',
    txSignature: 'tx4444444444444444444444444444444444444444444444444444444444444444',
    royaltyBasisPoints: 200,
    platformFeeBasisPoints: 100,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: '1a2b3c4d-0005-0000-0000-000000000005',
    slug: 'galaxy-cats-k5i6j',
    name: 'Galaxy Cats',
    description: 'Cats from across the galaxy. 750 unique NFTs.',
    imageUrl: '',
    creator: 'CosmoKitty',
    creatorAddress: 'So1anaWa11etAddress5555555555555555555555555',
    blockchain: 'solana',
    totalSupply: 750,
    minted: 0,
    price: 0.3,
    status: 'preparing',
    effectiveStatus: 'preparing',
    featured: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '1a2b3c4d-0006-0000-0000-000000000006',
    slug: 'robot-squad-k6k7l',
    name: 'Robot Squad',
    description: 'Handcrafted robot illustrations — 300 supply, high rarity.',
    imageUrl: '',
    creator: 'MechStudio',
    creatorAddress: 'So1anaWa11etAddress3333333333333333333333333',
    blockchain: 'solana',
    totalSupply: 300,
    minted: 0,
    price: 2.0,
    status: 'paused',
    effectiveStatus: 'paused',
    featured: false,
    mintStart: new Date(Date.now() + 86400000 * 5).toISOString(),
    mintAddress: 'M1ntAddr3ss666666666666666666666666666666666',
    txSignature: 'tx6666666666666666666666666666666666666666666666666666666666666666',
    royaltyBasisPoints: 1000,
    platformFeeBasisPoints: 150,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
]

export const mockAdminStats: AdminStats = {
  totalCollections: 6,
  activeCollections: 2,
  totalMinted: 5150,
  uniqueCreators: 5,
  featuredCount: 2,
  newLast7Days: 3,
}

export const mockCreators: Creator[] = [
  {
    creatorAddress: 'So1anaWa11etAddress1111111111111111111111111',
    displayName: 'CryptoCreator',
    collectionCount: 1,
    totalMinted: 1450,
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    creatorAddress: 'So1anaWa11etAddress4444444444444444444444444',
    displayName: 'SolanaDevs',
    collectionCount: 1,
    totalMinted: 3200,
    lastActivityAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    creatorAddress: 'So1anaWa11etAddress2222222222222222222222222',
    displayName: 'PixelLab',
    collectionCount: 1,
    totalMinted: 500,
    lastActivityAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    creatorAddress: 'So1anaWa11etAddress3333333333333333333333333',
    displayName: 'DragonForge / MechStudio',
    collectionCount: 2,
    totalMinted: 0,
    lastActivityAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    creatorAddress: 'So1anaWa11etAddress5555555555555555555555555',
    displayName: 'CosmoKitty',
    collectionCount: 1,
    totalMinted: 0,
    lastActivityAt: new Date(Date.now() - 3600000).toISOString(),
  },
]

export const mockActivity: ActivityLog[] = [
  {
    id: '1',
    action: 'collection.deployed',
    resource: 'Cosmic Apes',
    details: 'Collection deployed to Solana mainnet',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '2',
    action: 'admin.featured',
    resource: 'Cosmic Apes',
    details: 'Collection marked as featured',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: '3',
    action: 'sync.completed',
    resource: 'platform',
    details: 'Blockchain sync completed — 6 collections updated',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    action: 'admin.pause',
    resource: 'Robot Squad',
    details: 'Collection paused by admin',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '5',
    action: 'collection.completed',
    resource: 'Pixel Pandas',
    details: 'All 500 NFTs minted — collection completed',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

export function mockPaginatedCollections(
  page: number,
  pageSize: number,
  search?: string,
  status?: string,
  featured?: boolean
): PaginatedResponse<Collection> {
  let data = [...mockCollections]
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(
      (c) => c.name.toLowerCase().includes(q) || c.creator.toLowerCase().includes(q)
    )
  }
  if (status && status !== 'all') {
    data = data.filter((c) => c.effectiveStatus === status)
  }
  if (featured) {
    data = data.filter((c) => c.featured)
  }
  const total = data.length
  const start = (page - 1) * pageSize
  return {
    data: data.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

export function mockActivityList(
  _page: number,
  _pageSize: number
): PaginatedResponse<ActivityLog> {
  return {
    data: mockActivity,
    total: mockActivity.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }
}
