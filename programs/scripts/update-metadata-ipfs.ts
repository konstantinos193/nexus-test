/**
 * Update metadata files to use IPFS image URLs.
 * Replaces placehold.co URLs with IPFS gateway URLs.
 *
 * Because placehold.co URLs are so last season. Centralized image hosting
 * in a "decentralized" NFT collection is a vibe crime, and we are here to fix it.
 *
 * This script walks through every JSON file in your metadata directory and
 * surgically replaces the image field with its IPFS counterpart.
 * Painless. Mostly. (The part where you wait for IPFS to propagate is not painless.)
 *
 * Usage: npx ts-node scripts/update-metadata-ipfs.ts [metadataDir] [ipfsBaseUrl]
 * Example: npx ts-node scripts/update-metadata-ipfs.ts ./fake-collection/metadata https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce
 */

// fs — the one module you reach for when you accept that files are your database.
import * as fs from 'fs';

// path — because hardcoding slashes is a cry for help on Windows machines.
import * as path from 'path';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

/** Default metadata directory. Change if you put your fake art somewhere else. */
const DEFAULT_METADATA_DIR = './fake-collection/metadata';

/**
 * Default IPFS base URL. This CID is so long it looks like someone
 * fell asleep on a keyboard and accidentally created a permanent content address.
 * (That's essentially what happened. Content-addressed storage is beautiful.)
 */
const DEFAULT_IPFS_BASE_URL = 'https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce';

/** PNG. Always PNG. We've been over this. */
const IMAGE_FORMAT = 'png';

// ─── CORE LOGIC ───────────────────────────────────────────────────────────────

/**
 * Update a single metadata JSON file to use an IPFS image URL instead of
 * a placehold.co URL. Reads the file, swaps the URL, writes it back.
 * Simple surgery. Local anesthesia not included.
 *
 * @param filePath - Absolute path to the metadata JSON file on disk
 * @param tokenId - The token's numeric ID (used to construct the IPFS image filename)
 * @param ipfsBaseUrl - The IPFS gateway base URL (without trailing slash, please)
 */
function updateMetadataFile(filePath: string, tokenId: number, ipfsBaseUrl: string): void {
  try {
    // Read the file. It exists. Probably. (existsSync was called upstream. Trust the process.)
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse the JSON. If this throws, someone has corrupted metadata. A crime.
    const metadata = JSON.parse(fileContent);

    // Construct the IPFS image URL for this token.
    // Pattern: <base>/<tokenId>.png — simple, correct, beautiful.
    const ipfsImageUrl = `${ipfsBaseUrl}/${tokenId}.${IMAGE_FORMAT}`;

    // ── Swap the main image field ────────────────────────────────────────────
    // This is the field wallets use. The one that matters. The face of the NFT.
    metadata.image = ipfsImageUrl;

    // ── Swap properties.files[0].uri ────────────────────────────────────────
    // Metaplex standard says this should match the image field.
    // We're nothing if not consistent about our fake art.
    if (metadata.properties && metadata.properties.files && metadata.properties.files.length > 0) {
      metadata.properties.files[0].uri = ipfsImageUrl;
    }

    // Write the updated metadata back to disk. Overwrite with conviction.
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (error) {
    // Something went wrong. Surface the error so the caller can count it.
    console.error(`❌ Error updating ${filePath}:`, error);
    throw error;
  }
}

/**
 * Main orchestration function. Scans the metadata directory, processes every
 * JSON file, swaps all image URLs to IPFS, and reports the carnage.
 *
 * The real workhorse of this script. The beast of burden. The updater of URLs.
 * Running silently while you drink coffee and try to remember what a CID means.
 *
 * @param metadataDir - Path to the directory full of JSON metadata files
 * @param ipfsBaseUrl - The IPFS gateway base URL (trailing slash already stripped upstream)
 */
async function updateMetadataFiles(metadataDir: string, ipfsBaseUrl: string) {
  console.log(`🔄 Updating metadata files with IPFS URLs...`);
  console.log(`📁 Metadata directory: ${metadataDir}`);
  console.log(`🌐 IPFS base URL: ${ipfsBaseUrl}`);

  // Refuse to operate on nonexistent directories. We have standards.
  if (!fs.existsSync(metadataDir)) {
    console.error(`❌ Metadata directory does not exist: ${metadataDir}`);
    process.exit(1);
  }

  // Collect all JSON files in the directory. Only JSON. We're picky.
  // (Turns out having images and metadata in the same folder is a chaos move.)
  const files = fs.readdirSync(metadataDir).filter(file => file.endsWith('.json'));

  // If there are no JSON files, someone ran the wrong script in the wrong order.
  // The pipeline has failed. The pipeline has feelings. The pipeline is sad.
  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${metadataDir}`);
    process.exit(1);
  }

  console.log(`📝 Found ${files.length} metadata files to update`);

  // ── Counters ─────────────────────────────────────────────────────────────────
  let updated = 0; // Victories.
  let errors = 0;  // Defeats. (Hopefully zero.)

  // ── Batch Processing Loop ─────────────────────────────────────────────────────
  // Process 100 files per batch for progress tracking purposes.
  // Not for performance — fs.readFileSync doesn't care about batches.
  // This is purely for the comfort of watching numbers go up.
  const batchSize = 100;

  for (let i = 0; i < files.length; i += batchSize) {
    // Slice out the current batch. Like dealing cards. Except every card is a JSON file.
    const batch = files.slice(i, Math.min(i + batchSize, files.length));

    for (const file of batch) {
      try {
        // Extract the numeric token ID from the filename.
        // "42.json" → 42. Simple. Elegant. As the blockchain intended.
        const tokenId = parseInt(path.basename(file, '.json'), 10);

        // Non-numeric filenames get skipped. We don't know what they are.
        // collection.json, manifest.json — noble files, but not for us right now.
        if (isNaN(tokenId)) {
          console.warn(`⚠️  Skipping file with non-numeric name: ${file}`);
          continue;
        }

        // Execute the sacred swap. placehold.co → IPFS. Centralized → Decentralized.
        const filePath = path.join(metadataDir, file);
        updateMetadataFile(filePath, tokenId, ipfsBaseUrl);
        updated++;
      } catch (error) {
        // Count the casualty and keep moving. We don't stop for errors.
        // (We do exit at the end if there are any. But dramatically, not immediately.)
        console.error(`❌ Failed to update ${file}:`, error);
        errors++;
      }
    }

    // Progress indicator. The only honest metrics in Web3.
    const progress = ((Math.min(i + batchSize, files.length) / files.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${updated}/${files.length} updated (${progress}%)`);
  }

  // ── Final Summary ─────────────────────────────────────────────────────────────
  console.log('\n✅ Metadata update complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Files updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total files: ${files.length}`);

  // If any files failed, exit non-zero so CI can have an aneurysm about it.
  // Partial updates are worse than no update. Consistency is non-negotiable.
  if (errors > 0) {
    console.log(`\n⚠️  Some files failed to update. Check the errors above.`);
    process.exit(1);
  }
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

// Parse the two CLI arguments. If you didn't provide them, we'll use the defaults
// and hope they're right. (They might not be right. Update the defaults if needed.)
const args = process.argv.slice(2);
const metadataDir = args[0] || DEFAULT_METADATA_DIR;
const ipfsBaseUrl = args[1] || DEFAULT_IPFS_BASE_URL;

// Strip the trailing slash if someone helpfully included one.
// "https://gateway.example.com/ipfs/abc123/" → "https://gateway.example.com/ipfs/abc123"
// The slash giveth nothing. The slash taketh double-slashes.
const cleanIpfsUrl = ipfsBaseUrl.replace(/\/$/, '');

// Run the updater. The moment of truth. The URL swap begins.
updateMetadataFiles(metadataDir, cleanIpfsUrl).catch(error => {
  console.error('❌ Error updating metadata:', error);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This script is the last leg of a journey that began with colored rectangles
// and ends with content-addressed immutable art on a distributed storage network.
// Is it "real" art? Unclear. Is the IPFS hash permanent? Also unclear.
// Is the placehold.co URL definitely temporary? Absolutely. Run this script.
//
// Life is a series of URL replacements. This one matters.
//
// — Juan
//   "From placehold.co to IPFS: a hero's journey."
//   nexus-launchpad, somewhere between upload and propagation
// ─────────────────────────────────────────────────────────────────────────────
