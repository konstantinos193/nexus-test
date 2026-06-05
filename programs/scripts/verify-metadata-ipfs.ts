/**
 * Verify that metadata files are accessible on IPFS.
 * Tests that all metadata files can be accessed via the IPFS gateway.
 *
 * Because "I uploaded it" and "it's actually accessible" are two very different things,
 * separated by anywhere from 30 seconds to 3 business days depending on the gateway's mood.
 *
 * This script pings a sample of your metadata files via the IPFS gateway and reports
 * which ones respond. Run this after upload to confirm the vibes are intact.
 *
 * Usage: npx ts-node scripts/verify-metadata-ipfs.ts [metadataDir] [ipfsBaseUrl] [sampleSize]
 * Example: npx ts-node scripts/verify-metadata-ipfs.ts ./fake-collection/metadata https://gateway.lighthouse.storage/ipfs/bafybeiaqicss562jjzdjhsc5frcn75zi67jvzbbhh2kk2th4g5kqgques4
 */

// fs — for reading local metadata files so we know what *should* be on IPFS.
// (The source of truth. The master list. The ledger of fake art.)
import * as fs from 'fs';

// path — for extracting token IDs from filenames without breaking on Windows.
// (path.basename does the Lord's work here.)
import * as path from 'path';

// https — for pinging the IPFS gateway and praying for 200 OK responses.
// (The prayer module. Built into Node.js since forever.)
import * as https from 'https';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

/** Default metadata directory. Where the local JSON files live. */
const DEFAULT_METADATA_DIR = './fake-collection/metadata';

/**
 * Default IPFS gateway URL. This CID looks like someone
 * ran `sha256sum` on the entire concept of randomness and got a response.
 * That is, roughly, what keccak hashing your content looks like. Beautiful.
 */
const DEFAULT_IPFS_BASE_URL = 'https://gateway.lighthouse.storage/ipfs/bafybeiaqicss562jjzdjhsc5frcn75zi67jvzbbhh2kk2th4g5kqgques4';

/**
 * Default sample size: test 10 files out of potentially thousands.
 * Because testing all 1,500 files against a gateway you don't own
 * is how you end up rate-limited and explaining yourself to an SRE.
 */
const DEFAULT_SAMPLE_SIZE = 10;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Check if a URL is accessible via HTTPS GET.
 * A 200 OK means IPFS heard us. Anything else means IPFS is having a moment.
 *
 * Timeouts after 10 seconds because we are patient but not infinite.
 * The blockchain has no concept of "please hold, your call is important to us."
 *
 * @param url - The full IPFS gateway URL to check
 * @returns true if the URL responds with HTTP 200, false for everything else
 *          (404, 503, timeout, "gateway fell asleep" — all map to false)
 */
function checkUrlAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Fire the request with a 10-second timeout.
    // If IPFS hasn't responded in 10 seconds, it is ghosting us. We resolve false.
    const request = https.get(url, { timeout: 10000 }, (response) => {
      // 200 OK — the sacred response. The content exists. The gateway smiled upon us.
      const isAccessible = response.statusCode === 200;

      // Destroy the request immediately — we got what we needed.
      // No need to read the body; the status code tells the whole story.
      request.destroy();
      resolve(isAccessible);
    });

    // Network error: the gateway is down, the internet is down, or the universe is down.
    // Regardless: not accessible.
    request.on('error', () => {
      resolve(false);
    });

    // Timeout: IPFS is thinking very hard and we've run out of patience.
    // (IPFS propagation can take time. Sometimes "time" means "minutes." Sometimes longer.)
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

/**
 * Verify that uploaded metadata files are reachable via the IPFS gateway.
 * Samples a spread of files (first, last, middle) to get a representative picture
 * without pummeling the gateway with thousands of simultaneous requests.
 *
 * The real workhorse of this script. Cross your fingers and run it.
 * If everything returns 200, you may exhale.
 *
 * @param metadataDir - Local directory containing the original JSON metadata files
 * @param ipfsBaseUrl - IPFS gateway base URL (trailing slash already stripped)
 * @param sampleSize - Number of files to test (0 = test all, bravely)
 */
async function verifyMetadataFiles(metadataDir: string, ipfsBaseUrl: string, sampleSize: number) {
  console.log(`🔍 Verifying metadata files on IPFS...`);
  console.log(`📁 Metadata directory: ${metadataDir}`);
  console.log(`🌐 IPFS base URL: ${ipfsBaseUrl}`);
  console.log(`📊 Sample size: ${sampleSize} files (or all if sampleSize is 0)`);

  // Hard stop if the local directory doesn't exist.
  // We can't verify what we can't enumerate. The filesystem is law.
  if (!fs.existsSync(metadataDir)) {
    console.error(`❌ Metadata directory does not exist: ${metadataDir}`);
    process.exit(1);
  }

  // Read and sort all JSON files numerically.
  // Sorting is critical — "10.json" would sort before "2.json" alphabetically.
  // We treat these as numbers because they ARE numbers. The blockchain demands order.
  const files = fs.readdirSync(metadataDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(path.basename(a, '.json'), 10);
      const numB = parseInt(path.basename(b, '.json'), 10);
      return numA - numB;
    });

  // Empty directory = empty collection = something went very wrong upstream.
  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${metadataDir}`);
    process.exit(1);
  }

  console.log(`📝 Found ${files.length} metadata files`);

  // ── Sample Selection Strategy ─────────────────────────────────────────────────
  // We test the first few, the last few, and the middle one.
  // This covers: "did the first files upload correctly?" +
  //              "did the last files upload correctly?" +
  //              "is the middle of the collection alive?"
  // It's not exhaustive, but it's representative. Good enough for a sanity check.
  const filesToTest = sampleSize > 0 && sampleSize < files.length
    ? [
        ...files.slice(0, Math.floor(sampleSize / 2)),           // First half of sample
        ...files.slice(-Math.floor(sampleSize / 2)),             // Last half of sample
        ...files.slice(Math.floor(files.length / 2), Math.floor(files.length / 2) + 1) // The middle one (the soul of the collection)
      ]
    : files; // sampleSize === 0: test everything. Bold. Possibly rate-limited. Courageous.

  console.log(`🧪 Testing ${filesToTest.length} metadata files...`);

  // ── Counters ──────────────────────────────────────────────────────────────────
  let accessible = 0;                         // Files that responded. Hope.
  let inaccessible = 0;                       // Files that didn't. Dread.
  const inaccessibleFiles: string[] = [];     // The list of shame.

  // ── Batch Verification Loop ───────────────────────────────────────────────────
  // Check 5 files at a time. Polite concurrency. We are guests on this gateway.
  const batchSize = 5;

  for (let i = 0; i < filesToTest.length; i += batchSize) {
    // Slice the current batch. Five files at a time, like knocking on five doors simultaneously.
    const batch = filesToTest.slice(i, Math.min(i + batchSize, filesToTest.length));

    // Fire all 5 checks in parallel. Await the collective verdict.
    const batchPromises = batch.map(async (file) => {
      // Extract token ID from filename. "42.json" → "42" → IPFS URL → destiny.
      const tokenId = path.basename(file, '.json');
      const ipfsUrl = `${ipfsBaseUrl}/${tokenId}.json`;

      // The moment of truth. Send the HTTP request into the distributed void.
      const isAccessible = await checkUrlAccessible(ipfsUrl);

      if (isAccessible) {
        accessible++;
        return { file, accessible: true };
      } else {
        // File is inaccessible. Added to the hall of shame. Logged. Mourned.
        inaccessible++;
        inaccessibleFiles.push(file);
        return { file, accessible: false };
      }
    });

    // Wait for all 5 to resolve. No file left behind. (Well. Unless they time out.)
    const results = await Promise.all(batchPromises);

    // Flash the last result's status. Raw and honest.
    results.forEach(({ file, accessible: acc }) => {
      const status = acc ? '✅' : '❌';
      process.stdout.write(`\r${status} ${file}${' '.repeat(50)}`);
    });

    // Overwrite with the progress bar. Clean interface, chaotic internals.
    const progress = ((Math.min(i + batchSize, filesToTest.length) / filesToTest.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${i + batchSize}/${filesToTest.length} tested (${progress}%)`);
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  console.log('\n\n✅ Verification complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Files tested: ${filesToTest.length}`);
  console.log(`   ✅ Accessible: ${accessible}`);
  console.log(`   ❌ Inaccessible: ${inaccessible}`);
  console.log(`   Total files: ${files.length}`);

  // If anything was inaccessible, print the first 10 culprits.
  // More than 10 suggests a systemic issue, not a one-off gateway hiccup.
  if (inaccessible > 0) {
    console.log(`\n⚠️  Inaccessible files (first 10):`);
    inaccessibleFiles.slice(0, 10).forEach(file => {
      const tokenId = path.basename(file, '.json');
      console.log(`   ❌ ${file} -> ${ipfsBaseUrl}/${tokenId}.json`);
    });
    if (inaccessibleFiles.length > 10) {
      // The iceberg comment. There's more below the surface.
      console.log(`   ... and ${inaccessibleFiles.length - 10} more`);
    }
  }

  // ── Example URLs ──────────────────────────────────────────────────────────────
  // Print the first 3 IPFS URLs as examples.
  // Copy-paste one into a browser tab to visually confirm the metadata is real.
  // (Staring at raw JSON in a browser tab is a time-honored Web3 QA technique.)
  console.log(`\n🔗 Example IPFS URLs:`);
  const exampleFiles = files.slice(0, 3);
  for (const file of exampleFiles) {
    const tokenId = path.basename(file, '.json');
    const ipfsUrl = `${ipfsBaseUrl}/${tokenId}.json`;
    console.log(`   ${file}: ${ipfsUrl}`);
  }

  // ── Exit Conditions ───────────────────────────────────────────────────────────
  if (inaccessible > 0) {
    // Something's wrong. Here's the checklist. (You probably know what's wrong.
    // The IPFS hash is wrong. It's always the IPFS hash.)
    console.log(`\n⚠️  Some files are not accessible. Make sure:`);
    console.log(`   1. The metadata folder was uploaded to IPFS correctly`);
    console.log(`   2. The IPFS hash is correct`);
    console.log(`   3. The gateway is working properly`);
    process.exit(1);
  } else {
    // Everything accessible. The distributed content network heard our prayers.
    // The metadata lives. The NFTs are real. (The art is still colored rectangles, but still.)
    console.log(`\n🎉 All tested metadata files are accessible on IPFS!`);
  }
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

// Parse CLI args. Three potential inputs. All optional. All defaulted sensibly.
const args = process.argv.slice(2);
const metadataDir = args[0] || DEFAULT_METADATA_DIR;
const ipfsBaseUrl = args[1] || DEFAULT_IPFS_BASE_URL;
const sampleSize = args[2] ? parseInt(args[2], 10) : DEFAULT_SAMPLE_SIZE;

// Clean the trailing slash. Cleanliness is next to correctness.
const cleanIpfsUrl = ipfsBaseUrl.replace(/\/$/, '');

// Run the verifier. Hope for green. Prepare for red.
verifyMetadataFiles(metadataDir, cleanIpfsUrl, sampleSize).catch(error => {
  console.error('❌ Error verifying metadata:', error);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This script is the final form of paranoia. You uploaded the files. You ran
// the updater. And now you're asking a third script to confirm that the
// distributed network actually received your data. That's not paranoia.
// That's engineering. (It's a little paranoia.)
//
// IPFS propagation is like asking someone if they got your text message.
// Sometimes they reply immediately. Sometimes the gateway just ... thinks about it.
// This script gives you the receipts either way.
//
// — Juan
//   "Trust but verify. Especially IPFS. Especially Monday IPFS."
//   nexus-launchpad, somewhere between upload confirmation and gateway timeout
// ─────────────────────────────────────────────────────────────────────────────
