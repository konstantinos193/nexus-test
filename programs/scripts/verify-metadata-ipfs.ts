/**
 * Verify metadata files are accessible on IPFS
 * Tests that all metadata files can be accessed via the IPFS gateway
 * 
 * Usage: npx ts-node scripts/verify-metadata-ipfs.ts [metadataDir] [ipfsBaseUrl] [sampleSize]
 * Example: npx ts-node scripts/verify-metadata-ipfs.ts ./fake-collection/metadata https://gateway.lighthouse.storage/ipfs/bafybeiaqicss562jjzdjhsc5frcn75zi67jvzbbhh2kk2th4g5kqgques4
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// Default values
const DEFAULT_METADATA_DIR = './fake-collection/metadata';
const DEFAULT_IPFS_BASE_URL = 'https://gateway.lighthouse.storage/ipfs/bafybeiaqicss562jjzdjhsc5frcn75zi67jvzbbhh2kk2th4g5kqgques4';
const DEFAULT_SAMPLE_SIZE = 10; // Test a sample of files to avoid overwhelming the gateway

/**
 * Check if a URL is accessible via HTTP
 * Because we need to know if IPFS is actually working
 */
function checkUrlAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 10000 }, (response) => {
      const isAccessible = response.statusCode === 200;
      request.destroy();
      resolve(isAccessible);
    });

    request.on('error', () => {
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Verify metadata files on IPFS
 * The real workhorse of this script
 */
async function verifyMetadataFiles(metadataDir: string, ipfsBaseUrl: string, sampleSize: number) {
  console.log(`🔍 Verifying metadata files on IPFS...`);
  console.log(`📁 Metadata directory: ${metadataDir}`);
  console.log(`🌐 IPFS base URL: ${ipfsBaseUrl}`);
  console.log(`📊 Sample size: ${sampleSize} files (or all if sampleSize is 0)`);
  
  if (!fs.existsSync(metadataDir)) {
    console.error(`❌ Metadata directory does not exist: ${metadataDir}`);
    process.exit(1);
  }
  
  // Read all JSON files in the metadata directory
  const files = fs.readdirSync(metadataDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      const numA = parseInt(path.basename(a, '.json'), 10);
      const numB = parseInt(path.basename(b, '.json'), 10);
      return numA - numB;
    });
  
  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${metadataDir}`);
    process.exit(1);
  }
  
  console.log(`📝 Found ${files.length} metadata files`);
  
  // Determine which files to test
  const filesToTest = sampleSize > 0 && sampleSize < files.length
    ? [
        ...files.slice(0, Math.floor(sampleSize / 2)), // First few
        ...files.slice(-Math.floor(sampleSize / 2)), // Last few
        ...files.slice(Math.floor(files.length / 2), Math.floor(files.length / 2) + 1) // Middle one
      ]
    : files;
  
  console.log(`🧪 Testing ${filesToTest.length} metadata files...`);
  
  let accessible = 0;
  let inaccessible = 0;
  const inaccessibleFiles: string[] = [];
  
  // Test files in parallel (but not too many at once)
  const batchSize = 5;
  
  for (let i = 0; i < filesToTest.length; i += batchSize) {
    const batch = filesToTest.slice(i, Math.min(i + batchSize, filesToTest.length));
    const batchPromises = batch.map(async (file) => {
      const tokenId = path.basename(file, '.json');
      const ipfsUrl = `${ipfsBaseUrl}/${tokenId}.json`;
      
      const isAccessible = await checkUrlAccessible(ipfsUrl);
      
      if (isAccessible) {
        accessible++;
        return { file, accessible: true };
      } else {
        inaccessible++;
        inaccessibleFiles.push(file);
        return { file, accessible: false };
      }
    });
    
    const results = await Promise.all(batchPromises);
    
    // Log results for this batch
    results.forEach(({ file, accessible: acc }) => {
      const status = acc ? '✅' : '❌';
      process.stdout.write(`\r${status} ${file}${' '.repeat(50)}`);
    });
    
    const progress = ((Math.min(i + batchSize, filesToTest.length) / filesToTest.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${i + batchSize}/${filesToTest.length} tested (${progress}%)`);
  }
  
  console.log('\n\n✅ Verification complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Files tested: ${filesToTest.length}`);
  console.log(`   ✅ Accessible: ${accessible}`);
  console.log(`   ❌ Inaccessible: ${inaccessible}`);
  console.log(`   Total files: ${files.length}`);
  
  if (inaccessible > 0) {
    console.log(`\n⚠️  Inaccessible files (first 10):`);
    inaccessibleFiles.slice(0, 10).forEach(file => {
      const tokenId = path.basename(file, '.json');
      console.log(`   ❌ ${file} -> ${ipfsBaseUrl}/${tokenId}.json`);
    });
    if (inaccessibleFiles.length > 10) {
      console.log(`   ... and ${inaccessibleFiles.length - 10} more`);
    }
  }
  
  // Test a few specific examples
  console.log(`\n🔗 Example IPFS URLs:`);
  const exampleFiles = files.slice(0, 3);
  for (const file of exampleFiles) {
    const tokenId = path.basename(file, '.json');
    const ipfsUrl = `${ipfsBaseUrl}/${tokenId}.json`;
    console.log(`   ${file}: ${ipfsUrl}`);
  }
  
  if (inaccessible > 0) {
    console.log(`\n⚠️  Some files are not accessible. Make sure:`);
    console.log(`   1. The metadata folder was uploaded to IPFS correctly`);
    console.log(`   2. The IPFS hash is correct`);
    console.log(`   3. The gateway is working properly`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All tested metadata files are accessible on IPFS!`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const metadataDir = args[0] || DEFAULT_METADATA_DIR;
const ipfsBaseUrl = args[1] || DEFAULT_IPFS_BASE_URL;
const sampleSize = args[2] ? parseInt(args[2], 10) : DEFAULT_SAMPLE_SIZE;

// Remove trailing slash from IPFS URL if present
const cleanIpfsUrl = ipfsBaseUrl.replace(/\/$/, '');

// Run the verifier
verifyMetadataFiles(metadataDir, cleanIpfsUrl, sampleSize).catch(error => {
  console.error('❌ Error verifying metadata:', error);
  process.exit(1);
});
