/**
 * IPFS Configuration
 * 
 * Supports two modes:
 * 1. Local IPFS Node - Full control, runs IPFS daemon locally
 * 2. HTTP Client - Connects to existing IPFS node (local or remote)
 * 
 * For production, HTTP Client mode is recommended (connect to your own IPFS node)
 */

export interface IpfsConfig {
  // Mode: 'local' for local node, 'http' for HTTP client
  mode: 'local' | 'http';
  
  // HTTP Client Configuration (when mode = 'http')
  http?: {
    // IPFS node API endpoint (default: http://localhost:5001)
    apiUrl: string;
    // IPFS gateway URL for retrieving files (default: http://localhost:8080)
    gatewayUrl: string;
    // Optional: API key if your IPFS node requires authentication
    apiKey?: string;
  };
  
  // Local Node Configuration (when mode = 'local')
  local?: {
    // IPFS repo path (where to store IPFS data)
    repoPath?: string;
    // Enable experimental features
    experimental?: {
      pubsub?: boolean;
      sharding?: boolean;
    };
  };
  
  // Pinning configuration
  pinning?: {
    // Auto-pin uploaded files
    autoPin: boolean;
    // Pin timeout in milliseconds
    pinTimeout?: number;
  };
  
  // Gateway configuration for serving files
  gateway?: {
    // Public gateway URL (for sharing IPFS hashes)
    publicUrl: string;
    // Enable CORS
    enableCors?: boolean;
  };
}

export const defaultIpfsConfig: IpfsConfig = {
  mode: 'http',
  http: {
    apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
    gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
    apiKey: process.env.IPFS_API_KEY,
  },
  local: {
    repoPath: process.env.IPFS_REPO_PATH || './.ipfs',
  },
  pinning: {
    autoPin: true,
    pinTimeout: 30000, // 30 seconds
  },
  gateway: {
    publicUrl: process.env.IPFS_PUBLIC_GATEWAY_URL || 'https://ipfs.io/ipfs/',
    enableCors: true,
  },
};
