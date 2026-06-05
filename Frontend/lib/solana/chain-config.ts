/**
 * chain-config.ts - Fetches Solana config from the backend at runtime.
 * No hardcoded program IDs. No hardcoded RPC URLs. No NEXT_PUBLIC_ env vars for chain stuff
 * (except NEXT_PUBLIC_BACKEND_URL — the one URL the frontend needs to know where to call).
 * The backend knows what environment it's in and tells the frontend what to use.
 *
 * How to switch networks: change SOLANA_NETWORK and PROGRAM_ID on the backend.
 * The frontend picks it up automatically on the next request. Done.
 *
 * @author Juan - The developer who stopped baking chain config into the frontend build
 * (Because rebuilding the frontend to switch from localnet to mainnet is a sin)
 */

// Shape of what GET /api/solana/config returns.
// Keep in sync with SolanaService.getClientConfig() on the backend.
export interface ChainConfig {
  network: 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';
  rpcUrl: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  programId: string;
  platformFeeBps: number;
  platformWallet: string;
  feeModel: 'additive' | 'subtractive';
}

// Module-level cache — fetched once per app lifecycle.
// In Next.js SSR, this resets per worker restart (which is fine — env vars don't change mid-run).
// On the client side, this persists for the tab's lifetime.
let cached: ChainConfig | null = null;
let inFlight: Promise<ChainConfig> | null = null;

/**
 * Returns the chain config from the backend.
 * First call fetches; all subsequent calls return the cached result.
 * Concurrent calls during the first fetch share the same in-flight request.
 */
export async function getChainConfig(): Promise<ChainConfig> {
  if (cached) return cached;

  // De-duplicate concurrent calls — one fetch, many consumers
  if (!inFlight) {
    inFlight = fetchChainConfig();
  }

  cached = await inFlight;
  inFlight = null;
  return cached;
}

/**
 * Synchronous accessor for after getChainConfig() has been awaited.
 * Throws if called before the config has been fetched — that's a programmer error.
 * (Don't call this before awaiting getChainConfig() somewhere up the tree.)
 */
export function getChainConfigSync(): ChainConfig {
  if (!cached) {
    throw new Error(
      'Chain config not loaded yet. Await getChainConfig() before calling getChainConfigSync().'
    );
  }
  return cached;
}

/** Clear the cache — useful in tests or if you need to force a re-fetch. */
export function clearChainConfigCache() {
  cached = null;
  inFlight = null;
}

async function fetchChainConfig(): Promise<ChainConfig> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${backendUrl}/api/solana/config`, {
    cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch chain config: ${res.status} ${res.statusText}. ` +
      `Is the backend running?`
    );
  }

  const json = await res.json();

  if (!json.success || !json.data) {
    throw new Error(`Unexpected chain config response shape: ${JSON.stringify(json)}`);
  }

  return json.data as ChainConfig;
}
