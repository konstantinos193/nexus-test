/**
 * Solana Service
 *
 * The beating heart of our blockchain integration. (Or, if you're being realistic,
 * the anxious intern perpetually on hold with the RPC endpoint.)
 *
 * This service owns the Connection. It manages config. It answers the controller's
 * questions about balances, blockhashes, transactions, and the general state of
 * an immutable ledger that was carved into existence and cannot be uncarved.
 *
 * Implements OnModuleInit so it wakes up exactly once, connects to the chain,
 * logs a hopeful message, and waits for someone to ask it something.
 * Much like the rest of us on a Monday morning.
 *
 * "The blockchain never sleeps. Neither does this service. Unlike my motivation,
 *  which is rarely visible before 10am." — Juan
 */

// The NestJS survival kit: Injectable for DI, OnModuleInit for the startup ritual,
// Logger for screaming into structured output instead of the void.
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

// The Solana web3.js core imports.
// Connection: the lifeline to the RPC. PublicKey: a 32-byte address that costs
// absolutely nothing to create and everything to lose. Commitment: our anxiety level.
import { Connection, PublicKey, Commitment } from '@solana/web3.js';

// Our config utilities — the layer between env vars and actual usable types.
// Because process.env.SOLANA_NETWORK is a string. The blockchain is not a string.
import { createSolanaConnection, getSolanaConfig, isDevnet } from './solana.config';

// The single source of truth for program identity and fee parameters.
// One program ID. One fee rate. One treasury wallet. A rare simplicity.
import { PROGRAM_ID, PLATFORM_FEE_BPS, PLATFORM_WALLET } from './constants';

/**
 * @injectable SolanaService
 *
 * Singleton service. Created once. Lives forever. Carries the Connection object
 * through the application lifecycle like a torch in a cave.
 *
 * If this service fails to initialize, nothing blockchain-related works.
 * The entire module becomes a decorative module. Beautiful, but useless.
 * So — pray the RPC URL is correct in your env file.
 */
@Injectable()
export class SolanaService implements OnModuleInit {
  // The logger: our only way of confirming the service is alive and relatively functional.
  // Because console.log is for amateurs and the blockchain doesn't answer DMs.
  private readonly logger = new Logger(SolanaService.name);

  // The Connection object. Our tether to Solana. Our reason for being here.
  // Private because nobody else gets to touch our RPC connection. Boundaries matter.
  // (On-chain data is for everyone. Our Connection instance is not.)
  private connection: Connection;

  // Config loaded at construction time. Static by design — if the network changes
  // mid-flight, that's a deployment event, not a runtime concern.
  // (Hot-swapping your blockchain config mid-run is the web3 equivalent of
  //  changing a tire while moving. Nobody recommends it.)
  private config = getSolanaConfig();

  /**
   * onModuleInit
   *
   * Called once, when NestJS decides this module is ready to face the world.
   * Creates the RPC connection, logs the chosen network, and accepts its fate.
   *
   * If SOLANA_RPC_URL is wrong, you'll find out here.
   * If SOLANA_NETWORK is mistyped, you'll find out here.
   * If the RPC is down, you'll find out slightly later, when the first real call fails.
   * Surprise is part of the blockchain experience.
   */
  onModuleInit() {
    // The one true connection. Born here. Used everywhere. Never truly destroyed.
    this.connection = createSolanaConnection();
    // Log the network so we know which chain we're attached to.
    // "mainnet-beta" means real money. "devnet" means learning opportunities.
    this.logger.log(`Solana service initialized on ${this.config.network}`);
    // Log the RPC URL so future Juan can grep the logs and figure out why things broke.
    this.logger.log(`RPC URL: ${this.config.rpcUrl}`);
  }

  /**
   * getConnection
   *
   * Returns the Solana Connection instance.
   * Other services (looking at you, ContractsService) use this to avoid
   * spinning up their own connections. One connection to rule them all.
   * Efficiency. Elegance. A shared socket to a distributed ledger.
   *
   * @returns {Connection} The live RPC connection. Handle with care.
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * getConfig
   *
   * Returns the current Solana config — network name, RPC URL, commitment level.
   * Useful when other parts of the system want to know what reality they're operating in.
   * (Devnet reality: play money. Mainnet reality: please don't make typos.)
   *
   * @returns {SolanaConfig} The config object born at startup.
   */
  getConfig() {
    return this.config;
  }

  /**
   * isValidAddress
   *
   * Validates whether a given string can be parsed as a Solana PublicKey.
   * Uses the "try-and-see" approach, which is the time-honored tradition of
   * asking forgiveness rather than permission. (The blockchain does not forgive,
   * but TypeScript try/catch at least absorbs the blast radius.)
   *
   * @param {string} address - The string to test against PublicKey's parser.
   * @returns {boolean} true if valid, false if someone passed us their Discord username.
   */
  isValidAddress(address: string): boolean {
    try {
      // PublicKey's constructor throws if the string isn't valid base58 and 32 bytes.
      // We catch that scream and translate it into a polite boolean.
      new PublicKey(address);
      return true;
    } catch {
      // Not a valid public key. Could be a typo. Could be "0x..." confusion.
      // Could be someone testing the API with their cat's name. We've seen things.
      return false;
    }
  }

  /**
   * getAccountBalance
   *
   * Retrieves the SOL balance of an account from the chain.
   * Returns the value in SOL (i.e., lamports divided by 1e9).
   *
   * The RPC returns lamports — the smallest unit of SOL, named after Leslie Lamport,
   * who absolutely did not envision his name being used to denominate NFT mint prices.
   * (1 SOL = 1,000,000,000 lamports. The chain is very precise about poverty.)
   *
   * @param {string} address - Valid base58-encoded public key.
   * @returns {Promise<number>} Balance in SOL. Pray it's enough to cover rent.
   *   (Not blockchain rent — actual rent. Though blockchain rent is also a thing
   *    and it's equally non-negotiable.)
   */
  async getAccountBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      // Beg the RPC for the raw lamport count. No guarantees on how long this takes.
      const balance = await this.connection.getBalance(publicKey);
      // Convert lamports to SOL. Divide by a billion. Feel the weight of that division.
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      // The chain didn't answer. Or the address doesn't exist. Or the RPC is napping.
      // Log it so we know. Throw it so the controller can handle it with grace.
      this.logger.error(`Error getting balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * getRecentBlockhash
   *
   * Fetches the latest blockhash from the chain — required for constructing valid
   * transactions. Think of it as a timestamp with cryptographic commitment issues.
   *
   * Blockhashes expire in ~60 seconds on mainnet. Build fast. Submit faster.
   * Or build the transaction client-side, which is what the frontend does.
   * Either way, the clock is ticking. The chain is always ticking.
   *
   * @param {Commitment} [commitment] - Optional override; defaults to service config.
   * @returns {Promise<BlockhashWithExpiryBlockHeight>} The blockhash and expiry info.
   */
  async getRecentBlockhash(commitment?: Commitment) {
    try {
      // Ask the chain: "What time is it, cryptographically speaking?"
      // The chain answers with a hash that expires faster than my enthusiasm on Fridays.
      return await this.connection.getLatestBlockhash(
        commitment || this.config.commitment
      );
    } catch (error) {
      // If we can't get a blockhash, we can't build transactions.
      // If we can't build transactions, we can't launch collections.
      // If we can't launch collections, we have a very expensive demo.
      this.logger.error('Error getting recent blockhash:', error);
      throw error;
    }
  }

  /**
   * getTransactionStatus
   *
   * Queries the confirmation status of a transaction by its signature.
   * "Did it go through?" — the question every NFT buyer asks with trembling fingers.
   * This is where we find out.
   *
   * Note: null status ≠ failed. It might just be unconfirmed. The blockchain
   * is not obligated to update us on its timeline. It has priorities. We are not them.
   *
   * @param {string} signature - The transaction's base58-encoded signature.
   * @returns {Promise<RpcResponseAndContext<SignatureStatus | null>>} Status or null.
   */
  async getTransactionStatus(signature: string) {
    try {
      // Politely ask the RPC if it has heard anything about this transaction.
      // The RPC will answer truthfully, which is more than can be said for most things.
      return await this.connection.getSignatureStatus(signature);
    } catch (error) {
      // The RPC didn't want to answer. Either it's busy, broken, or has decided
      // that this particular transaction doesn't deserve its attention today.
      this.logger.error(`Error getting transaction status for ${signature}:`, error);
      throw error;
    }
  }

  /**
   * getNetworkInfo
   *
   * Gathers a comprehensive picture of the current network state: version, slot,
   * block height, and whether we're on devnet (where mistakes are free).
   *
   * Useful for dashboards, health checks, and the quiet existential comfort of knowing
   * that the chain is still running — indifferent and eternal — while we scramble
   * to deploy before the next team standup.
   *
   * @returns {Promise<object>} A snapshot of the chain's current vital signs.
   */
  async getNetworkInfo() {
    try {
      // Three separate RPC calls. Three prayers. Three potential failure points.
      // But if all three land, we return a satisfyingly complete object.
      const version = await this.connection.getVersion();
      const slot = await this.connection.getSlot();
      const blockHeight = await this.connection.getBlockHeight();

      return {
        // The human-readable network name. "devnet" = learning. "mainnet-beta" = consequences.
        network: this.config.network,
        // The RPC endpoint URL. Publicly logged because hiding it doesn't hide it.
        rpcUrl: this.config.rpcUrl,
        // The Solana core version. It's been through more upgrades than our frontend.
        version: version['solana-core'],
        // The current slot. A number so large it makes epoch timestamps feel cozy.
        slot,
        // Block height: how many blocks since genesis. The chain has been busy.
        blockHeight,
        // isDevnet: true = play money. false = the real timeline. Choose wisely.
        isDevnet: isDevnet(),
      };
    } catch (error) {
      // Three calls, one failure. The chain has spoken: "Not today."
      this.logger.error('Error fetching network info:', error);
      throw error;
    }
  }

  /**
   * verifyTransaction
   *
   * The simplest form of on-chain truth: did this transaction succeed?
   * Returns true if the transaction exists, was confirmed, and had no error.
   * Returns false for everything else — timeouts, errors, missing status, doubt.
   *
   * "Trust but verify" — Ronald Reagan, who did not have Solana in mind but should have.
   *
   * @param {string} signature - The transaction signature to evaluate.
   * @returns {Promise<boolean>} true if confirmed and error-free; false if anything went sideways.
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      // Fetch status, then drill into the error field.
      // err === null means success. Any other value means someone's having a bad day.
      const status = await this.getTransactionStatus(signature);
      // Optional chaining because status can be null in so many creative ways.
      return status?.value?.err === null;
    } catch {
      // If we can't even query it, we assume the worst.
      // Pessimism: the official debugging strategy of distributed systems.
      return false;
    }
  }

  /**
   * getClientConfig
   *
   * Assembles the configuration payload the frontend needs to bootstrap itself.
   * No hardcoded chain config in the client build — it asks us on startup.
   * Swap env vars on the backend; the frontend adapts. It's beautiful.
   * It's also the only thing that works synchronously in this entire service.
   *
   * Contains: network, RPC URL, commitment level, program ID, fee config, treasury wallet.
   * Everything a frontend needs to interact with the chain without guessing.
   * "Click and pray is not a launch strategy." — Juan, 2025
   *
   * @returns {object} The complete chain config for frontend consumption.
   */
  getClientConfig() {
    return {
      // Which universe are we in? devnet, testnet, mainnet-beta, localnet?
      // The frontend needs to know so it doesn't submit mainnet transactions to devnet.
      // (This has happened before. Not here. But somewhere. Someone's Monday was ruined.)
      network: this.config.network,
      // The RPC URL. The frontend will hammer this endpoint mercilessly. Godspeed.
      rpcUrl: this.config.rpcUrl,
      // Commitment level. "confirmed" is the Goldilocks zone — not too paranoid,
      // not too cavalier. The blockchain equivalent of "probably fine."
      commitment: this.config.commitment,
      // The program ID. The 32-byte address that IS our smart contract on-chain.
      // Permanent. Immutable. Right there forever, whether we like what it does or not.
      programId: PROGRAM_ID,
      // Platform fee in basis points. 100 = 1%. Additive model.
      // Creator gets their price in full. We collect separately. Nobody is surprised.
      platformFeeBps: PLATFORM_FEE_BPS,
      // The treasury wallet that receives our 1% on every mint.
      // Sacred data. Guard it well. It is the sound of the protocol eating.
      platformWallet: PLATFORM_WALLET,
      // "additive" means the fee is charged on top of the mint price.
      // Not taken from the creator. Not hidden. Transparent, like the ledger itself.
      feeModel: 'additive' as const,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This service is the soul of the solana module. It talks to the chain.
// It validates keys. It fetches balances. It retrieves blockhashes from an
// append-only ledger that will outlive every one of us.
//
// On-chain means permanent, unlike most things in life —
// including this comment, which Juan wrote on his third coffee
// at a time of day that should not exist.
//
// The blockchain doesn't care about your feelings.
// But at least it responds with consistent JSON.
//
//  — Juan, Senior RPC Whisperer, Amateur Lamport Philosopher
// ─────────────────────────────────────────────────────────────────────────────
