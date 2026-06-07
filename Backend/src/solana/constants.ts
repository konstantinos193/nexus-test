/**
 * Solana Constants
 *
 * The single source of truth for the unified Nexus Launchpad program.
 * Previously three programs. Now one. Progress.
 *
 * One program ID. One env var. One less thing to mistype on mainnet launch day
 * while your hands are shaking and your Slack is on fire and the community
 * is asking "wen mint?" in seven languages.
 *
 * Everything else that used to live in three different constants files has been
 * consolidated here. Future developers: do not split this back up.
 * Unification took effort. Honor it.
 *
 * "The /api/solana/config endpoint assembles all of this and hands it to the frontend.
 *  The frontend no longer hard-codes any of it — it asks us. As it should." — Juan
 *
 * Network-specific values (RPC URL, commitment) live in solana.config.ts.
 * This file is for the things that don't change when you change networks.
 * (Except PROGRAM_ID, which changes when you deploy to a new network.
 *  Hence the env var. Hence the comment. Hence everything.)
 */

// ── Program Identity ──────────────────────────────────────────────────────────

/**
 * PROGRAM_ID
 *
 * The 32-byte base58-encoded address of the unified Nexus Launchpad on-chain program.
 * This is its name. This is its home. This is the thing the blockchain actually knows.
 *
 * Readable from PROGRAM_ID env var so that swapping between localnet, devnet, and
 * mainnet deployments requires exactly one config change and zero code changes.
 * This is called "doing it right." Treasure the feeling.
 *
 * The fallback default is the devnet deployment address.
 * If you're deploying to mainnet and this is still the default:
 * please stop, verify your .env file, and have a glass of water.
 * The chain will be here when you get back. It's not going anywhere.
 * (Because it can't. It's a blockchain. That's the whole point.)
 */
// The one program ID. Read from env so localnet vs mainnet is a config swap, not a deploy.
export const PROGRAM_ID =
  process.env.PROGRAM_ID || 'CzpjY2BnGvr97kJihy5DDAbExqu8Gqzz9j1U8RV5j7Cm';

// ── Fee Configuration ──────────────────────────────────────────────────────────

/**
 * PLATFORM_FEE_BPS
 *
 * The platform fee in basis points. 100 BPS = 1%.
 *
 * Additive model: charged on top of the creator's mint price.
 * Creator gets their price in full. We collect our 1% separately, on top.
 * Nobody is surprised. Nobody should be surprised. It's in the IDL.
 *
 * Formula:
 *   buyer_pays = mint_price + (mint_price × platform_fee_bps / 10_000)
 *   creator_receives = mint_price (in full)
 *   platform_receives = mint_price × platform_fee_bps / 10_000
 *
 * This constant is baked into the initialize_collection transaction,
 * encoded in Borsh, sent on-chain, and stored there.
 * Permanently. Because on-chain means permanent, unlike most things in life.
 *
 * Configurable via PLATFORM_FEE_BPS env var if someone at the company decides
 * 1% is too little or too much. (It is never too much. It is always too little.
 * This is the universal law of platform fees.)
 */
// Platform fee in basis points (100 = 1%). Additive model: charged on top of creator price.
// Buyer pays: mint_price + (mint_price × 1%). Creator receives mint_price in full.
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS) || 100;

// ── PDA Seeds ─────────────────────────────────────────────────────────────────

/**
 * PDA_SEEDS
 *
 * The seed string prefixes used to derive Program Derived Addresses.
 * These must match the seeds in the on-chain program (lib.rs) character for character,
 * byte for byte, comma for comma.
 *
 * If these drift from the Rust source:
 * - PDA derivation will return different addresses
 * - Transactions will target wrong accounts
 * - The program will error with confusing messages
 * - Someone will spend an afternoon staring at hex dumps
 * - That someone will be you, or Juan, or future Juan
 *
 * Do not rename these. Do not reorder the seeds. Do not add trailing spaces.
 * (Yes, trailing spaces would change the hash. The blockchain is that literal.
 *  The blockchain has no concept of "close enough.")
 *
 * Seeds used (see contracts.service.ts for full derivation logic):
 *   COLLECTION:   ["collection", authority]   → the creator's collection PDA
 *   REGISTRY:     ["registry"]               → global collection registry
 *   WALLET_MINT:  ["wallet_mint", coll, buyer] → per-wallet mint tracker
 *   URI:          ["uri", collection]         → optional metadata URI storage
 *   SPLIT:        ["split", collection]       → optional mint revenue split config
 */
// PDA seed prefixes — must match the on-chain program seeds exactly.
// If these ever drift from lib.rs, PDA derivation breaks silently. Don't touch.
export const PDA_SEEDS = {
  COLLECTION:  'collection',
  REGISTRY:    'registry',
  WALLET_MINT: 'wallet_mint',
  URI:         'uri',
  SPLIT:       'split',
} as const;

// ── Treasury ───────────────────────────────────────────────────────────────────

/**
 * PLATFORM_WALLET
 *
 * The treasury wallet address that receives the 1% additive platform fee
 * on every single mint across every single collection, forever, on-chain.
 *
 * This wallet is set during collection initialization and baked into the
 * on-chain account data. It cannot be changed retroactively for a collection
 * that already exists. Because on-chain means permanent. Because immutability
 * is not a philosophy here — it is a technical constraint enforced by validators
 * running on thousands of machines across the planet simultaneously.
 *
 * Guard this address. Verify it before mainnet deploy.
 * Copy-paste errors involving this address have no undo button.
 * (The clipboard does not care. The blockchain does not care. Only Juan cares.
 *  And Juan will not be there to save you at 2am when you notice.)
 *
 * Configurable via PLATFORM_WALLET env var.
 */
// NeXus Fees treasury wallet — receives the 1% additive platform fee on every mint.
export const PLATFORM_WALLET =
  process.env.PLATFORM_WALLET || '3AzX51N4sqmT46hgeQqhr9t1x2DsauWRcVvHUHqc78bt';

// ── External Program Addresses ─────────────────────────────────────────────────

/**
 * MPL_CORE_PROGRAM_ID
 *
 * The Metaplex Core program address — used for Core collection creation.
 * Stable across devnet, testnet, and mainnet-beta.
 *
 * Configurable via MPL_CORE_PROGRAM_ID env var for localnet deployments.
 * The mainnet address is the production MPL Core program.
 */
// Metaplex Core program — used for Core standard NFT collections.
export const MPL_CORE_PROGRAM_ID =
  process.env.MPL_CORE_PROGRAM_ID || 'CoREENxT6tW1HoK8ypYmtXvZApgjbpa9xcfc1mpRj9DA';

/**
 * TOKEN_METADATA_PROGRAM_ID
 *
 * The Metaplex Token Metadata program address.
 * Stable across devnet, testnet, and mainnet-beta — one of the few constants
 * in this ecosystem that actually stays constant.
 *
 * Used when minting NFTs that need to attach metadata (name, symbol, URI, royalties)
 * to the token's mint account. The backbone of Solana NFT infrastructure since before
 * most of us arrived here.
 *
 * This value should never change. If Metaplex ever migrates to a new program ID,
 * the entire NFT ecosystem will know. You will hear it. Like a disturbance in the Force,
 * but louder and more expensive.
 */
// Token metadata program (Metaplex) — stable across all networks.
export const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

// ── Transaction Configuration ──────────────────────────────────────────────────

/**
 * MAX_TRANSACTION_RETRIES
 *
 * How many times we try to submit a transaction before accepting that
 * the blockchain has decided this particular interaction is not meant to be.
 *
 * Three tries. Three chances. Three small moments of hope before we give up
 * and return an error to the frontend, which will then show a red toast notification
 * to a user who will screenshot it and post it in Discord asking "is this normal?"
 *
 * (Three is the right number. One is hubris. Ten is a denial of reality.)
 */
// Transaction config
export const MAX_TRANSACTION_RETRIES = 3;

/**
 * RPC_TIMEOUT
 *
 * The number of milliseconds we wait for an RPC response before declaring
 * the endpoint has gone to a better place and throwing an error.
 *
 * 30 seconds. Long enough to be reasonable. Short enough to fail fast
 * and not leave the frontend hanging with a spinner that users will
 * interpret as "the site is broken" and tweet about.
 *
 * The RPC will sometimes take 29.9 seconds and succeed at the last moment,
 * like a friend who is always exactly 2 minutes late to every meeting.
 * We wait for them. We always wait for them. But only for 30 seconds.
 */
export const RPC_TIMEOUT = 30_000;

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// These constants are the bedrock. Change them carefully.
// Change them on mainnet even more carefully.
// Change PROGRAM_ID on mainnet and immediately tell everyone on the team.
//
// The program ID is permanent on-chain.
// The platform wallet is permanent per collection.
// The PDA seeds are permanent until you want to rewrite the smart contract.
//
// "Permanent" is not a word used loosely in this file.
// On-chain means permanent. Unlike most things in life.
// Unlike my confidence that the public RPC will handle our launch day traffic.
// Unlike the TypeScript types we keep promising to tighten up.
//
// But the blockchain? The blockchain is forever.
// And this constants file is its voice in our codebase.
//
//  — Juan, Keeper of the Sacred Addresses, Basis Point Accountant
// ─────────────────────────────────────────────────────────────────────────────
