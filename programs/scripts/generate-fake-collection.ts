/**
 * Generate a massive fake NFT collection with placeholder images and metadata
 * Perfect for testing IPFS uploads and reallyPlacehold integration
 * 
 * Usage: npx ts-node scripts/generate-fake-collection.ts [supply] [outputDir]
 * Example: npx ts-node scripts/generate-fake-collection.ts 10000 ./fake-collection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Configuration - adjust these to your heart's content
const DEFAULT_SUPPLY = 1500; // 1.5k NFTs
const DEFAULT_OUTPUT_DIR = './fake-collection';
const IMAGE_SIZE = 500; // 500x500px images
const IMAGE_FORMAT = 'png'; // PNG format for better quality

// Trait pools for generating varied metadata
const BACKGROUND_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
  '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
  '#34495E', '#E67E22', '#16A085', '#27AE60', '#2980B9'
];

const TRAIT_TYPES = [
  'Background',
  'Body',
  'Eyes',
  'Mouth',
  'Accessory',
  'Hat',
  'Rarity',
  'Power Level'
];

const TRAIT_VALUES: Record<string, string[]> = {
  'Background': ['Cosmic', 'Neon', 'Void', 'Galaxy', 'Matrix', 'Cyber', 'Neon City', 'Space'],
  'Body': ['Human', 'Robot', 'Alien', 'Cyborg', 'Ghost', 'Demon', 'Angel', 'Hybrid'],
  'Eyes': ['Laser', 'Glowing', 'Normal', 'Cybernetic', 'Third Eye', 'X-Ray', 'Holographic', 'Fire'],
  'Mouth': ['Smile', 'Grin', 'Frown', 'Neutral', 'Fangs', 'Metal', 'Energy', 'None'],
  'Accessory': ['Sword', 'Shield', 'Gun', 'Staff', 'None', 'Crown', 'Wings', 'Aura'],
  'Hat': ['Cap', 'Helmet', 'Crown', 'Halo', 'None', 'Mask', 'Visor', 'Antenna'],
  'Rarity': ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ultra Rare'],
  'Power Level': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
};

// Rarity weights for more realistic distribution
const RARITY_WEIGHTS: Record<string, number> = {
  'Common': 40,
  'Uncommon': 25,
  'Rare': 15,
  'Epic': 10,
  'Legendary': 5,
  'Mythic': 3,
  'Ultra Rare': 2
};

/**
 * Select a random item from an array based on weights
 * Because randomness without weights is just chaos
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1]; // Fallback (shouldn't happen)
}

/**
 * Generate a random trait value for a given trait type
 * Adds some spice to the collection
 */
function generateTraitValue(traitType: string): string {
  const values = TRAIT_VALUES[traitType] || ['Unknown'];
  return values[Math.floor(Math.random() * values.length)];
}

/**
 * Generate attributes for an NFT
 * Creates a unique combination of traits
 * Made deterministic to ensure consistent structure across all tokens
 */
function generateAttributes(tokenId: number): Array<{ trait_type: string; value: string }> {
  const attributes: Array<{ trait_type: string; value: string }> = [];
  
  // Use tokenId as seed for deterministic generation
  // This ensures the same tokenId always gets the same attributes
  let seed = tokenId;
  
  // Simple seeded random function - because we need determinism, not chaos
  function seededRandom(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  // Always include rarity (weighted, but deterministic based on tokenId)
  const rarityValues = Object.keys(RARITY_WEIGHTS);
  const rarityWeights = rarityValues.map(r => RARITY_WEIGHTS[r]);
  const totalWeight = rarityWeights.reduce((sum, w) => sum + w, 0);
  let random = seededRandom() * totalWeight;
  let rarity = rarityValues[rarityValues.length - 1]; // Fallback
  for (let i = 0; i < rarityValues.length; i++) {
    random -= rarityWeights[i];
    if (random <= 0) {
      rarity = rarityValues[i];
      break;
    }
  }
  attributes.push({ trait_type: 'Rarity', value: rarity });
  
  // Generate other traits - FIXED NUMBER for consistency (4 traits total including Rarity)
  // All tokens will have: Rarity + 3 other traits = 4 attributes total
  const traitTypesToUse = TRAIT_TYPES.filter(t => t !== 'Rarity');
  const numTraits = 3; // Fixed to 3 additional traits (plus Rarity = 4 total)
  
  const selectedTraits: string[] = [];
  const availableTraits = [...traitTypesToUse];
  
  // Deterministically select traits based on tokenId
  while (selectedTraits.length < numTraits && availableTraits.length > 0) {
    const index = Math.floor(seededRandom() * availableTraits.length);
    selectedTraits.push(availableTraits[index]);
    availableTraits.splice(index, 1); // Remove to avoid duplicates
  }
  
  selectedTraits.forEach(traitType => {
    // Deterministic trait value selection
    const values = TRAIT_VALUES[traitType] || ['Unknown'];
    const valueIndex = Math.floor(seededRandom() * values.length);
    attributes.push({
      trait_type: traitType,
      value: values[valueIndex]
    });
  });
  
  return attributes;
}

/**
 * Generate a placeholder image URL using placehold.co
 * Because we need images, and placehold.co is our savior
 */
function generateImageUrl(tokenId: number): string {
  // Use different colors for variety
  const bgColor = BACKGROUND_COLORS[tokenId % BACKGROUND_COLORS.length];
  const textColor = '#FFFFFF';
  
  // Create a unique image per token
  const seed = tokenId % 1000; // Cycle through 1000 variations
  const text = `NFT #${tokenId}`;
  
  // Use placehold.co with custom text
  return `https://placehold.co/${IMAGE_SIZE}x${IMAGE_SIZE}/${bgColor.replace('#', '')}/${textColor.replace('#', '')}/${IMAGE_FORMAT}?text=${encodeURIComponent(text)}`;
}

/**
 * Download an image from a URL and save it to a file
 * Because we need actual files, not just URLs
 */
function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        if (response.headers.location) {
          return downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath); // Delete the file on error
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

/**
 * Generate metadata for a single NFT
 * Following Metaplex Token Metadata standard
 */
function generateMetadata(tokenId: number, collectionName: string, collectionSymbol: string): any {
  const attributes = generateAttributes(tokenId);
  const imageUrl = generateImageUrl(tokenId);
  
  return {
    name: `${collectionName} #${tokenId}`,
    symbol: collectionSymbol,
    description: `A unique ${collectionName} NFT. Token ID: ${tokenId}. This is a test collection for IPFS uploads.`,
    image: imageUrl,
    external_url: `https://nexus-launchpad.com/collection/${collectionName.toLowerCase().replace(/\s+/g, '-')}/${tokenId}`,
    attributes: attributes,
    properties: {
      files: [
        {
          uri: imageUrl,
          type: `image/${IMAGE_FORMAT}`
        }
      ],
      category: 'image',
      creators: [
        {
          address: '11111111111111111111111111111111', // Placeholder Solana address
          share: 100
        }
      ]
    },
    seller_fee_basis_points: 500, // 5% royalty
  };
}

/**
 * Main function to generate the collection
 * The real workhorse of this script
 */
async function generateCollection(supply: number, outputDir: string) {
  console.log(`🚀 Generating ${supply} fake NFTs...`);
  console.log(`📁 Output directory: ${outputDir}`);
  
  // Create output directories
  const metadataDir = path.join(outputDir, 'metadata');
  const imagesDir = path.join(outputDir, 'images');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  const collectionName = 'Fake Test Collection';
  const collectionSymbol = 'FAKE';
  
  // Generate collection-level metadata
  const collectionMetadata = {
    name: collectionName,
    symbol: collectionSymbol,
    description: `A massive test collection with ${supply} NFTs for IPFS testing. Generated by generate-fake-collection.ts`,
    image: generateImageUrl(0), // Collection image
    external_url: 'https://nexus-launchpad.com',
    seller_fee_basis_points: 500,
    properties: {
      files: [
        {
          uri: generateImageUrl(0),
          type: `image/${IMAGE_FORMAT}`
        }
      ],
      category: 'image',
      creators: [
        {
          address: '11111111111111111111111111111111',
          share: 100
        }
      ]
    }
  };
  
  // Save collection metadata
  fs.writeFileSync(
    path.join(outputDir, 'collection.json'),
    JSON.stringify(collectionMetadata, null, 2)
  );
  
  console.log('📝 Generating individual NFT metadata and downloading images...');
  
  // Generate metadata for each NFT and download images
  const batchSize = 10; // Smaller batches for downloads to avoid overwhelming the server
  let processed = 0;
  
  for (let i = 0; i < supply; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, supply);
    const batchPromises: Promise<void>[] = [];
    
    for (let tokenId = i; tokenId < batchEnd; tokenId++) {
      const metadata = generateMetadata(tokenId, collectionName, collectionSymbol);
      
      // Save metadata file
      const metadataPath = path.join(metadataDir, `${tokenId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      // Download image
      const imagePath = path.join(imagesDir, `${tokenId}.${IMAGE_FORMAT}`);
      batchPromises.push(
        downloadImage(metadata.image, imagePath).catch(err => {
          console.error(`\n⚠️  Failed to download image for token ${tokenId}: ${err.message}`);
        })
      );
    }
    
    // Wait for all downloads in this batch to complete
    await Promise.all(batchPromises);
    
    processed = batchEnd;
    const progress = ((processed / supply) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${processed}/${supply} (${progress}%) - Metadata & Images`);
  }
  
  console.log('\n✅ Collection generation complete!');
  
  // Create a manifest file for easy reference
  const manifest = {
    collection: collectionName,
    symbol: collectionSymbol,
    supply: supply,
    imageFormat: IMAGE_FORMAT,
    imageSize: `${IMAGE_SIZE}x${IMAGE_SIZE}`,
    metadataFormat: 'Metaplex Token Metadata Standard',
    generatedAt: new Date().toISOString(),
    metadataDirectory: 'metadata',
    imagesDirectory: 'images',
    note: 'Images have been downloaded and are ready for IPFS upload.'
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Create a download script for images (optional)
  const colorsStr = BACKGROUND_COLORS.map(c => c.replace('#', '')).join(' ');
  const colorsArrayStr = BACKGROUND_COLORS.map(c => `"${c.replace('#', '')}"`).join(', ');
  
  const downloadScript = `#!/bin/bash
# Download all images from placehold.co
# This script downloads images for IPFS upload

SUPPLY=${supply}
IMAGE_SIZE=${IMAGE_SIZE}
FORMAT=${IMAGE_FORMAT}
COLORS=(${colorsStr})

echo "Downloading ${supply} images..."

for i in $(seq 0 $((SUPPLY - 1))); do
  COLOR_INDEX=$((i % ${BACKGROUND_COLORS.length}))
  BG_COLOR=\${COLORS[$COLOR_INDEX]}
  TEXT_COLOR="FFFFFF"
  TEXT="NFT%20%23$i"
  
  URL="https://placehold.co/${IMAGE_SIZE}x${IMAGE_SIZE}/\${BG_COLOR}/\${TEXT_COLOR}/${IMAGE_FORMAT}?text=\${TEXT}"
  
  curl -o "images/$i.${IMAGE_FORMAT}" "\${URL}"
  
  if [ $((i % 100)) -eq 0 ]; then
    echo "Downloaded $i/${supply} images..."
  fi
done

echo "✅ All images downloaded!"
`;
  
  fs.writeFileSync(
    path.join(outputDir, 'download-images.sh'),
    downloadScript
  );
  
  // Also create a PowerShell version for Windows
  const downloadScriptPs = `# Download all images from placehold.co (PowerShell)
# This script downloads images for IPFS upload

$SUPPLY = ${supply}
$IMAGE_SIZE = ${IMAGE_SIZE}
$FORMAT = "${IMAGE_FORMAT}"
$COLORS = @(${colorsArrayStr})

Write-Host "Downloading $SUPPLY images..."

for ($i = 0; $i -lt $SUPPLY; $i++) {
    $colorIndex = $i % $COLORS.Length
    $bgColor = $COLORS[$colorIndex]
    $textColor = "FFFFFF"
    $text = "NFT%20%23$i"
    
    $url = "https://placehold.co/${IMAGE_SIZE}x${IMAGE_SIZE}/$bgColor/$textColor/$FORMAT\`?text=$text"
    $outputPath = "images\\$i.$FORMAT"
    
    Invoke-WebRequest -Uri $url -OutFile $outputPath
    
    if ($i % 100 -eq 0) {
        Write-Host "Downloaded $i/$SUPPLY images..."
    }
}

Write-Host "✅ All images downloaded!"
`;
  
  fs.writeFileSync(
    path.join(outputDir, 'download-images.ps1'),
    downloadScriptPs
  );
  
  console.log('\n📊 Summary:');
  console.log(`   Collection: ${collectionName}`);
  console.log(`   Symbol: ${collectionSymbol}`);
  console.log(`   Supply: ${supply}`);
  console.log(`   Metadata files: ${metadataDir}`);
  console.log(`   Image files: ${imagesDir}`);
  console.log(`   Image format: ${IMAGE_FORMAT} (${IMAGE_SIZE}x${IMAGE_SIZE})`);
  console.log(`   Images: Downloaded and ready for IPFS upload`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the metadata files in ${metadataDir}`);
  console.log(`   2. Review the image files in ${imagesDir}`);
  console.log(`   3. Upload to IPFS using your preferred method`);
  console.log(`   4. Update metadata files with IPFS URLs if needed`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const supply = args[0] ? parseInt(args[0], 10) : DEFAULT_SUPPLY;
const outputDir = args[1] || DEFAULT_OUTPUT_DIR;

if (isNaN(supply) || supply <= 0) {
  console.error('❌ Invalid supply. Please provide a positive number.');
  process.exit(1);
}

// Run the generator
generateCollection(supply, outputDir).catch(error => {
  console.error('❌ Error generating collection:', error);
  process.exit(1);
});
