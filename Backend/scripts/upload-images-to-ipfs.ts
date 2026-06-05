/**
 * Upload Images to IPFS
 *
 * Marches a folder full of fake-collection PNGs across the digital void
 * and pins them to a decentralized network that will outlive all of us.
 * (Whether that is comforting or terrifying is left as an exercise for the reader.)
 *
 * IPFS: the blockchain's attic. Nobody knows what's up there, but it's permanent.
 * Your art is now immortal. Hope it deserved it.
 *
 * Usage:
 *   ts-node scripts/upload-images-to-ipfs.ts
 *
 * Or with API key (for when the backend has trust issues, unlike your dog):
 *   API_KEY=your-key ts-node scripts/upload-images-to-ipfs.ts
 *
 * Prerequisites: Node 18+, a running backend, a working IPFS node, a good attitude.
 * (One of these is optional. It's the attitude.)
 */

// The two honest imports. No drama, no blockchain SDK with 47 peer dependencies.
// Just fs (reading files off disk like a civilized person) and path (because
// __dirname alone is a cry for help). Cherish them.
import * as fs from 'fs'; // The OG. Reads bytes. Writes bytes. No opinions.
import * as path from 'path'; // Joins paths without crying about backslashes. Unlike the rest of us.

/**
 * The sacred data contract. Every image that passes through this script
 * gets stamped with one of these — a permanent record of its journey into
 * the decentralized ether. Think of it as an NFT birth certificate.
 * (Please do not put that on the marketing materials.)
 */
interface UploadResult {
  filename: string;    // The name it was born with. Probably "1.png". Humble origins.
  hash: string;        // The CID — a cryptographic fingerprint that is now its permanent identity. Cool or horrifying depending on your mood.
  gatewayUrl: string;  // The HTTP URL so normies can click a link without running an IPFS node in their basement.
  size: number;        // Bytes. The digital weight of a fake NFT. Philosophy major's nightmare.
  pinned: boolean;     // Whether the IPFS node agreed to keep it. (It said yes. This time.)
  success: boolean;    // Did it work? The most important boolean in any codebase. Unlike most booleans, this one matters.
  error?: string;      // Optional note from the universe explaining what went wrong. Optional because optimism.
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — Loaded from env vars because hardcoding credentials
// is a path walked by people who enjoy explaining things to security teams.
// If these are wrong, nothing below will work. Nothing above will either.
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'; // Defaults to localhost because production deployments are someone else's problem until they aren't.
const API_KEY = process.env.API_KEY || ''; // Empty string = unauthenticated mode = the backend is feeling trusting today = danger. Set this in prod.
const IMAGES_DIR = path.join(__dirname, '../../programs/fake-collection/images'); // "fake-collection" is in the path. At least we're honest.
const OUTPUT_FILE = path.join(__dirname, '../../programs/fake-collection/ipfs-uploads.json'); // The receipts file. If this upload session goes sideways, this JSON is the post-mortem.

/**
 * uploadImageToIpfs — reads a file, wraps it in FormData, and yeets it at the IPFS endpoint.
 *
 * This function does the real work. Everything else in this file is just moral support.
 *
 * Failure modes: file not found, backend down, API key rejected, IPFS node having an
 * existential crisis, network gremlins, Mercury in retrograde.
 * All failures are caught and returned as a result object, because crashing the loop
 * on image 47 of 100 is not the chaos we're here for.
 *
 * @param filePath - Absolute path to the PNG. Must exist. We are not a charity.
 * @param filename - The name to send to the API. Will live on the blockchain. No pressure.
 * @returns A promise that resolves to either success (with a hash) or dignified failure (with an error).
 */
async function uploadImageToIpfs(filePath: string, filename: string): Promise<UploadResult> {
  try {
    // Step 1: Actually read the file. If it doesn't exist, the catch block below
    // will handle it with grace. (Or at least TypeScript will pretend it will.)
    const fileBuffer = fs.readFileSync(filePath);

    // Step 2: Assemble the delivery vehicle. FormData is the POST body's little suitcase.
    // We pack the image in, tell it it's PNG, give it a name, and send it off into the network.
    const formData = new FormData();

    // Wrap the raw buffer in a Blob because FormData doesn't understand raw Buffers —
    // it wants its data gift-wrapped. Node.js 18+ has native Blob/FormData support,
    // which is why the package.json engines field is not just a suggestion.
    // (It is absolutely just a suggestion, but please respect it anyway.)
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, filename); // The payload. The moment the image becomes data becomes art becomes blockchain.
    formData.append('pin', 'true'); // Tell IPFS to pin it. Without pinning, files evaporate. Turns out permanence requires intention.

    // Authentication: optional but strongly encouraged.
    // Like wearing a seatbelt — technically the car works without it.
    const headers: HeadersInit = {};

    // If an API key was provided, we act like adults who read the documentation.
    // If not, we proceed in faith and hope the backend is feeling charitable.
    // (The backend has its own strong opinions about this — see api-key.guard.ts.)
    if (API_KEY) {
      headers['x-api-key'] = API_KEY; // The password note, passed as a header. Old school, functional, slightly anxious.
    }

    // The big moment. We knock on the backend's door, hand over the FormData suitcase,
    // and await judgment. Everything from here on is either success or a lesson in error handling.
    // (Click and pray is not a launch strategy, but it is very much a development strategy.)
    const response = await fetch(
      `${BACKEND_URL}/api/ipfs/upload/file`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    // The backend has spoken. If response.ok is false, the backend is upset.
    // We will calmly extract its complaint, parse it if possible, and return it
    // as a structured failure — because screaming into the void is less useful than
    // a readable error message in a JSON file.
    if (!response.ok) {
      const errorText = await response.text(); // Read the body before it expires. HTTP responses are like avocados — you have one window.
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      // Attempt to parse the error as JSON for a nicer message.
      // Backend error responses vary: sometimes structured, sometimes a raw scream.
      // We try to catch both.
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Throw so the outer catch picks it up and returns a structured failure.
      // We escalate politely — no unhandled rejections at this table.
      throw new Error(errorMessage);
    }

    // The server said 200. Now we check if it actually meant it.
    // HTTP 200 with success: false is one of life's great lies.
    const data = await response.json();

    // The double-check. Because a successful HTTP response and a successful upload
    // are two different philosophical positions, and this backend knows it.
    if (data.success) {
      // It worked. The image now has a permanent home on the decentralized web.
      // Future historians will find this PNG. Hopefully the metadata ages better than the art.
      return {
        filename,
        hash: data.data.hash,
        gatewayUrl: data.data.gatewayUrl,
        size: data.data.size,
        pinned: data.data.pinned,
        success: true,
      };
    } else {
      // The server said 200, but success: false. The spiritual equivalent of a thumbs-up with no eye contact.
      // We return a structured failure so the loop keeps going. Resilience.
      return {
        filename,
        hash: '',
        gatewayUrl: '',
        size: 0,
        pinned: false,
        success: false,
        error: 'Upload failed: Unknown error',
      };
    }
  // If anything above detonated — network error, file read failure, API key rejection,
  // IPFS node having a rough day — it lands here. We return a polite failure object
  // instead of crashing, because partial results are better than no results at 3am.
  } catch (error: any) {
    return {
      filename,
      hash: '',
      gatewayUrl: '',
      size: 0,
      pinned: false,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * main — The conductor. Orchestrates the entire upload symphony.
 *
 * Scans the fake-collection directory, sorts numerically (because "10.png" after "9.png"
 * is the correct order, not after "1.png" like some sort algorithms seem to believe —
 * lexicographic ordering is a sociopath and we will not be entertaining it today),
 * uploads each image with a polite delay between them, and saves the receipts.
 *
 * If everything goes well: exits 0, results saved, sanity intact.
 * If things go wrong: exits 1, JSON still saved, dignity questionable.
 */
async function main() {
  console.log('🚀 Starting image upload to IPFS...\n'); // The optimism before the reality.
  console.log(`Backend URL: ${BACKEND_URL}`); // Confirming we know where we're sending 100 images. Important.
  console.log(`Images directory: ${IMAGES_DIR}`); // Confirming the fake art is where we think it is.
  console.log(`API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'Not set (may work if API_KEY not required)'}\n`); // Masking the last 4 chars — security theater, but professional security theater.

  // Sanity check #1: does the directory actually exist?
  // Asking forgiveness instead of permission works great for database migrations.
  // For reading 100 image files, let's verify first.
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1); // Hard stop. There is literally nothing to upload. No heroics available.
  }

  // Gather all PNG files and sort them numerically.
  // "1.png, 2.png, ..., 10.png" not "1.png, 10.png, 2.png" — the latter is chaos
  // and we have enough chaos already (see: IPFS, blockchain, this entire stack).
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(file => file.endsWith('.png'))
    .sort((a, b) => {
      // Numeric sort: parseInt strips ".png" and compares numbers like a mathematician,
      // not a lexicographic sociopath. || 0 handles the edge case of a file named "banana.png".
      // (There better not be a file named "banana.png".)
      const numA = parseInt(a.replace('.png', '')) || 0;
      const numB = parseInt(b.replace('.png', '')) || 0;
      return numA - numB;
    });

  // Double-check that we actually found something. The PNG filter may have eliminated everything.
  // ("All images were JPEGs." — a true horror story from dev environments everywhere.)
  if (files.length === 0) {
    console.error('❌ No PNG files found in images directory');
    process.exit(1);
  }

  console.log(`📸 Found ${files.length} images to upload\n`);

  const results: UploadResult[] = []; // The record of every image's fate. Sacred data.
  let successCount = 0; // How many images made it to the blockchain. This number should climb.
  let failCount = 0;    // How many did not. This number should stay at zero. (It won't always.)

  // The main event. One image at a time, politely, with progress logging,
  // like a developer who respects rate limits and server memory.
  // No Promise.all(100 concurrent uploads) heroics here — we are civilized.
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(IMAGES_DIR, file);

    // Progress log: because watching "47/100" tick up is 80% of the reason this script has a CLI interface.
    console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);

    const result = await uploadImageToIpfs(filePath, file);
    results.push(result);

    // Tally the results and log outcome. Console.log is not a monitoring solution,
    // but at 2am before a launch it absolutely is.
    if (result.success) {
      successCount++;
      console.log(`  ✅ Success! Hash: ${result.hash}`);
      console.log(`  🔗 Gateway: ${result.gatewayUrl}\n`);
    } else {
      failCount++;
      console.log(`  ❌ Failed: ${result.error}\n`);
    }

    // 100ms courtesy pause between uploads. The backend did not ask for this.
    // We do it anyway — because nothing says "I respect your server" like not DDoS-ing it
    // with 100 sequential file uploads at full speed. Unlike my motivation, which is never visible.
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Assemble the full results payload. This JSON file is the permanent record —
  // the ledger of every CID, every gateway URL, every byte size.
  // Future developers will open this file and know exactly what happened here today.
  // (They will also wonder why someone uploaded a "fake-collection". Godspeed, future developers.)
  const output = {
    uploadDate: new Date().toISOString(), // When this madness occurred. For the record.
    totalFiles: files.length,
    successCount,
    failCount,
    // Reduce the array to a keyed object: { "1.png": { hash, gatewayUrl, ... } }
    // because arrays are for cowards and keyed lookups are for production systems.
    results: results.reduce((acc, result) => {
      acc[result.filename] = {
        hash: result.hash,
        gatewayUrl: result.gatewayUrl,
        size: result.size,
        pinned: result.pinned,
        success: result.success,
        error: result.error,
      };
      return acc;
    }, {} as Record<string, any>),
  };

  // Write the receipts. Synchronously. Blocking the event loop for one sacred moment
  // while 100 IPFS hashes are committed to disk. Some things deserve a moment of ceremony.
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Summary: the post-battle report. Numbers that tell the story of this upload session.
  // If failCount is 0, go home and sleep. If failCount > 0, open the JSON file and weep constructively.
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  console.log(`Total files: ${files.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`\n📄 Results saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(60));

  // Non-zero fail count means exit 1 — signals to any CI/CD pipeline or calling script
  // that something went wrong. It also signals to Juan that it's going to be a long day.
  if (failCount > 0) {
    console.log('\n⚠️  Some uploads failed. Check the output file for details.');
    process.exit(1); // Not a tantrum. A structured, intentional failure. There is a difference.
  }
}

// Last line of defense. If main() itself blows up in a way that bypasses all internal error handling —
// a truly catastrophic, unplanned, beautiful disaster — this catch logs it and exits with dignity.
// Because even chaos deserves an exit code.
main().catch(error => {
  console.error('❌ Fatal error:', error); // Unplanned chaos. The backend, the network, or the universe said no.
  process.exit(1); // Goodbye, cruel process.
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — because fake NFTs don't upload themselves,
 * and decentralized storage deserves a human voice screaming into the void.
 *
 * If the IPFS node is down, restart it. If the API key is wrong, check the .env.
 * If neither of those fixes it, it's Mercury in retrograde and there's nothing
 * anyone can do. Go outside. Touch grass. Come back in three weeks.
 *
 * These images are now eternal. Act accordingly.
 * ─────────────────────────────────────────────────────────────────────────────
 */
