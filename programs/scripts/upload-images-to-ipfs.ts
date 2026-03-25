/**
 * Upload all images from fake-collection/images to IPFS
 * 
 * Usage: 
 *   npx ts-node scripts/upload-images-to-ipfs.ts
 * 
 * Requires:
 *   - Backend server running on PORT (default: 8000)
 *   - API_KEY environment variable or in .env file
 *   - IPFS node running and accessible
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { createReadStream, readFileSync } from 'fs';

// Configuration
const IMAGES_DIR = path.join(__dirname, '../fake-collection/images');
const OUTPUT_FILE = path.join(__dirname, '../fake-collection/ipfs-hashes.json');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || '543ef675f15bf0d12b03e88a0f7026b3806c76cb447f2b3787e0039259785cad';
const BATCH_SIZE = 5; // Upload 5 images at a time to avoid overwhelming the server
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

interface UploadResult {
  filename: string;
  hash: string;
  gatewayUrl: string;
  size: number;
  success: boolean;
  error?: string;
}

/**
 * Create multipart form data boundary
 */
function createMultipartFormData(filePath: string, filename: string, pin: string = 'true'): { body: Buffer; boundary: string; contentType: string } {
  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const fileContent = readFileSync(filePath);
  const fileSize = fileContent.length;

  // Build multipart form data manually
  const parts: Buffer[] = [];
  
  // File field
  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
  parts.push(Buffer.from(`Content-Type: image/png\r\n\r\n`));
  parts.push(fileContent);
  parts.push(Buffer.from(`\r\n`));
  
  // Pin field
  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(Buffer.from(`Content-Disposition: form-data; name="pin"\r\n\r\n`));
  parts.push(Buffer.from(`${pin}\r\n`));
  
  // Closing boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { body, boundary, contentType };
}

/**
 * Upload a single image to IPFS
 */
async function uploadImage(filename: string): Promise<UploadResult> {
  const filePath = path.join(IMAGES_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return {
      filename,
      hash: '',
      gatewayUrl: '',
      size: 0,
      success: false,
      error: 'File not found',
    };
  }

  return new Promise((resolve) => {
    try {
      const { body, contentType } = createMultipartFormData(filePath, filename);
      const fileStats = fs.statSync(filePath);

      const url = new URL(`${BACKEND_URL}/api/ipfs/upload/file`);
      const isHttps = url.protocol === 'https:';
      const requestModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Content-Length': body.length.toString(),
          'x-api-key': API_KEY,
        },
      };

      const req = requestModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 201) {
            try {
              const response = JSON.parse(data);
              if (response.success && response.data) {
                resolve({
                  filename,
                  hash: response.data.hash,
                  gatewayUrl: response.data.gatewayUrl,
                  size: response.data.size,
                  success: true,
                });
              } else {
                resolve({
                  filename,
                  hash: '',
                  gatewayUrl: '',
                  size: 0,
                  success: false,
                  error: 'Invalid response format',
                });
              }
            } catch (error: any) {
              resolve({
                filename,
                hash: '',
                gatewayUrl: '',
                size: 0,
                success: false,
                error: `Failed to parse response: ${error.message}`,
              });
            }
          } else {
            resolve({
              filename,
              hash: '',
              gatewayUrl: '',
              size: 0,
              success: false,
              error: `HTTP ${res.statusCode}: ${data.substring(0, 200)}`,
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          filename,
          hash: '',
          gatewayUrl: '',
          size: 0,
          success: false,
          error: error.message,
        });
      });

      req.write(body);
      req.end();
    } catch (error: any) {
      resolve({
        filename,
        hash: '',
        gatewayUrl: '',
        size: 0,
        success: false,
        error: error.message,
      });
    }
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get all PNG files from the images directory
 */
function getImageFiles(): string[] {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR);
  const pngFiles = files.filter((file) => file.toLowerCase().endsWith('.png'));
  
  // Sort files numerically (0.png, 1.png, ..., 10.png, etc.)
  pngFiles.sort((a, b) => {
    const numA = parseInt(a.replace('.png', ''), 10);
    const numB = parseInt(b.replace('.png', ''), 10);
    return numA - numB;
  });

  return pngFiles;
}

/**
 * Load existing hashes from output file
 */
function loadExistingHashes(): Record<string, UploadResult> {
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Could not load existing hashes: ${error.message}`);
      return {};
    }
  }
  return {};
}

/**
 * Save hashes to output file
 */
function saveHashes(hashes: Record<string, UploadResult>): void {
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(hashes, null, 2));
  console.log(`\n✅ Saved hashes to: ${OUTPUT_FILE}`);
}

/**
 * Main upload function
 */
async function main() {
  console.log('🚀 Starting IPFS image upload...\n');
  console.log(`📁 Images directory: ${IMAGES_DIR}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...\n`);

  // Get all image files
  const imageFiles = getImageFiles();
  console.log(`📸 Found ${imageFiles.length} images to upload\n`);

  if (imageFiles.length === 0) {
    console.log('❌ No images found to upload');
    process.exit(1);
  }

  // Load existing hashes (to skip already uploaded images)
  const existingHashes = loadExistingHashes();
  const filesToUpload = imageFiles.filter((file) => {
    const existing = existingHashes[file];
    return !existing || !existing.success;
  });

  if (filesToUpload.length === 0) {
    console.log('✅ All images already uploaded!');
    return;
  }

  console.log(`📤 Uploading ${filesToUpload.length} new images (${imageFiles.length - filesToUpload.length} already uploaded)\n`);

  const results: Record<string, UploadResult> = { ...existingHashes };
  let successCount = 0;
  let failCount = 0;

  // Upload in batches
  for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
    const batch = filesToUpload.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);

    console.log(`📦 Batch ${batchNumber}/${totalBatches} (${batch.length} images)`);

    // Upload all images in batch concurrently
    const batchPromises = batch.map((filename) => uploadImage(filename));
    const batchResults = await Promise.all(batchPromises);

    // Process results
    for (const result of batchResults) {
      results[result.filename] = result;
      
      if (result.success) {
        successCount++;
        console.log(`  ✅ ${result.filename} → ${result.hash}`);
      } else {
        failCount++;
        console.log(`  ❌ ${result.filename} → Error: ${result.error}`);
      }
    }

    // Save progress after each batch
    saveHashes(results);

    // Delay between batches (except for the last batch)
    if (i + BATCH_SIZE < filesToUpload.length) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📁 Total: ${imageFiles.length}`);
  console.log('='.repeat(60));

  // Show some example gateway URLs
  const successfulResults = Object.values(results).filter((r) => r.success);
  if (successfulResults.length > 0) {
    console.log('\n🔗 Example IPFS URLs:');
    successfulResults.slice(0, 3).forEach((result) => {
      console.log(`  ${result.filename}: ${result.gatewayUrl}`);
    });
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
