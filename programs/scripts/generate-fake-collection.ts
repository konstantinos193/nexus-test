/**
 * Generate a massive fake NFT collection with placeholder images and metadata.
 * Perfect for testing IPFS uploads and reallyPlacehold integration.
 *
 * Because nothing says "we're production ready" like 1,500 placeholder images
 * of colorful rectangles with "NFT #42" printed on them. Investors love this.
 *
 * Usage: npx ts-node scripts/generate-fake-collection.ts [supply] [outputDir]
 * Example: npx ts-node scripts/generate-fake-collection.ts 10000 ./fake-collection
 *
 * (If you're running this with 10,000 as your supply number, I respect your chaos.)
 */

// fs — the blessed module that lets us pretend the filesystem is our friend.
// (It is not. The filesystem has seen things.)
import * as fs from 'fs';

// path — for joining directory segments without crying about OS-level slashes.
// Windows users know what I'm talking about. You know.
import * as path from 'path';

// https — because we're downloading images from a placeholder service
// like civilized people, not just hardcoding base64 strings. (Progress.)
import * as https from 'https';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Adjust these to your heart's content. Or your product manager's content.
// (Same thing, apparently.)

/** Default collection size. 1,500 NFTs. The sweet spot between "test data"
 *  and "why does my laptop sound like a jet engine." */
const DEFAULT_SUPPLY = 1500;

/** Where the fake art goes to live and eventually be forgotten.
 *  Like most side projects. */
const DEFAULT_OUTPUT_DIR = './fake-collection';

/** 500x500 pixels. Large enough to look intentional. Small enough to upload
 *  without triggering your ISP's fair-use policy. */
const IMAGE_SIZE = 500;

/** PNG format — because we have *standards*. And JPEG artifacts are a crime. */
const IMAGE_FORMAT = 'png';

// ─── TRAIT POOLS ──────────────────────────────────────────────────────────────
// The raw materials of fake rarity. Gaze upon the illusion of uniqueness.

/**
 * Twenty hex colors carefully chosen to look "diverse" in a Discord announcement.
 * Half of them are shades of blue. Nobody will notice.
 */
const BACKGROUND_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
  '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
  '#34495E', '#E67E22', '#16A085', '#27AE60', '#2980B9'
];

/**
 * The eight noble trait types of this collection.
 * "Power Level" is doing a lot of heavy lifting here, lore-wise.
 */
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

/**
 * The trait value lookup table. The entire fiction of this NFT collection
 * lives in this object. "Void" background, "Ghost" body, "Third Eye" eyes —
 * practically writes its own whitepaper.
 */
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

/**
 * Rarity weights. The math that makes "Common" feel bad and "Ultra Rare"
 * feel like a spiritual achievement. (It's 2%. You won't get it.)
 */
const RARITY_WEIGHTS: Record<string, number> = {
  'Common': 40,      // The masses. The normies. The floor-price bagholders.
  'Uncommon': 25,    // "I got Uncommon" — the noble lie.
  'Rare': 15,        // Now we're talking. Discord pfp material.
  'Epic': 10,        // You're special. Probably.
  'Legendary': 5,    // Enough to generate buzz, not enough to be fair.
  'Mythic': 3,       // The OG vibe. Reserve this for team wallets.
  'Ultra Rare': 2    // The 2%. The blockchain aristocracy.
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Select a random item from an array based on weights.
 * Because pure randomness is just chaos, and we sell *curated* chaos.
 *
 * @param items - The pool of possible outcomes
 * @param weights - How much the universe favors each outcome
 * @returns The chosen item (weighted, not fair)
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  // Sum all weights. This is the total probability mass. (Very scientific.)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  // Walk the distribution until we find our destiny.
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  // Fallback: the last item catches any floating-point escapees.
  // (Shouldn't happen. Famous last words.)
  return items[items.length - 1];
}

/**
 * Generate a random trait value for a given trait type.
 * Adds some spice to the collection. A pinch of chaos, lovingly measured.
 *
 * @param traitType - Which category of trait we're randomizing
 * @returns A trait value string that will appear on an OpenSea page nobody reads
 */
function generateTraitValue(traitType: string): string {
  // Look up the trait pool. If someone passes an unknown traitType, they get 'Unknown'.
  // Which is, honestly, the most honest trait in this collection.
  const values = TRAIT_VALUES[traitType] || ['Unknown'];
  return values[Math.floor(Math.random() * values.length)];
}

/**
 * Generate attributes for a single NFT token.
 * Creates a unique combination of traits — deterministic by tokenId,
 * so the same token always wears the same hat. (Consistency matters.)
 *
 * Made deterministic to ensure consistent structure across all tokens.
 * Unlike my motivation, which is never deterministic, especially Mondays.
 *
 * @param tokenId - The token's ID, used as the PRNG seed
 * @returns Array of { trait_type, value } objects that constitute "rarity"
 */
function generateAttributes(tokenId: number): Array<{ trait_type: string; value: string }> {
  const attributes: Array<{ trait_type: string; value: string }> = [];

  // Use tokenId as seed for deterministic generation.
  // This ensures the same tokenId always gets the same traits.
  // Blockchain immutability, simulated in a script. Beautiful.
  let seed = tokenId;

  /**
   * Simple seeded LCG (Linear Congruential Generator).
   * Not cryptographically secure. Deeply appropriate for fake NFTs.
   * Constants chosen by someone in the 1960s who knew what they were doing.
   */
  function seededRandom(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // ── Rarity Selection ────────────────────────────────────────────────────────
  // Always include rarity first. It's the most important lie we tell our holders.
  const rarityValues = Object.keys(RARITY_WEIGHTS);
  const rarityWeights = rarityValues.map(r => RARITY_WEIGHTS[r]);
  const totalWeight = rarityWeights.reduce((sum, w) => sum + w, 0);
  let random = seededRandom() * totalWeight;

  // Walk the rarity table like a man walking toward his fate.
  let rarity = rarityValues[rarityValues.length - 1]; // Fallback: you get Common. Sorry.
  for (let i = 0; i < rarityValues.length; i++) {
    random -= rarityWeights[i];
    if (random <= 0) {
      rarity = rarityValues[i];
      break;
    }
  }
  attributes.push({ trait_type: 'Rarity', value: rarity });

  // ── Other Traits ────────────────────────────────────────────────────────────
  // FIXED NUMBER for consistency (4 traits total including Rarity).
  // All tokens will have: Rarity + 3 other traits = 4 attributes total.
  // Marketing will call this "meticulously balanced." Sure.
  const traitTypesToUse = TRAIT_TYPES.filter(t => t !== 'Rarity');
  const numTraits = 3; // 3 additional traits + Rarity = 4 total. The sacred number.

  const selectedTraits: string[] = [];
  const availableTraits = [...traitTypesToUse];

  // Deterministically select traits without duplicates.
  // Remove as we go — like job offers from a startup, once taken they're gone.
  while (selectedTraits.length < numTraits && availableTraits.length > 0) {
    const index = Math.floor(seededRandom() * availableTraits.length);
    selectedTraits.push(availableTraits[index]);
    availableTraits.splice(index, 1);
  }

  // Assign deterministic values to each selected trait.
  // Reproducible chaos. The best kind.
  selectedTraits.forEach(traitType => {
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
 * Generate a placeholder image URL using placehold.co.
 * Because we need images, and placehold.co is our unsung hero, our silent savior,
 * our colorful rectangle in a world of broken CIDFs.
 *
 * @param tokenId - The token ID (determines color cycling and label text)
 * @returns A URL that produces a guaranteed-available image. (Bless you, placehold.co.)
 */
function generateImageUrl(tokenId: number): string {
  // Cycle through background colors. 20 colors, infinite tokens.
  // Somewhere around token 21 you realize the art is repeating. That's the lore.
  const bgColor = BACKGROUND_COLORS[tokenId % BACKGROUND_COLORS.length];
  const textColor = '#FFFFFF'; // White text. Timeless. Like the void.

  // Cycle through 1000 color variations. After that we loop. Nobody will notice.
  const seed = tokenId % 1000;
  const text = `NFT #${tokenId}`;

  // The URL that powers our "art." Strip the # because URLs aren't philosophers.
  return `https://placehold.co/${IMAGE_SIZE}x${IMAGE_SIZE}/${bgColor.replace('#', '')}/${textColor.replace('#', '')}/${IMAGE_FORMAT}?text=${encodeURIComponent(text)}`;
}

/**
 * Download an image from a URL and save it to disk.
 * Because we need actual file bytes for IPFS — not just vibes and URLs.
 *
 * Handles redirects because the internet loves redirects almost as much as it loves
 * breaking things at 2am on a deployment Friday.
 *
 * @param url - Where the image lives on the open internet
 * @param outputPath - Where it should live on your very much not open laptop
 * @returns A Promise that resolves when the image has been captured and domesticated
 */
function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Open the file stream early. Optimism is a virtue.
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      // Handle redirects — placehold.co sometimes does this. We follow, obediently.
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          // Recursively chase the redirect. How deep does the rabbit hole go?
          return downloadImage(response.headers.location, outputPath).then(resolve).catch(reject);
        }
      }

      // Non-200 responses get the silent treatment: close, delete, reject.
      // We don't negotiate with HTTP error codes.
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath); // Clean up the crime scene.
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      // Pipe the response into the file. This is the moment where bits become art.
      // (Placeholder art. But still.)
      response.pipe(file);

      // Resolve when the file is safely on disk. Victory.
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      // Something went wrong at the network layer. The internet has betrayed us.
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath); // Remove the partial evidence.
      }
      reject(err);
    });
  });
}

/**
 * Generate the Metaplex Token Metadata Standard JSON for a single NFT.
 * This is the sacred scroll that wallets read to decide what to render.
 * Do not mess with the structure unless you enjoy "failed to fetch" errors.
 *
 * @param tokenId - The token's ID number
 * @param collectionName - The collection's marketing-approved name
 * @param collectionSymbol - The 4-letter ticker that will be forgotten in 6 months
 * @returns A metadata object ready to be JSON-stringified and uploaded to IPFS
 */
function generateMetadata(tokenId: number, collectionName: string, collectionSymbol: string): any {
  // Deterministically generate traits. Same input → same output. Science.
  const attributes = generateAttributes(tokenId);

  // Get the matching placeholder image URL for this token.
  const imageUrl = generateImageUrl(tokenId);

  return {
    name: `${collectionName} #${tokenId}`,
    symbol: collectionSymbol,

    // The description. "Test collection for IPFS uploads" is at least honest.
    // Most NFT descriptions are not this honest.
    description: `A unique ${collectionName} NFT. Token ID: ${tokenId}. This is a test collection for IPFS uploads.`,

    image: imageUrl,

    // External URL: where holders go to feel like their NFT matters. (Aspirational.)
    external_url: `https://nexus-launchpad.com/collection/${collectionName.toLowerCase().replace(/\s+/g, '-')}/${tokenId}`,

    attributes: attributes,

    properties: {
      files: [
        {
          uri: imageUrl,
          type: `image/${IMAGE_FORMAT}`
        }
      ],
      category: 'image', // Not audio. Not video. Just a rectangle. Honest.
      creators: [
        {
          address: '11111111111111111111111111111111', // System program address. The void. Truly decentralized authorship.
          share: 100
        }
      ]
    },

    // 5% royalty. We're reaching into the secondary market from the grave.
    seller_fee_basis_points: 500,
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

/**
 * The main function. The big one. The one that does The Thing.
 * Orchestrates directory creation, metadata generation, and image downloading
 * in a tidy loop that will take a while if you asked for 10,000 NFTs.
 * (You did this to yourself.)
 *
 * @param supply - How many fake NFTs to bring into existence
 * @param outputDir - Where all this fake art should go
 */
async function generateCollection(supply: number, outputDir: string) {
  console.log(`🚀 Generating ${supply} fake NFTs...`);
  console.log(`📁 Output directory: ${outputDir}`);

  // ── Directory Setup ──────────────────────────────────────────────────────────
  // Create the nested output structure. If these dirs already exist, no problem.
  // If they don't, we build our kingdom from scratch. With mkdir.
  const metadataDir = path.join(outputDir, 'metadata');
  const imagesDir = path.join(outputDir, 'images');

  // Create parent dir if it's not already there waiting for us.
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  // metadata/ — where the JSON scrolls live.
  if (!fs.existsSync(metadataDir)) {
    fs.mkdirSync(metadataDir, { recursive: true });
  }
  // images/ — where the rectangle art lives.
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // These are our collection's identity. Cherish them. They are all we have.
  const collectionName = 'Fake Test Collection';
  const collectionSymbol = 'FAKE'; // Possibly the most accurate ticker on the chain.

  // ── Collection-Level Metadata ────────────────────────────────────────────────
  // The top-level metadata JSON that represents the entire collection.
  // Token #0's image stands in as the collection thumbnail. It's a colored square.
  const collectionMetadata = {
    name: collectionName,
    symbol: collectionSymbol,
    description: `A massive test collection with ${supply} NFTs for IPFS testing. Generated by generate-fake-collection.ts`,
    image: generateImageUrl(0), // Token 0 is the avatar. The face of this empire.
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
          address: '11111111111111111111111111111111', // Still the void.
          share: 100
        }
      ]
    }
  };

  // Save the collection metadata. This is the scroll of scrolls.
  fs.writeFileSync(
    path.join(outputDir, 'collection.json'),
    JSON.stringify(collectionMetadata, null, 2)
  );

  console.log('📝 Generating individual NFT metadata and downloading images...');

  // ── Batch Generation Loop ─────────────────────────────────────────────────────
  // We batch downloads to avoid hammering placehold.co into the ground.
  // Respect the free service. It keeps this whole operation alive.
  const batchSize = 10; // Small enough to be polite. Large enough to make progress.
  let processed = 0;

  for (let i = 0; i < supply; i += batchSize) {
    const batchEnd = Math.min(i + batchSize, supply);
    const batchPromises: Promise<void>[] = [];

    for (let tokenId = i; tokenId < batchEnd; tokenId++) {
      // Generate this token's metadata object. The scroll for this particular rectangle.
      const metadata = generateMetadata(tokenId, collectionName, collectionSymbol);

      // Write metadata to disk immediately — no waiting.
      const metadataPath = path.join(metadataDir, `${tokenId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Queue the image download. These will run in parallel within the batch.
      // (Parallel I/O: the good kind of chaos.)
      const imagePath = path.join(imagesDir, `${tokenId}.${IMAGE_FORMAT}`);
      batchPromises.push(
        downloadImage(metadata.image, imagePath).catch(err => {
          // Log and continue — one failed image won't abort the whole mission.
          // We leave no NFT behind. (Except this one. It's fine.)
          console.error(`\n⚠️  Failed to download image for token ${tokenId}: ${err.message}`);
        })
      );
    }

    // Wait for all downloads in this batch. Patience is a virtue.
    // (So is not DDoS-ing placehold.co.)
    await Promise.all(batchPromises);

    // Update progress. The only honest progress bar in this entire industry.
    processed = batchEnd;
    const progress = ((processed / supply) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${processed}/${supply} (${progress}%) - Metadata & Images`);
  }

  console.log('\n✅ Collection generation complete!');

  // ── Manifest ──────────────────────────────────────────────────────────────────
  // A summary file so future-you (or future-someone-else) knows what happened here.
  // Think of it as a tombstone for these fake NFTs. Lovingly engraved.
  const manifest = {
    collection: collectionName,
    symbol: collectionSymbol,
    supply: supply,
    imageFormat: IMAGE_FORMAT,
    imageSize: `${IMAGE_SIZE}x${IMAGE_SIZE}`,
    metadataFormat: 'Metaplex Token Metadata Standard',
    generatedAt: new Date().toISOString(), // Timestamp of creation. A birth certificate.
    metadataDirectory: 'metadata',
    imagesDirectory: 'images',
    note: 'Images have been downloaded and are ready for IPFS upload.'
  };

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // ── Download Scripts ─────────────────────────────────────────────────────────
  // Generate helper scripts for re-downloading images if needed.
  // Because drives fail. Computers betray us. These scripts endure.
  const colorsStr = BACKGROUND_COLORS.map(c => c.replace('#', '')).join(' ');
  const colorsArrayStr = BACKGROUND_COLORS.map(c => `"${c.replace('#', '')}"`).join(', ');

  // Bash script for the Unix faithful. They know who they are.
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

  // PowerShell script for the Windows warriors. Equally valid. Different kind of pain.
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

  // ── Summary Print ─────────────────────────────────────────────────────────────
  // The final scroll. Read it aloud to feel accomplished.
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

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
// Parse CLI args like a grownup. No frameworks. Just process.argv and willpower.

const args = process.argv.slice(2);

// Supply: parse the first arg or fall back to DEFAULT_SUPPLY. Trust the default.
const supply = args[0] ? parseInt(args[0], 10) : DEFAULT_SUPPLY;

// Output dir: the second arg, or our trusty default fake-collection folder.
const outputDir = args[1] || DEFAULT_OUTPUT_DIR;

// Validate supply. NaN is not a business strategy.
if (isNaN(supply) || supply <= 0) {
  console.error('❌ Invalid supply. Please provide a positive number.');
  process.exit(1);
}

// Light the fuse. Pray to placehold.co. Run the generator.
generateCollection(supply, outputDir).catch(error => {
  console.error('❌ Error generating collection:', error);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This script generates 1,500+ fake NFTs so you don't have to hand-craft them
// one at a time like some kind of artisanal fraud. The placeholder images are
// colorful rectangles. The metadata is technically valid. The rarity is fake.
// The vibes, however, are completely authentic.
//
// If this script is running in CI, someone made a very interesting decision.
// If it's running in production... we need to talk.
//
// — Juan
//   "I didn't invent fake NFTs, I just automated them."
//   nexus-launchpad, somewhere between testnet and regret
// ─────────────────────────────────────────────────────────────────────────────
