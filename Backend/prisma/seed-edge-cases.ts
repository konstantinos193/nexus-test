/**
 * Edge Cases Seed Script - Drop Page Testing
 * Testing mint phases, stats, prices, times, and all drop page functionality
 * 
 * Run with: npx ts-node prisma/seed-edge-cases.ts
 * Or: npm run seed:edge-cases
 */

import { PrismaClient } from '@prisma/client';
import { generateSlug } from '../src/utils/slug.util';

const prisma = new PrismaClient();

// Helper to generate Solana addresses (44 chars, base58-like)
function generateSolanaAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

// Helper to generate dates
const now = new Date();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * 60 * 60 * 1000;
const oneWeek = 7 * oneDay;

// Helper to generate placehold.co URLs
// Profile picture (PFP) - square image
function getProfileImage(text: string, bgColor: string = '1a1a24', textColor: string = '00d4ff'): string {
  const encodedText = encodeURIComponent(text.substring(0, 20));
  return `https://placehold.co/400x400/${bgColor}/${textColor}?text=${encodedText}&font=roboto`;
}

// Banner image - wide format
function getBannerImage(text: string, bgColor: string = '111118', textColor: string = 'ffffff'): string {
  const encodedText = encodeURIComponent(text.substring(0, 30));
  return `https://placehold.co/1200x400/${bgColor}/${textColor}?text=${encodedText}&font=roboto`;
}

// Color palettes for variety
const colorPalettes = [
  { bg: '1a1a24', text: '00d4ff', bannerBg: '111118' }, // Cyan
  { bg: '1a0a1a', text: '7c3aed', bannerBg: '0f0514' }, // Purple
  { bg: '1a1a0a', text: 'f59e0b', bannerBg: '0f0f05' }, // Orange
  { bg: '0a1a1a', text: '10b981', bannerBg: '051414' }, // Green
  { bg: '1a0a0a', text: 'ef4444', bannerBg: '0f0505' }, // Red
  { bg: '1a1a1a', text: 'fbbf24', bannerBg: '0f0f0f' }, // Yellow
  { bg: '0a0a1a', text: '3b82f6', bannerBg: '05050f' }, // Blue
  { bg: '1a0a14', text: 'ec4899', bannerBg: '0f050a' }, // Pink
];

function getColorPalette(index: number) {
  return colorPalettes[index % colorPalettes.length];
}

/**
 * Edge case collections - focused on drop page testing
 * Testing: mint phases, stats, prices, times, smart contract info
 */
const edgeCaseCollectionsRaw = [
  // ============================================
  // MINT PHASE EDGE CASES
  // ============================================
  
  {
    name: 'Upcoming - Both Phases Inactive',
    description: 'Mint starts in 3 days. Both Whitelist and Public phases should show as upcoming.',
    creator: 'Upcoming Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 0,
    price: 0.08,
    status: 'preparing' as const,
    featured: true,
    // mintStart will be calculated: 3 days from now
    endDate: new Date(now.getTime() + 10 * oneDay),
  },
  
  {
    name: 'Live - Whitelist Active Public Upcoming',
    description: 'Whitelist is active now, public starts tomorrow. Should show both phases with different states.',
    creator: 'Whitelist Active Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 8000,
    minted: 800, // Some whitelist mints
    price: 0.1,
    status: 'minting' as const,
    featured: true,
    // mintStart: tomorrow (public starts)
    // Whitelist would have started 2 days before (yesterday)
  },
  
  {
    name: 'Live - Both Phases Active',
    description: 'Both Whitelist and Public are active simultaneously. Should show both as active.',
    creator: 'Both Active Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 1500,
    price: 0.06,
    status: 'minting' as const,
    featured: true,
    // Both phases overlap
  },
  
  {
    name: 'Live - Whitelist Ended Public Active',
    description: 'Whitelist phase ended, only public is active. Should show whitelist as ended, public as active.',
    creator: 'Whitelist Ended Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 3500, // More than whitelist supply (2000), so public has minted
    price: 0.08,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Ended - All Phases Completed',
    description: 'All phases completed. Should show both phases as ended with 100% progress.',
    creator: 'Ended Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 5000,
    price: 0.12,
    status: 'completed' as const,
    featured: true,
  },

  // ============================================
  // STATS EDGE CASES (Supply/Minted Combinations)
  // ============================================
  
  {
    name: 'Stats - 0% Minted',
    description: 'Just started. Should show 0% progress, empty progress bar.',
    creator: 'Zero Minted Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 0,
    price: 0.05,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Stats - 1% Minted',
    description: 'Very early stage. Should show minimal progress (1%).',
    creator: 'One Percent Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 100,
    price: 0.06,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Stats - 50% Minted',
    description: 'Halfway point. Should show 50% progress clearly.',
    creator: 'Halfway Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 8000,
    minted: 4000,
    price: 0.07,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Stats - 99% Minted',
    description: 'Almost sold out. Should show 99% and create urgency.',
    creator: 'Almost Done Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 9900,
    price: 0.08,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Stats - Large Supply 100k',
    description: 'Very large collection. Should format numbers with commas correctly.',
    creator: 'Large Supply Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 100000,
    minted: 45678,
    price: 0.05,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Stats - Small Supply 100',
    description: 'Very small collection. Should handle small numbers correctly.',
    creator: 'Small Supply Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 100,
    minted: 45,
    price: 0.5,
    status: 'minting' as const,
    featured: false,
  },

  // ============================================
  // PRICE EDGE CASES
  // ============================================
  
  {
    name: 'Price - Free Mint',
    description: 'Free mint. Should show "Free" with no SOL icon.',
    creator: 'Free Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 5678,
    price: 0,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Price - Very Low 0.01 SOL',
    description: 'Very low price. Should show 2 decimals: 0.01 SOL.',
    creator: 'Low Price Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 1234,
    price: 0.01,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Price - Decimal 0.69 SOL',
    description: 'Common price point. Should format correctly with 2 decimals.',
    creator: 'Decimal Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 3420,
    price: 0.69,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Price - Whole Number 1 SOL',
    description: 'Whole number price. Should show as 1.0 or 1 SOL.',
    creator: 'Whole Price Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 2345,
    price: 1,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Price - High 10 SOL',
    description: 'High price. Should format correctly.',
    creator: 'High Price Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 1000,
    minted: 123,
    price: 10,
    status: 'minting' as const,
    featured: true,
  },
  
  {
    name: 'Price - Null Price',
    description: 'No price set. Should handle gracefully.',
    creator: 'Null Price Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 0,
    price: null,
    status: 'preparing' as const,
    featured: false,
  },

  // ============================================
  // TIME EDGE CASES (mintStart/endDate combinations)
  // ============================================
  
  {
    name: 'Time - Starts in 1 Hour',
    description: 'Mint starts very soon. Should show hour countdown.',
    creator: 'Soon Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 0,
    price: 0.08,
    status: 'ready' as const,
    featured: true,
    // Will set mintStart to 1 hour from now
  },
  
  {
    name: 'Time - Starts Tomorrow',
    description: 'Mint starts tomorrow. Should show day countdown.',
    creator: 'Tomorrow Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 8000,
    minted: 0,
    price: 0.06,
    status: 'ready' as const,
    featured: true,
    // Will set mintStart to tomorrow
  },
  
  {
    name: 'Time - Starts in 1 Week',
    description: 'Mint starts in a week. Should show week countdown.',
    creator: 'Week Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 0,
    price: 0.08,
    status: 'preparing' as const,
    featured: false,
    // Will set mintStart to 1 week from now
  },
  
  {
    name: 'Time - Ends in 1 Hour',
    description: 'Mint ends very soon. Should show urgency and hour countdown.',
    creator: 'Ending Soon Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 2345,
    price: 0.07,
    status: 'minting' as const,
    featured: true,
    endDate: new Date(now.getTime() + oneHour),
  },
  
  {
    name: 'Time - Ends Tomorrow',
    description: 'Mint ends tomorrow. Should show day countdown.',
    creator: 'Ending Tomorrow Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 8000,
    minted: 4567,
    price: 0.09,
    status: 'minting' as const,
    featured: true,
    endDate: new Date(now.getTime() + oneDay),
  },
  
  {
    name: 'Time - No End Date',
    description: 'Open mint with no end date. Should handle null gracefully.',
    creator: 'No End Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 1234,
    price: 0.05,
    status: 'minting' as const,
    featured: false,
    endDate: null,
  },
  
  {
    name: 'Time - Long Duration 30 Days',
    description: 'Mint runs for 30 days. Should show long duration.',
    creator: 'Long Duration Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 567,
    price: 0.06,
    status: 'minting' as const,
    featured: false,
    endDate: new Date(now.getTime() + 30 * oneDay),
  },

  // ============================================
  // STATUS EDGE CASES
  // ============================================
  
  {
    name: 'Status - Paused Mint',
    description: 'Minting is paused. Should show paused badge and disable mint.',
    creator: 'Paused Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 1234,
    price: 0.1,
    status: 'paused' as const,
    featured: false,
  },
  
  {
    name: 'Status - Draft Hidden',
    description: 'Draft status. Should not appear in public listings.',
    creator: 'Draft Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 0,
    price: 0.05,
    status: 'draft' as const,
    featured: false,
  },
  
  {
    name: 'Status - Sold Out',
    description: 'All NFTs minted. Should show sold out state.',
    creator: 'Sold Out Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 5000,
    minted: 5000,
    price: 0.12,
    status: 'completed' as const,
    featured: true,
  },

  // ============================================
  // MAX PER WALLET EDGE CASES (affects phases)
  // ============================================
  // Note: maxPerWallet is hardcoded to 10 in frontend
  // But we can test with different supply ratios
  
  {
    name: 'Max Wallet - Single Mint',
    description: 'Collection where max per wallet would be 1. Tests phase generation with limit 1.',
    creator: 'Single Mint Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 100, // Small supply = likely 1 per wallet
    minted: 45,
    price: 0.5,
    status: 'minting' as const,
    featured: false,
  },
  
  {
    name: 'Max Wallet - High Limit',
    description: 'Collection with high max per wallet. Tests phase generation.',
    creator: 'High Limit Creator',
    creatorAddress: generateSolanaAddress(),
    blockchain: 'solana' as const,
    totalSupply: 10000,
    minted: 2345,
    price: 0.08,
    status: 'minting' as const,
    featured: false,
  },
];

// Process collections to add images and calculate mintStart dates
const processedCollections = edgeCaseCollectionsRaw.map((collection, index) => {
  const palette = getColorPalette(index);
  
  // Calculate mintStart based on collection name patterns and status
  // This ensures proper phase generation on the drop page
  let mintStart: Date | null = null;
  
  // Time-based collections (explicit time scenarios)
  if (collection.name.includes('Starts in 1 Hour')) {
    mintStart = new Date(now.getTime() + oneHour);
  } else if (collection.name.includes('Starts Tomorrow')) {
    mintStart = new Date(now.getTime() + oneDay);
  } else if (collection.name.includes('Starts in 1 Week')) {
    mintStart = new Date(now.getTime() + oneWeek);
  }
  // Phase-based collections (mint phase scenarios)
  else if (collection.name.includes('Both Phases Inactive')) {
    // Upcoming: mint starts in 3 days
    mintStart = new Date(now.getTime() + 3 * oneDay);
  } else if (collection.name.includes('Whitelist Active')) {
    // Whitelist active now, public starts tomorrow
    // So mintStart (public) is tomorrow
    mintStart = new Date(now.getTime() + oneDay);
  } else if (collection.name.includes('Both Active')) {
    // Both phases active, public started 1 day ago
    mintStart = new Date(now.getTime() - oneDay);
  } else if (collection.name.includes('Whitelist Ended')) {
    // Whitelist ended, public started 3 days ago
    mintStart = new Date(now.getTime() - 3 * oneDay);
  } else if (collection.name.includes('All Phases Completed')) {
    // All ended, started 14 days ago
    mintStart = new Date(now.getTime() - 14 * oneDay);
  }
  // Status-based defaults
  else if (collection.status === 'minting') {
    // Live mints: started in the past (2 days ago by default)
    mintStart = new Date(now.getTime() - 2 * oneDay);
  } else if (collection.status === 'preparing' || collection.status === 'ready') {
    // Upcoming: starts in the future (1 week by default)
    mintStart = new Date(now.getTime() + oneWeek);
  } else if (collection.status === 'completed') {
    // Ended: started in the past (14 days ago)
    mintStart = new Date(now.getTime() - 14 * oneDay);
  }
  // Draft and paused don't need mintStart (they're not minting)
  // But we can still set it for testing
  else if (collection.status === 'paused') {
    // Paused: started 5 days ago, paused 1 day ago
    mintStart = new Date(now.getTime() - 5 * oneDay);
  }
  // Draft collections don't need mintStart (not public)
  
  return {
    ...collection,
    _mintStart: mintStart ? mintStart.toISOString() : null,
  };
});

async function main() {
  console.log('🌱 Starting drop page edge cases seed...');
  console.log('Testing: mint phases, stats, prices, times, and all drop page functionality');

  // Delete all existing collections first
  console.log('🗑️  Deleting existing collections...');
  const deleteCount = await prisma.collection.deleteMany({});
  console.log(`✅ Deleted ${deleteCount.count} existing collections`);

  // Get existing slugs to avoid duplicates
  const existingSlugs = new Set<string>();

  // Generate unique slugs and add images
  const collectionsToCreate = processedCollections.map((collection, index) => {
    const baseSlug = generateSlug(collection.name);
    let slug = baseSlug;
    let counter = 2;

    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    existingSlugs.add(slug);

    const palette = getColorPalette(index);
    
    // Generate profile image (PFP) - square 400x400
    const profileImage = getProfileImage(
      collection.name,
      palette.bg,
      palette.text
    );
    
    // Generate banner image - wide 1200x400
    const bannerImage = getBannerImage(
      collection.name,
      palette.bannerBg,
      palette.text
    );

    // Get the calculated mintStart from processed collection
    const calculatedMintStart = (collection as any)._mintStart 
      ? new Date((collection as any)._mintStart) 
      : null;

    return {
      name: collection.name,
      description: collection.description,
      imageUrl: profileImage,
      bannerUrl: bannerImage,
      creator: collection.creator,
      creatorAddress: collection.creatorAddress,
      blockchain: collection.blockchain,
      totalSupply: collection.totalSupply,
      minted: collection.minted,
      price: collection.price,
      status: collection.status,
      featured: collection.featured ?? false,
      mintStart: calculatedMintStart,
      endDate: collection.endDate ?? null,
      slug,
      traits: null,
    };
  });

  console.log(`📦 Creating ${collectionsToCreate.length} drop page test collections...`);

  for (const collection of collectionsToCreate) {
    try {
      await prisma.collection.create({
        data: collection,
      });
      console.log(`✅ Created: ${collection.name} (${collection.slug})`);
    } catch (error) {
      console.error(`❌ Error creating ${collection.name}:`, error);
    }
  }

  console.log('🎉 Drop page edge cases seed completed!');
  console.log(`📊 Total collections: ${collectionsToCreate.length}`);
  console.log('💡 Collections test: mint phases, stats, prices, times, and all drop page features');
  console.log('✅ All collections include mintStart dates for proper phase calculation');
}

main()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
