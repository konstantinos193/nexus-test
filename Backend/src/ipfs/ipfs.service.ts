/**
 * IPFS Service
 *
 * The engine room. The actual worker. The one doing all the heavy lifting while
 * the controller takes bows and accepts HTTP requests.
 *
 * Handles all IPFS operations via the Kubo HTTP API using nothing but native fetch —
 * no ESM-only packages, no existential dependency crises, no npm install surprises at 2am.
 * Works in CJS/Docker and connects to an existing IPFS node (e.g. ipfs/kubo in Docker).
 *
 * Supports: upload, pin, unpin, retrieve, directory upload, metadata fetching,
 *           and the occasional prayer that the node is actually running.
 *
 * The data we upload here lives permanently in the decentralized web.
 * "Permanently" means "as long as someone is pinning it." That someone is us.
 * Do not let the node garbage-collect what you paid gas fees to mint.
 */

// NestJS plumbing — the lifecycle hooks are how we initialize without crashing everything.
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// ConfigService: reads our .env so we don't have to hardcode secrets like it's 2012.
import { ConfigService } from '@nestjs/config';

// Our own config types — because an untyped config object is just JSON with self-esteem issues.
import { IpfsConfig, defaultIpfsConfig } from './ipfs.config';

/**
 * Minimal HTTP client state: just the base URL and optional API key.
 * We don't need a full IPFS client library. We have fetch. We have courage.
 * (Mostly fetch.)
 */
interface IpfsHttpState {
  baseUrl: string;  // Where the Kubo HTTP API lives (usually http://localhost:5001)
  apiKey?: string;  // Optional: for IPFS nodes that put up a password (good for them)
}

/**
 * IpfsService
 *
 * The service that dares to speak HTTP to a Kubo node and ask it to please
 * store our NFT data in the peer-to-peer void. It honors two lifecycle events:
 * - OnModuleInit: connect to the IPFS node when the app boots
 * - OnModuleDestroy: let go gracefully when the app shuts down
 *
 * All mutations are async. All operations can fail. Plan accordingly.
 */
@Injectable()
export class IpfsService implements OnModuleInit, OnModuleDestroy {
  /** The diary that gets very verbose when things break. */
  private readonly logger = new Logger(IpfsService.name);

  /** Current HTTP state — null means we're not connected, which is very bad. */
  private state: IpfsHttpState | null = null;

  /** The full IPFS config, loaded once from environment on construction. */
  private config: IpfsConfig;

  /**
   * Flag: true only when we have successfully shaken hands with the IPFS node.
   * isInitialized = false is not a vibe. It is a crisis.
   */
  private isInitialized = false;

  /**
   * Constructor: load config immediately, before NestJS even finishes making coffee.
   * Actual IPFS connection happens in onModuleInit where async is allowed.
   */
  constructor(private configService: ConfigService) {
    // Load config at construction time — we want to know what we're dealing with early.
    this.config = this.loadConfig();
  }

  /**
   * loadConfig
   *
   * Reads all IPFS-related environment variables and assembles them into a typed
   * IpfsConfig object. Falls back to sane defaults wherever the env is silent.
   * (The env is often silent. Like a Monday morning dev who hasn't had coffee yet.)
   *
   * @returns A fully populated IpfsConfig — the service's operational blueprint
   */
  private loadConfig(): IpfsConfig {
    // IPFS_MODE defaults to 'http' — local node mode exists in the config type but
    // has not been implemented yet. That's a future Juan problem.
    const mode = (this.configService.get<string>('IPFS_MODE') || 'http') as 'local' | 'http';
    return {
      mode,
      http: {
        // The API endpoint for Kubo — must be accessible from this process. Classic Docker gotcha.
        apiUrl: this.configService.get<string>('IPFS_API_URL') || defaultIpfsConfig.http!.apiUrl,
        // The gateway URL for serving files to the public — the IPFS CDN, essentially.
        gatewayUrl: this.configService.get<string>('IPFS_GATEWAY_URL') || defaultIpfsConfig.http!.gatewayUrl,
        // Optional API key — only if your node was configured with authorization. Bless it.
        apiKey: this.configService.get<string>('IPFS_API_KEY'),
      },
      local: {
        // Repo path for local IPFS daemon — again, future Juan's problem.
        repoPath: this.configService.get<string>('IPFS_REPO_PATH') || defaultIpfsConfig.local!.repoPath,
      },
      pinning: {
        // Auto-pin by default — because content that isn't pinned is content with an expiry date.
        autoPin: this.configService.get<boolean>('IPFS_AUTO_PIN') ?? defaultIpfsConfig.pinning!.autoPin,
        // Pin timeout in milliseconds. 30 seconds. If it takes longer, something is wrong.
        pinTimeout: Number(this.configService.get('IPFS_PIN_TIMEOUT')) || defaultIpfsConfig.pinning!.pinTimeout || 30000,
      },
      gateway: {
        // The public-facing gateway — what marketplaces and browsers will use to fetch your NFTs.
        publicUrl: this.configService.get<string>('IPFS_PUBLIC_GATEWAY_URL') || defaultIpfsConfig.gateway!.publicUrl,
        // CORS: enabled by default because the browser ecosystem demands it.
        enableCors: this.configService.get<boolean>('IPFS_GATEWAY_CORS') ?? defaultIpfsConfig.gateway!.enableCors,
      },
    };
  }

  /**
   * onModuleInit
   *
   * NestJS calls this after the module is fully wired up. This is where we attempt
   * to connect to the IPFS node. If it fails, we log the error and move on —
   * we don't crash the whole app, because other features (Solana, DB) may still work.
   * (The IPFS node can recover later. Hopefully. We're praying.)
   */
  async onModuleInit() {
    try {
      // Attempt to initialize — connect to node, verify it's alive, mark as ready.
      await this.initialize();
      this.logger.log('IPFS service initialized successfully');
    } catch (error: any) {
      // Initialization failed. The node may not be running. Log it; don't crater the process.
      this.logger.error(`Failed to initialize IPFS service: ${error.message}`, error.stack);
    }
  }

  /**
   * onModuleDestroy
   *
   * Called when the application is shutting down — gracefully, one hopes.
   * We null out our state because a zombie IPFS connection helping nobody.
   */
  async onModuleDestroy() {
    // Release the state. Let the garbage collector have it. It's over.
    this.state = null;
    this.isInitialized = false;
    this.logger.log('IPFS service shutting down');
  }

  /**
   * initialize
   *
   * Routes to the correct initialization strategy based on config mode.
   * Currently only HTTP mode is implemented. Local mode is a future feature —
   * or a future regret, depending on how that goes.
   */
  private async initialize(): Promise<void> {
    if (this.config.mode !== 'http') {
      // Local IPFS node mode: someone had ambitious plans. Those plans have not been executed yet.
      throw new Error('Local IPFS node mode not yet implemented. Use HTTP client mode.');
    }
    // HTTP mode: the only mode that actually works. One job. Doing it.
    await this.initializeHttpClient();
  }

  /**
   * ipfsPost
   *
   * The single HTTP function that all IPFS operations route through.
   * Constructs a POST request to the Kubo API, appends query params,
   * attaches the body, and handles the Bearer auth header if needed.
   *
   * Uses native fetch with an AbortSignal timeout — because we are not going to
   * wait forever for an IPFS node that has decided to go on a philosophical journey.
   *
   * @param command      - Kubo API command (e.g. 'add', 'pin/add', 'cat')
   * @param searchParams - URL query parameters (e.g. { arg: hash, type: 'recursive' })
   * @param body         - Request body (FormData for files, or nothing for simple commands)
   * @returns The raw fetch Response — caller is responsible for consuming it
   * @throws  If the HTTP status is not ok, throws with the Kubo error text
   */
  private async ipfsPost(
    command: string,
    searchParams: Record<string, string> = {},
    body?: FormData | Buffer | string | null,
  ): Promise<Response> {
    const s = this.state;
    // If state is null, we were never initialized (or we destroyed ourselves). Either way: bad.
    if (!s) throw new Error('IPFS service is not initialized.');

    // Build the URL: base + /api/v0/{command} + query params
    const url = new URL(`/api/v0/${command}`, s.baseUrl);
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));

    // Headers: add authorization if we have a key. The IPFS node may or may not care.
    const headers: Record<string, string> = {};
    if (s.apiKey) headers['Authorization'] = `Bearer ${s.apiKey}`;

    // Fire the request. AbortSignal ensures we don't hang indefinitely waiting for
    // a node that has gone quiet. The timeout is configured; default is 30 seconds.
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: body ? { ...headers } : { ...headers },
      body,
      signal: AbortSignal.timeout(Number(this.config.pinning!.pinTimeout) || 30000),
    });

    // If the status is not ok, extract the error text and throw. Kubo errors are usually helpful.
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`IPFS API ${command}: ${res.status} ${text}`);
    }

    return res;
  }

  /**
   * initializeHttpClient
   *
   * Establishes a connection to the Kubo HTTP API by calling /api/v0/id
   * and confirming a valid JSON response comes back.
   * If this succeeds, we consider the node live and set isInitialized = true.
   * If this fails, the service remains offline and isReady() returns false.
   */
  private async initializeHttpClient(): Promise<void> {
    const { apiUrl, apiKey } = this.config.http!;

    // Normalize: strip trailing slash so URL construction doesn't produce double slashes.
    const baseUrl = apiUrl.replace(/\/$/, '');
    this.state = { baseUrl, apiKey };

    try {
      // The handshake: call /id and confirm the node replies with something that looks like a node ID.
      const res = await this.ipfsPost('id', {});
      const id = await res.json() as Record<string, unknown>;
      // Kubo has inconsistent casing across versions. We check all of them because capitalism.
      this.logger.log(`Connected to IPFS node: ${id['ID'] ?? id['Id'] ?? id['id'] ?? 'ok'}`);
      this.isInitialized = true;
    } catch (error: any) {
      // Connection failed. The node is not home. Or it's there but not answering.
      this.logger.error(`Failed to connect to IPFS node: ${error.message}`, error.stack);
      // Reset state — a broken state is worse than no state.
      this.state = null;
      this.isInitialized = false;
      // Re-throw so onModuleInit can log it and the health endpoint can report 503.
      throw error;
    }
  }

  /**
   * isReady
   *
   * The single source of truth for whether this service can be trusted.
   * Returns true only if we successfully initialized AND have a live state object.
   * Unlike my motivation, which is never reliably present on Mondays.
   *
   * @returns true if the IPFS service is connected and operational
   */
  isReady(): boolean {
    return this.isInitialized && this.state !== null;
  }

  /**
   * uploadFile
   *
   * Uploads a single file (Buffer or string) to IPFS via multipart/form-data.
   * Uses CID version 1 (the modern, longer, base32-encoded format).
   * Optionally pins immediately after upload because we are not leaving things to chance.
   *
   * The Kubo /add response is NDJSON (newline-delimited JSON) —
   * we take only the first line which contains the uploaded file's metadata.
   *
   * @param file    - The file content as Buffer or string
   * @param options - filename, contentType, and pin preference
   * @returns hash, ipfs:// path, gateway URL, byte size, and pinned status
   */
  async uploadFile(
    file: Buffer | string,
    options?: { filename?: string; contentType?: string; pin?: boolean },
  ): Promise<{
    hash: string;
    path: string;
    gatewayUrl: string;
    size: number;
    pinned: boolean;
  }> {
    // First: are we alive? No service, no upload. No exceptions. (Pun intended.)
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }

    // Resolve pin preference: explicit option overrides config default.
    // Default is autoPin = true, because ghost data is not a feature.
    const pin = options?.pin ?? this.config.pinning!.autoPin;

    // Normalize file to Buffer — strings get UTF-8 encoded. Buffers pass through unchanged.
    const content = typeof file === 'string' ? Buffer.from(file) : file;
    const name = options?.filename || 'file';  // Filename fallback: 'file'. Creative. Timeless.

    // Build the multipart form. Kubo expects the file under the 'file' field.
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(content)]), name);

    // Request params: CID v1, no progress noise, pin if requested.
    const params: Record<string, string> = {
      'cid-version': '1',   // CIDv1: base32, more readable, better for the web
      progress: 'false',    // No progress events please; we're not watching a movie
    };
    if (pin) params.pin = 'true';

    // Fire the upload request and parse the NDJSON response.
    const res = await this.ipfsPost('add', params, form);
    const text = await res.text();

    // Take the first JSON line — for single-file uploads, it's the only one we need.
    const line = text.trim().split('\n')[0];
    if (!line) throw new Error('IPFS add returned empty response');

    const data = JSON.parse(line) as { Name: string; Hash: string; Size: string };
    const hash = data.Hash;                                   // The CID — the file's permanent identity
    const size = parseInt(data.Size, 10) || content.length;  // Byte size from Kubo, or fallback

    // Pin explicitly after upload, even if the add had pin=true.
    // Redundant? Maybe. But duplicate pinning never lost anyone data.
    let pinned = pin;
    if (pin) {
      try {
        await this.pin(hash);
        pinned = true;
      } catch (e: any) {
        // Pin failed — log the warning but don't throw. The file is still in IPFS.
        // It just may not survive garbage collection. Sleep lightly.
        this.logger.warn(`Failed to pin file ${hash}: ${e.message}`);
        pinned = false;
      }
    }

    this.logger.log(`File uploaded to IPFS: ${hash} (${size} bytes)`);
    return {
      hash,
      path: `ipfs://${hash}`,              // The canonical IPFS path — works in any IPFS-aware tool
      gatewayUrl: this.getGatewayUrl(hash), // The HTTP gateway URL — works in any browser
      size,
      pinned,
    };
  }

  /**
   * uploadDirectory
   *
   * Uploads multiple files as a single IPFS directory wrapped in a DAG node.
   * The last JSON line from Kubo is the root directory CID — the one hash to
   * represent them all. This base_uri format is what you put in your Solana program
   * as the collection's metadata root.
   *
   * File paths become entries in the directory. Name them correctly the first time.
   * The blockchain attic does not have a "rename" feature.
   *
   * @param entries - Array of { path, content } — the path is the filename in the directory
   * @param pin     - Whether to pin the resulting directory CID
   * @returns root hash, ipfs://{hash}/ base URI, gateway URL, pinned status
   */
  async uploadDirectory(
    entries: Array<{ path: string; content: Buffer }>,
    pin?: boolean,
  ): Promise<{ hash: string; baseUri: string; gatewayUrl: string; pinned: boolean }> {
    // Service must be alive. This check precedes every mutating operation. No exceptions.
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }

    // No files = no directory. Mathematics agrees with us here.
    if (!entries.length) throw new Error('No files provided for directory upload.');

    // Resolve pin preference from argument or fall back to config.
    const doPin = pin ?? this.config.pinning!.autoPin;

    // Build a multipart form where each entry is a file field.
    // Kubo will wrap them all in a directory node when wrap-with-directory=true.
    const form = new FormData();
    for (const e of entries) {
      form.append(e.path, new Blob([new Uint8Array(e.content)]), e.path);
    }

    // wrap-with-directory=true is the magic parameter — tells Kubo to create a directory node
    // over all the uploaded files. Without it, you just get separate CIDs and no base_uri.
    const params: Record<string, string> = {
      'wrap-with-directory': 'true',  // The crucial flag. Do not remove. Ever.
      'cid-version': '1',
      progress: 'false',
    };
    if (doPin) params.pin = 'true';

    const res = await this.ipfsPost('add', params, form);
    const text = await res.text();

    // Parse all NDJSON lines — the last one is the directory root (empty Name = '').
    const lines = text.trim().split('\n').filter(Boolean);
    if (!lines.length) throw new Error('IPFS add returned no results');

    // The last entry is always the directory wrapper. The files come before it.
    const last = JSON.parse(lines[lines.length - 1]) as { Name: string; Hash: string };
    const hash = last.Hash;

    // baseUri: the format that Solana contracts expect as the collection's content root.
    // Trailing slash is important — token IDs get appended: ipfs://{hash}/0.json
    const baseUri = `ipfs://${hash}/`;
    const gatewayUrl = this.getGatewayUrl(hash);

    // Explicit pin after directory add — same redundancy philosophy as uploadFile.
    let pinned = doPin;
    if (doPin) {
      try {
        await this.pin(hash);
        pinned = true;
      } catch (e: any) {
        // Directory pin failed. The directory exists but is not protected from GC.
        // This is the kind of thing that ruins mint days. Log it prominently.
        this.logger.warn(`Failed to pin directory ${hash}: ${e.message}`);
        pinned = false;
      }
    }

    this.logger.log(`Directory uploaded to IPFS: ${hash} (${entries.length} files), base_uri=${baseUri}`);
    return { hash, baseUri, gatewayUrl, pinned };
  }

  /**
   * uploadMetadata
   *
   * Serializes a metadata object to JSON and uploads it as a file named metadata.json.
   * This is the function that commits your NFT's identity — name, description, image —
   * to the decentralized void, permanently and irrevocably.
   *
   * Choose your metadata carefully. The blockchain has heard of "typo" but does not care.
   *
   * @param metadata - The NFT metadata object (name, description, image, attributes, etc.)
   * @param pin      - Whether to pin the metadata file (spoiler: always pin it)
   * @returns Same return shape as uploadFile — hash, path, gatewayUrl, size, pinned
   */
  async uploadMetadata(
    metadata: Record<string, any>,
    pin?: boolean,
  ): Promise<{ hash: string; path: string; gatewayUrl: string; size: number; pinned: boolean }> {
    // Serialize to pretty JSON — because readable JSON in IPFS is a form of respect.
    const jsonString = JSON.stringify(metadata, null, 2);

    // Delegate to uploadFile. Metadata is just a file with JSON inside.
    // (All of NFT culture, distilled to: "it's just a file with JSON inside.")
    return this.uploadFile(jsonString, {
      filename: 'metadata.json',
      contentType: 'application/json',
      pin: pin ?? this.config.pinning!.autoPin,  // Fallback to autoPin config
    });
  }

  /**
   * pin
   *
   * Issues a pin/add command to the Kubo node, instructing it to preserve
   * this CID in local storage indefinitely. Pinned content survives garbage
   * collection. Unpinned content does not. Survival is better. Pin things.
   *
   * @param hash - The CID to pin
   * @returns true on success
   * @throws if the IPFS node is unavailable or the pin command fails
   */
  async pin(hash: string): Promise<boolean> {
    // Check: is the service alive? Is the node listening? Is anyone home?
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    // Issue the pin order. The node must comply.
    await this.ipfsPost('pin/add', { arg: hash });
    this.logger.log(`File pinned: ${hash}`);
    return true;
  }

  /**
   * unpin
   *
   * Releases the node's hold on a CID. The content still exists globally (probably)
   * but this node will not actively preserve it. Use when you are intentionally
   * retiring content — not when you accidentally click the wrong button.
   *
   * @param hash - The CID to unpin (you're letting go; make peace with this)
   * @returns true on success
   * @throws if the IPFS node is unavailable or the unpin command fails
   */
  async unpin(hash: string): Promise<boolean> {
    // Service must be ready. Even letting go requires operational capacity.
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    // Issue the unpin command. The content is now free-range.
    await this.ipfsPost('pin/rm', { arg: hash });
    this.logger.log(`File unpinned: ${hash}`);
    return true;
  }

  /**
   * isPinned
   *
   * Checks whether a specific CID is currently pinned on this node.
   * The quiet, non-destructive cousin of pin and unpin — just checks, no side effects.
   * Returns false (not throws) if the node is unavailable or if the CID isn't found,
   * because ambiguity here is less catastrophic than an unhandled exception.
   *
   * @param hash - The CID to check
   * @returns true if pinned, false if not pinned or if we can't tell
   */
  async isPinned(hash: string): Promise<boolean> {
    // If the service isn't ready, we conservatively return false.
    // The hash might be pinned but we can't verify it. Close enough.
    if (!this.isReady()) return false;
    try {
      // Ask the node about pins matching this specific hash.
      const res = await this.ipfsPost('pin/ls', { arg: hash });
      const json = await res.json() as { Keys?: Record<string, { Type: string }> };
      const keys = json.Keys || {};
      // Match: the hash appears in the Keys map (exact match or substring — CIDv0/v1 conversions)
      return Object.keys(keys).some((k) => k === hash || k.includes(hash));
    } catch {
      // Any error here means we couldn't confirm pinning. Return false conservatively.
      // (Unknown pin status is not ideal, but it won't break anything. Probably.)
      return false;
    }
  }

  /**
   * listPins
   *
   * Returns the complete list of CIDs pinned on this node with their pin types.
   * 'recursive' type means the entire DAG subtree under that CID is pinned.
   * This is the most common type and the one you want.
   *
   * @returns Array of { cid, type } for every pinned hash on this node
   */
  async listPins(): Promise<Array<{ cid: string; type: string }>> {
    // Can't list what we can't access. Service must be ready.
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    // Request only recursive pins — these are the complete, usable pins.
    // Direct and indirect pins are internal bookkeeping; recursive is what you care about.
    const res = await this.ipfsPost('pin/ls', { type: 'recursive' });
    const json = await res.json() as { Keys?: Record<string, { Type: string }> };
    const keys = json.Keys || {};

    // Map the CID->type object into a clean array. More ergonomic for the caller.
    return Object.entries(keys).map(([cid, v]) => ({ cid, type: v?.Type || 'recursive' }));
  }

  /**
   * getFile
   *
   * Retrieves the raw byte content of a file from IPFS by CID.
   * Uses the Kubo /cat endpoint, which streams file content back as binary.
   * Returns a Buffer — the caller decides what to do with the bytes.
   *
   * Note: works on files, not directories. Passing a directory CID will cause
   * an error that the controller catches and translates to a helpful 404.
   *
   * @param hash - The CID of the file to retrieve
   * @returns Buffer containing the file's raw bytes
   */
  async getFile(hash: string): Promise<Buffer> {
    // Operational check. Always. Without exception.
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    // /cat streams the file contents. We collect the full body into an ArrayBuffer then Buffer.
    const res = await this.ipfsPost('cat', { arg: hash });
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  /**
   * getMetadata
   *
   * Fetches a file from IPFS and parses it as JSON — the metadata retrieval workhorse.
   * NFT marketplaces call this constantly (or the equivalent gateway URL) to display
   * your collection's name, description, image, and traits.
   * This is the most sacred of the service's operations. If this breaks, the NFTs become nameless.
   *
   * @param hash - The CID of the JSON metadata file
   * @returns Parsed metadata object — the soul of the NFT, in Record form
   * @throws if the file cannot be fetched or the contents are not valid JSON
   */
  async getMetadata(hash: string): Promise<Record<string, any>> {
    // Fetch the raw bytes from IPFS.
    const file = await this.getFile(hash);
    try {
      // Parse as UTF-8 JSON. If it's not valid JSON, someone uploaded the wrong file.
      return JSON.parse(file.toString('utf-8'));
    } catch (error: any) {
      // JSON.parse threw. The file exists but isn't valid JSON. Deeply unfortunate.
      throw new Error(`Failed to parse JSON from IPFS hash ${hash}: ${error.message}`);
    }
  }

  /**
   * getGatewayUrl
   *
   * Converts an IPFS CID into a full HTTP URL via the configured public gateway.
   * The result is what browsers, marketplaces, and normal humans use to access IPFS content.
   * The gateway is the civilized interface between IPFS and the HTTP web.
   *
   * @param hash - The CID to construct a gateway URL for
   * @returns Full HTTP URL: e.g. https://ipfs.io/ipfs/Qm...
   */
  getGatewayUrl(hash: string): string {
    const gatewayUrl = this.config.gateway!.publicUrl;
    // Ensure exactly one slash between gateway base and hash. OCD? Maybe. Correct? Yes.
    const base = gatewayUrl.endsWith('/') ? gatewayUrl : `${gatewayUrl}/`;
    return `${base}${hash}`;
  }

  /**
   * getIpfsPath
   *
   * Converts a CID into the canonical ipfs:// URI format.
   * Used internally; not the URL humans put in browsers, but the one protocols understand.
   *
   * @param hash - The CID to convert
   * @returns ipfs://{hash}
   */
  getIpfsPath(hash: string): string {
    return `ipfs://${hash}`;
  }

  /**
   * extractHash
   *
   * Extracts the bare CID from a variety of URL and URI formats.
   * Because IPFS hashes arrive wrapped in ipfs:// URIs, gateway URLs, and
   * occasionally raw strings, depending on who wrote the upstream code
   * and how much coffee they'd had.
   *
   * Handles:
   * - ipfs://{hash}       → hash
   * - https://gateway/ipfs/{hash} → hash
   * - bare hash           → hash (passthrough)
   *
   * @param pathOrUrl - The CID in any format that ever existed
   * @returns The bare CID string, stripped of protocol cruft
   */
  extractHash(pathOrUrl: string): string {
    // ipfs:// prefix: just strip the protocol and trailing slash.
    if (pathOrUrl.startsWith('ipfs://')) {
      return pathOrUrl.replace('ipfs://', '').replace(/\/$/, '');
    }
    // Gateway URL: extract the CID from the /ipfs/{hash} path segment.
    const m = pathOrUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (m) return m[1];
    // Already a bare hash, or something we don't recognize. Return as-is and pray.
    return pathOrUrl;
  }

  /**
   * getNodeInfo
   *
   * Returns the IPFS node's identity information — peer ID, multiaddresses,
   * agent version, and protocol version. The node's business card.
   * Useful for health checks, debugging, and knowing which version of Kubo
   * is currently mediating our relationship with the decentralized web.
   *
   * @returns Node identity object — id, addresses, agentVersion, protocolVersion
   */
  async getNodeInfo(): Promise<{
    id: string;
    addresses: string[];
    agentVersion: string;
    protocolVersion: string;
  }> {
    // Operational check. The /id endpoint is useless if we're not connected.
    if (!this.isReady()) {
      throw new Error('IPFS service is not initialized. Check your IPFS node is running.');
    }
    // Call /id — the universal IPFS node identity endpoint.
    const res = await this.ipfsPost('id', {});
    const id = await res.json() as Record<string, unknown>;

    // Kubo uses different casing across versions (ID, Id, id — pick your favorite).
    // We check all three because the API is a special kind of chaotic.
    const idStr = (id.ID ?? id.Id ?? id.id ?? '') as string;
    const addrs = (id.Addresses ?? id.addresses ?? []) as string[];

    return {
      id: String(idStr),
      addresses: Array.isArray(addrs) ? addrs.map(String) : [],
      agentVersion: (id.AgentVersion ?? id.agentVersion ?? 'unknown') as string,
      protocolVersion: (id.ProtocolVersion ?? id.protocolVersion ?? 'unknown') as string,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: IPFS whisperer, Kubo HTTP client artisan, guardian of the permanent record
// Philosophy: All data is temporary unless someone is pinning it.
//             We pin. We always pin. Pinning is hope materialized.
// Note: The IPFS node is running in Docker. If things break, it is probably
//       the Docker network. It is always the Docker network.
//       (It is not always the Docker network. But check it first anyway.)
// ─────────────────────────────────────────────────────────────────────────────
