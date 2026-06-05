/**
 * Solana Configuration
 *
 * The ministry of network identity. This file looks at an environment variable,
 * squints, and decides which blockchain reality we're living in today.
 *
 * Configured for devnet by default — because defaulting to mainnet would be the
 * kind of confidence that ends careers and drains wallets simultaneously.
 *
 * The commitment levels available to us:
 *   "processed" — optimistic to the point of recklessness
 *   "confirmed"  — the Goldilocks level (default here, for obvious reasons)
 *   "finalized"  — paranoid, slow, correct. For when real money is involved.
 *
 * "The network is an env var. The env var is the network. The network is not a string.
 *  This file bridges that philosophical gap." — Juan
 */

// The Solana web3.js types.
// Cluster: the type that knows mainnet-beta, devnet, testnet — but NOT localnet.
// (localnet is not a Cluster in the Solana type system. It's a rebel. We handle it separately.)
// Connection: the actual socket to the RPC node that will define our day.
import { Cluster, Connection } from '@solana/web3.js';

/**
 * SolanaNetwork
 *
 * An extension of Solana's Cluster type that includes 'localnet' —
 * for the brave souls running a local validator on their laptop
 * while simultaneously running VS Code, Docker, and their browser with 47 tabs.
 * You know who you are.
 */
export type SolanaNetwork = 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet';

/**
 * SolanaConfig
 *
 * The shape of our network configuration. Everything the rest of the system needs
 * to know about "where are we and at what level of confirmation anxiety?"
 *
 * network:    The human-readable label. "mainnet-beta" when it matters for real.
 * rpcUrl:     The HTTP endpoint of the RPC node. The gateway to the chain.
 * cluster:    The @solana/web3.js Cluster type — always 'devnet' for localnet
 *             because the SDK doesn't recognize localnet as a first-class citizen.
 *             (Localnet: living in the shadow of devnet. A metaphor, perhaps.)
 * commitment: How final does a block need to be before we trust it?
 *             We default to "confirmed." We're cautious, not paranoid.
 */
export interface SolanaConfig {
  network: SolanaNetwork;
  rpcUrl: string;
  cluster: Cluster;
  commitment: 'processed' | 'confirmed' | 'finalized';
}

/**
 * getSolanaConfig
 *
 * The oracle. The configurator. The function that reads from the void (env vars)
 * and returns a structured object representing the network we trust today.
 *
 * Falls back to devnet if SOLANA_NETWORK is not set — because a system that silently
 * connects to mainnet on a missing env var is a system that eventually appears on
 * the "what went wrong" section of a post-mortem.
 *
 * The SOLANA_RPC_URL override lets you point at Helius, Triton, Alchemy, or any
 * other RPC provider whose rate limits you haven't yet exhausted this month.
 *
 * @returns {SolanaConfig} The configuration for the chosen network.
 *   Choose wisely. The choice is permanent on mainnet.
 */
export function getSolanaConfig(): SolanaConfig {
  // Read the network name from env. If it's not set, we're on devnet.
  // If it's set to something we don't recognize, we fall back to devnet too.
  // The chain of fallbacks is the only safety net we have. Cherish it.
  const network = (process.env.SOLANA_NETWORK || 'devnet') as SolanaNetwork;

  // Commitment level. "confirmed" is the safe default.
  // "processed" is for the adrenaline-seekers.
  // "finalized" is for the production systems managing other people's money.
  const commitment = (process.env.SOLANA_COMMITMENT || 'confirmed') as 'processed' | 'confirmed' | 'finalized';

  // The lookup table. One entry per network we support.
  // Each maps to its default RPC URL — overridable by SOLANA_RPC_URL.
  // (The public RPC nodes are free, shared, and rate-limited. Just like love.
  //  For production, use a private RPC node. Also like love.)
  const configs: Record<SolanaNetwork, Omit<SolanaConfig, 'commitment'>> = {
    // Devnet: free SOL airdrops, consequence-free experimentation.
    // The playground. The sandbox. The "this is fine" meme, but actually fine.
    devnet: {
      network: 'devnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      cluster: 'devnet',
    },
    // Testnet: slightly more serious devnet. Less traffic, more vibes.
    // Most teams skip this and go devnet → mainnet. Bravely. Sometimes foolishly.
    testnet: {
      network: 'testnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com',
      cluster: 'testnet',
    },
    // Mainnet-beta: real money, real consequences, real accountability.
    // "Beta" is still in the name. The blockchain keeps its options open.
    'mainnet-beta': {
      network: 'mainnet-beta',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      cluster: 'mainnet-beta',
    },
    // Localnet: a validator running on your machine. Chaos on demand. No rate limits.
    // Uses 'devnet' as the cluster type because the SDK doesn't know what localnet is.
    // (Localnet is not on the map. Localnet IS the map. For local development.)
    localnet: {
      network: 'localnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899',
      cluster: 'devnet', // Use devnet cluster type for localnet compatibility
    },
  };

  // Merge the base config with the commitment level and return.
  // If the network is unrecognized, fall back to devnet like the responsible adult we are.
  return {
    ...configs[network] || configs.devnet,
    commitment,
  };
}

/**
 * createSolanaConnection
 *
 * Factory function for the Connection object. Reads current config,
 * points at the RPC URL, and commits to a commitment level.
 *
 * Called once per module init. The resulting Connection object is then
 * passed around like a sacred relic. (Do not create multiple connections.
 * You have a perfectly good connection. Use the one you have. Like most things in life.)
 *
 * @returns {Connection} A fresh Connection to the configured RPC endpoint.
 */
export function createSolanaConnection(): Connection {
  const config = getSolanaConfig();
  // One connection. One URL. One commitment to a level of confirmation anxiety.
  // Born here. Passed to SolanaService. Lives there forever. Never truly dies.
  return new Connection(config.rpcUrl, config.commitment);
}

/**
 * getCurrentNetwork
 *
 * Returns the name of the network we're currently configured for.
 * Useful in logging statements that begin with "wait, are we on mainnet right now?"
 *
 * @returns {SolanaNetwork} The network name. May be humbling.
 */
export function getCurrentNetwork(): SolanaNetwork {
  return getSolanaConfig().network;
}

/**
 * isDevnet
 *
 * The question we ask before every irresponsible experiment.
 * "Is this devnet? Yes? Great, proceed. No? Put the keyboard down."
 *
 * @returns {boolean} true if we're on devnet. true = free SOL. false = consequences.
 */
export function isDevnet(): boolean {
  return getCurrentNetwork() === 'devnet';
}

/**
 * isMainnet
 *
 * The solemn check. The "are you sure about this?" function.
 * Call this before any logic that should only run in production.
 * Feature flags, irreversible operations, anything that touches
 * real-money accounts. Because mainnet doesn't have a staging environment.
 * Mainnet IS the staging environment. (Unfortunately.)
 *
 * @returns {boolean} true if we're on mainnet-beta. Breathe. Double-check your .env.
 */
export function isMainnet(): boolean {
  return getCurrentNetwork() === 'mainnet-beta';
}

/**
 * isLocalnet
 *
 * The cowboy check. Are we running a local validator? Are we testing
 * from first principles on our own machine with no rate limits and
 * infinitely airdrop-able SOL?
 *
 * If yes: welcome to paradise. Please still write tests.
 *
 * @returns {boolean} true if we're on localnet. Local validator life.
 */
export function isLocalnet(): boolean {
  return getCurrentNetwork() === 'localnet';
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This file does one thing: figure out which blockchain we're attached to
// and make that information available to the rest of the codebase.
//
// It is, paradoxically, the most important file in this module.
// Point it at mainnet with the wrong RPC URL and the whole thing silently
// falls apart. Point it at devnet and nothing real happens. Ever.
// The difference is one env var. One string. Three letters: "dev" vs "mai".
//
// The blockchain is permanent.
// Your environment variables are not.
// Set them correctly. Write them down. Tell someone where they are.
// On-chain mistakes outlive the engineers who made them.
//
//  — Juan, Network Whisperer, Env Var Archaeologist, Devnet Survivor
// ─────────────────────────────────────────────────────────────────────────────
