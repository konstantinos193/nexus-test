/**
 * IPFS Configuration
 *
 * The single source of truth for how this application thinks about IPFS.
 * Everything from "where is the node?" to "should we pin things automatically?"
 * to "what gateway do we use to serve files like a civilized HTTP application?"
 *
 * Supports two modes, one of which actually works:
 * 1. HTTP Client Mode — connects to an existing Kubo IPFS node via its HTTP API.
 *    Recommended for production. Recommended for development. Recommended for everything.
 *    This is the mode that exists and functions and has been tested by real humans.
 *
 * 2. Local IPFS Node Mode — runs an IPFS daemon locally, managed by this service.
 *    Not yet implemented. Future Juan's problem. Current Juan's footnote.
 *
 * For production: use HTTP Client mode pointing at your own Kubo node.
 * (Not the public gateway. Your own node. You own the NFTs, own the infra.)
 */

/**
 * IpfsConfig
 *
 * The type contract for all IPFS-related configuration.
 * All fields except `mode` are optional objects, because not every mode
 * needs every config block. TypeScript appreciates this thoughtfulness.
 * Juan also appreciates it. Slightly.
 */
export interface IpfsConfig {
  /**
   * Mode: 'http' for connecting to an existing Kubo node's HTTP API.
   *       'local' for managing a local daemon (aspirational; not yet implemented).
   * Default: 'http'. Always 'http'. Please use 'http'.
   */
  mode: 'local' | 'http';

  /**
   * HTTP Client Configuration — used when mode = 'http'.
   * This is the real config. The one that matters. The one that runs in Docker.
   */
  http?: {
    /**
     * IPFS node API endpoint. Where the Kubo HTTP API is listening.
     * Default: http://localhost:5001
     * Docker default: http://ipfs:5001 (the service name inside the compose network)
     * Classic mistake: forgetting to change localhost to the Docker service name.
     * Classic consequence: nothing uploads and no one knows why until 3am.
     */
    apiUrl: string;

    /**
     * IPFS gateway URL for retrieving files via HTTP.
     * Default: http://localhost:8080
     * This is the URL used to preview files in a browser — not the API URL.
     * Different port. Different purpose. Same node. Don't mix them up.
     */
    gatewayUrl: string;

    /**
     * Optional API key if your IPFS node requires authorization.
     * Most local/private nodes don't need this. Public nodes sometimes do.
     * Leave empty unless your node specifically demands it.
     */
    apiKey?: string;
  };

  /**
   * Local Node Configuration — used when mode = 'local'.
   * Future Juan will fill this in. Current Juan is busy with http mode.
   */
  local?: {
    /**
     * File system path where the IPFS repository (the data store) lives.
     * Default: ./.ipfs (relative to process cwd)
     * This directory will grow. Possibly without warning. Plan your disk space.
     */
    repoPath?: string;

    /**
     * Experimental IPFS features. Enable with caution.
     * "Experimental" in software means "it might work, but we make no promises."
     */
    experimental?: {
      /** Enable pubsub — decentralized pub/sub messaging. Fun at parties. */
      pubsub?: boolean;
      /** Enable sharding — for very large directories. Rarely needed. */
      sharding?: boolean;
    };
  };

  /**
   * Pinning Configuration — controls whether and how files are pinned after upload.
   * Pinned files are preserved. Unpinned files are eventually garbage-collected.
   * This distinction separates "permanent storage" from "we'll see how that goes."
   */
  pinning?: {
    /**
     * Auto-pin every uploaded file immediately after adding.
     * Default: true — because uploading without pinning is equivalent to
     * writing on a whiteboard and hoping no one erases it.
     */
    autoPin: boolean;

    /**
     * How long to wait for a pin operation before giving up, in milliseconds.
     * Default: 30000 (30 seconds)
     * A pin that takes longer than 30 seconds either has a very large DAG
     * or a very tired node. Both deserve investigation.
     */
    pinTimeout?: number;
  };

  /**
   * Gateway Configuration — controls how IPFS content URLs are constructed
   * for public consumption by browsers, marketplaces, and the generally curious.
   */
  gateway?: {
    /**
     * The public-facing gateway URL used for generating shareable file links.
     * Default: https://ipfs.io/ipfs/ (Protocol Labs' public gateway — reliable, but slow)
     * For production with real traffic: use your own gateway or a pinning service's CDN.
     * (ipfs.io has rate limits and, more importantly, feelings about load.)
     */
    publicUrl: string;

    /**
     * Enable CORS on gateway responses.
     * Default: true — because the browser refuses to load IPFS resources otherwise
     * and no amount of existential negotiation will change its mind.
     */
    enableCors?: boolean;
  };
}

/**
 * defaultIpfsConfig
 *
 * The fallback config when environment variables are too shy to show up.
 * Sensible defaults for local development — assumes Kubo is running on localhost
 * and you haven't configured anything exotic.
 *
 * For production: set every env variable explicitly. Do not rely on these defaults.
 * The defaults are for "I just cloned this and want to run it locally."
 * They are not for "I deployed this to a server and hope for the best."
 */
export const defaultIpfsConfig: IpfsConfig = {
  // HTTP mode: the only mode that works. We are committed to this path.
  mode: 'http',

  http: {
    // Default API URL: localhost:5001 — Kubo's default HTTP API port
    // Override with IPFS_API_URL env var in Docker or production
    apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',

    // Default gateway URL: localhost:8080 — Kubo's default gateway port
    // Override with IPFS_GATEWAY_URL env var for external gateway access
    gatewayUrl: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',

    // No API key by default — most local Kubo installs don't require one
    // Set IPFS_API_KEY if your node is configured with authorization
    apiKey: process.env.IPFS_API_KEY,
  },

  local: {
    // Default repo path: ./.ipfs relative to process.cwd()
    // This is the local IPFS daemon mode's storage location (not yet implemented, but configured)
    repoPath: process.env.IPFS_REPO_PATH || './.ipfs',
  },

  pinning: {
    // Auto-pin is ON by default. This is not negotiable. We pin. We always pin.
    // Data that isn't pinned is data that may quietly vanish. We have been warned.
    autoPin: true,

    // 30 seconds. If the pin takes longer, something is wrong with the node or the network.
    // 30000 ms = 30 s = the maximum patience Juan will extend to a stubborn IPFS node.
    pinTimeout: 30000,
  },

  gateway: {
    // Public gateway default: ipfs.io — the classic, the familiar, the occasionally slow.
    // Override with IPFS_PUBLIC_GATEWAY_URL for your own infra or a CDN-backed pinning service.
    publicUrl: process.env.IPFS_PUBLIC_GATEWAY_URL || 'https://ipfs.io/ipfs/',

    // CORS: enabled. The browser demands it. We comply. Gracefully.
    enableCors: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Config architect, env variable wrangler, opponent of hardcoded secrets
// Note: Every time someone hardcodes an IPFS URL instead of using this config,
//       a node somewhere loses a CID. (Not actually true. But it feels true.)
// Reminder: .env.example exists. Fill it in. Read it. Respect it.
// ─────────────────────────────────────────────────────────────────────────────
