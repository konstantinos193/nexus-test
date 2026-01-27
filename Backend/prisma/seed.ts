/**
 * Database seed script - Populates the database with mock collections
 * Because empty databases are sadder than a birthday party with no guests
 * 
 * Run with: npx ts-node prisma/seed.ts
 * Or: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../src/utils/slug.util';

const prisma = new PrismaClient();

/**
 * Mock collections data - because we need something to show off
 * These are the same collections from Frontend/lib/data/collections.ts
 */
const mockCollections = [
  {
    name: 'Collection 1',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 1',
    creatorAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 8421,
    price: 0.08,
    status: 'minting',
  },
  {
    name: 'Collection 2',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 2',
    creatorAddress: '0x0987654321098765432109876543210987654321',
    blockchain: 'solana',
    totalSupply: 5000,
    minted: 5000,
    price: 0.12,
    status: 'completed',
  },
  {
    name: 'Collection 3',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 3',
    creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 2341,
    price: 0.05,
    status: 'minting',
  },
  {
    name: 'Collection 4',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 4',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    blockchain: 'solana',
    totalSupply: 8000,
    minted: 6123,
    price: 0.1,
    status: 'minting',
  },
  {
    name: 'Collection 5',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 5',
    creatorAddress: '0x2222222222222222222222222222222222222222',
    blockchain: 'solana',
    totalSupply: 6000,
    minted: 4456,
    price: 0.15,
    status: 'minting',
  },
  {
    name: 'Collection 6',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 6',
    creatorAddress: '0x3333333333333333333333333333333333333333',
    blockchain: 'solana',
    totalSupply: 12000,
    minted: 1234,
    price: 0.03,
    status: 'minting',
  },
  {
    name: 'Collection 7',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 7',
    creatorAddress: '0x4444444444444444444444444444444444444444',
    blockchain: 'solana',
    totalSupply: 9000,
    minted: 7890,
    price: 0.09,
    status: 'minting',
  },
  {
    name: 'Collection 8',
    description: 'Lorem ipsum dolor sit amet.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Creator 8',
    creatorAddress: '0x5555555555555555555555555555555555555555',
    blockchain: 'solana',
    totalSupply: 7000,
    minted: 5678,
    price: 0.07,
    status: 'minting',
  },
];

/**
 * Featured collections - because some collections are more equal than others
 */
const featuredCollections = [
  {
    name: 'Placeholder Collection #1',
    description: 'Lorem ipsum dolor sit amet. Placeholder description for demo purposes only. Replace with real collection copy.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Placeholder Creator',
    creatorAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 3421,
    price: 0.08,
    status: 'minting',
    featured: true,
  },
  {
    name: 'Placeholder Collection #2',
    description: 'Consectetur adipiscing elit. Sample text for featured drop. Update before launch.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Placeholder Creator',
    creatorAddress: '0x0987654321098765432109876543210987654321',
    blockchain: 'solana',
    totalSupply: 5000,
    minted: 5000,
    status: 'completed',
    featured: true,
  },
  {
    name: 'Placeholder Collection #3',
    description: 'Sed do eiusmod tempor incididunt. [Your collection description here].',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Placeholder Creator',
    creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    blockchain: 'solana',
    totalSupply: 10000,
    minted: 0,
    status: 'ready',
    featured: true,
  },
  {
    name: 'Placeholder Collection #4',
    description: 'Ut labore et dolore magna. Demo content—swap for actual copy.',
    imageUrl: '/NeXus_Web3_Logo.png',
    bannerUrl: '/NeXus_Web3_Logo.png',
    creator: 'Placeholder Creator',
    creatorAddress: '0x1111111111111111111111111111111111111111',
    blockchain: 'solana',
    totalSupply: 8000,
    minted: 2500,
    price: 0.05,
    status: 'minting',
    featured: true,
  },
];

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('Because empty databases are sadder than a birthday party with no guests');

  // Get existing slugs to avoid duplicates
  const existingCollections = await prisma.collection.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existingCollections.map((c) => c.slug));

  // Generate unique slugs for all collections
  const allCollections = [
    ...mockCollections.map((c) => ({ ...c, featured: false })),
    ...featuredCollections,
  ];

  const collectionsToCreate = allCollections.map((collection) => {
    const baseSlug = generateSlug(collection.name);
    let slug = baseSlug;
    let counter = 2;

    // Make slug unique
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    return {
      ...collection,
      slug,
      featured: collection.featured ?? false,
    };
  });

  // Insert collections into database
  // Using createMany with skipDuplicates to avoid errors if run multiple times
  console.log(`📦 Creating ${collectionsToCreate.length} collections...`);

  for (const collection of collectionsToCreate) {
    try {
      await prisma.collection.upsert({
        where: { slug: collection.slug },
        update: {
          name: collection.name,
          description: collection.description,
          imageUrl: collection.imageUrl,
          bannerUrl: collection.bannerUrl,
          creator: collection.creator,
          creatorAddress: collection.creatorAddress,
          blockchain: collection.blockchain,
          totalSupply: collection.totalSupply,
          minted: collection.minted,
          price: collection.price,
          status: collection.status,
          featured: collection.featured,
        },
        create: collection,
      });
      console.log(`✅ Created/Updated: ${collection.name} (${collection.slug})`);
    } catch (error) {
      console.error(`❌ Error creating ${collection.name}:`, error);
    }
  }

  console.log('🎉 Seed completed! Your database is now populated with mock collections.');
  console.log('Because nothing says "we\'re ready" like having data to show off');
}

main()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
