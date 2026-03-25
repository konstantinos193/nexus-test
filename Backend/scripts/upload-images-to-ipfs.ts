/**
 * Upload Images to IPFS
 * 
 * Script to upload all images from programs/fake-collection/images to IPFS
 * 
 * Usage:
 *   ts-node scripts/upload-images-to-ipfs.ts
 * 
 * Or with API key:
 *   API_KEY=your-key ts-node scripts/upload-images-to-ipfs.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface UploadResult {
  filename: string;
  hash: string;
  gatewayUrl: string;
  size: number;
  pinned: boolean;
  success: boolean;
  error?: string;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || '';
const IMAGES_DIR = path.join(__dirname, '../../programs/fake-collection/images');
const OUTPUT_FILE = path.join(__dirname, '../../programs/fake-collection/ipfs-uploads.json');

async function uploadImageToIpfs(filePath: string, filename: string): Promise<UploadResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    
    // Create a Blob from the buffer and append to FormData
    // Note: Blob and FormData are available in Node.js 18+
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('file', blob, filename);
    formData.append('pin', 'true');

    const headers: HeadersInit = {};
    if (API_KEY) {
      headers['x-api-key'] = API_KEY;
    }

    const response = await fetch(
      `${BACKEND_URL}/api/ipfs/upload/file`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.success) {
      return {
        filename,
        hash: data.data.hash,
        gatewayUrl: data.data.gatewayUrl,
        size: data.data.size,
        pinned: data.data.pinned,
        success: true,
      };
    } else {
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

async function main() {
  console.log('🚀 Starting image upload to IPFS...\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Images directory: ${IMAGES_DIR}`);
  console.log(`API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'Not set (may work if API_KEY not required)'}\n`);

  // Check if images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  // Get all PNG files
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(file => file.endsWith('.png'))
    .sort((a, b) => {
      // Sort numerically
      const numA = parseInt(a.replace('.png', '')) || 0;
      const numB = parseInt(b.replace('.png', '')) || 0;
      return numA - numB;
    });

  if (files.length === 0) {
    console.error('❌ No PNG files found in images directory');
    process.exit(1);
  }

  console.log(`📸 Found ${files.length} images to upload\n`);

  const results: UploadResult[] = [];
  let successCount = 0;
  let failCount = 0;

  // Upload each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(IMAGES_DIR, file);
    
    console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);
    
    const result = await uploadImageToIpfs(filePath, file);
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(`  ✅ Success! Hash: ${result.hash}`);
      console.log(`  🔗 Gateway: ${result.gatewayUrl}\n`);
    } else {
      failCount++;
      console.log(`  ❌ Failed: ${result.error}\n`);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save results to JSON file
  const output = {
    uploadDate: new Date().toISOString(),
    totalFiles: files.length,
    successCount,
    failCount,
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

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  console.log(`Total files: ${files.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`\n📄 Results saved to: ${OUTPUT_FILE}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n⚠️  Some uploads failed. Check the output file for details.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
