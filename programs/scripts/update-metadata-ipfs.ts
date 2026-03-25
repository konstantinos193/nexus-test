/**
 * Update metadata files to use IPFS image URLs
 * Replaces placehold.co URLs with IPFS gateway URLs
 * 
 * Usage: npx ts-node scripts/update-metadata-ipfs.ts [metadataDir] [ipfsBaseUrl]
 * Example: npx ts-node scripts/update-metadata-ipfs.ts ./fake-collection/metadata https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce
 */

import * as fs from 'fs';
import * as path from 'path';

// Default values
const DEFAULT_METADATA_DIR = './fake-collection/metadata';
const DEFAULT_IPFS_BASE_URL = 'https://gateway.lighthouse.storage/ipfs/bafybeia4un2wbforwcycyvagvynvds7246adcbxbtudk256qp3uehdzdce';
const IMAGE_FORMAT = 'png';

/**
 * Update a single metadata file with IPFS URL
 * Because placehold.co URLs are so last season
 */
function updateMetadataFile(filePath: string, tokenId: number, ipfsBaseUrl: string): void {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const metadata = JSON.parse(fileContent);
    
    // Create IPFS URL for this token
    const ipfsImageUrl = `${ipfsBaseUrl}/${tokenId}.${IMAGE_FORMAT}`;
    
    // Update image field
    metadata.image = ipfsImageUrl;
    
    // Update properties.files[0].uri if it exists
    if (metadata.properties && metadata.properties.files && metadata.properties.files.length > 0) {
      metadata.properties.files[0].uri = ipfsImageUrl;
    }
    
    // Write updated metadata back to file
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    throw error;
  }
}

/**
 * Main function to update all metadata files
 * The real workhorse of this script
 */
async function updateMetadataFiles(metadataDir: string, ipfsBaseUrl: string) {
  console.log(`🔄 Updating metadata files with IPFS URLs...`);
  console.log(`📁 Metadata directory: ${metadataDir}`);
  console.log(`🌐 IPFS base URL: ${ipfsBaseUrl}`);
  
  if (!fs.existsSync(metadataDir)) {
    console.error(`❌ Metadata directory does not exist: ${metadataDir}`);
    process.exit(1);
  }
  
  // Read all JSON files in the metadata directory
  const files = fs.readdirSync(metadataDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${metadataDir}`);
    process.exit(1);
  }
  
  console.log(`📝 Found ${files.length} metadata files to update`);
  
  let updated = 0;
  let errors = 0;
  
  // Process files in batches for progress tracking
  const batchSize = 100;
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, Math.min(i + batchSize, files.length));
    
    for (const file of batch) {
      try {
        // Extract token ID from filename (e.g., "0.json" -> 0)
        const tokenId = parseInt(path.basename(file, '.json'), 10);
        
        if (isNaN(tokenId)) {
          console.warn(`⚠️  Skipping file with non-numeric name: ${file}`);
          continue;
        }
        
        const filePath = path.join(metadataDir, file);
        updateMetadataFile(filePath, tokenId, ipfsBaseUrl);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update ${file}:`, error);
        errors++;
      }
    }
    
    const progress = ((Math.min(i + batchSize, files.length) / files.length) * 100).toFixed(1);
    process.stdout.write(`\r⏳ Progress: ${updated}/${files.length} updated (${progress}%)`);
  }
  
  console.log('\n✅ Metadata update complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Files updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total files: ${files.length}`);
  
  if (errors > 0) {
    console.log(`\n⚠️  Some files failed to update. Check the errors above.`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const metadataDir = args[0] || DEFAULT_METADATA_DIR;
const ipfsBaseUrl = args[1] || DEFAULT_IPFS_BASE_URL;

// Remove trailing slash from IPFS URL if present
const cleanIpfsUrl = ipfsBaseUrl.replace(/\/$/, '');

// Run the updater
updateMetadataFiles(metadataDir, cleanIpfsUrl).catch(error => {
  console.error('❌ Error updating metadata:', error);
  process.exit(1);
});
