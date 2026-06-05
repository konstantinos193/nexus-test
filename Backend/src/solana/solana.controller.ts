/**
 * Solana Controller
 *
 * The public-facing diplomat of our blockchain integration. It receives HTTP requests
 * with a calm smile, delegates them to services that may or may not respond in a
 * reasonable timeframe, and returns JSON to a frontend that is refreshing every 500ms.
 *
 * Provides API endpoints for Solana network information, balance queries,
 * transaction verification, address validation, and contract deployment status.
 * (In other words: everything a nervous NFT creator needs to feel safe.)
 *
 * "An API is just a prayer with headers." — Juan
 */

// The NestJS decorator toolkit. GET, Param, Query — the holy trinity of REST.
// Controller: "What path should I answer to?" Module: "All of them. Good luck."
import { Controller, Get, Param, Query } from '@nestjs/common';

// Swagger decorators. For documentation that somebody, somewhere, might one day read.
// ApiTags for grouping, ApiOperation for describing, ApiParam for parameters.
// Unlike our motivation, Swagger's output is always visible.
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

// The service that holds the actual Solana connection and config.
// We stand on its shoulders and take all the HTTP credit.
import { SolanaService } from './solana.service';

// The contracts service that knows where all the PDAs live and whether the program
// is actually deployed. Spoiler: it's deployed. Probably. Check /contracts/status.
import { ContractsService } from './contracts.service';

/**
 * @controller SolanaController
 * @route /api/solana
 *
 * Six endpoints. Each one a small act of faith that the Solana RPC will respond
 * before the frontend's patience expires. Some days it does. Some days it doesn't.
 * The blockchain doesn't care about your SLA. The blockchain doesn't care about anything.
 * It just… continues. Block after block. Forever. Without you.
 */
@ApiTags('solana')
@Controller('api/solana')
export class SolanaController {
  constructor(
    // SolanaService: the quiet professional. Never complains. Occasionally times out.
    private readonly solanaService: SolanaService,
    // ContractsService: derives PDAs, checks deployments, builds transactions.
    // Also the service that truly understands on-chain permanence. (It has accepted this.)
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * GET /api/solana/config
   *
   * Serves the frontend its entire chain configuration in one synchronous swoop.
   * No async. No await. No existential waiting. Just env vars, pre-digested.
   *
   * The frontend fetches this once on startup so it doesn't need to hardcode
   * any of it. Changing SOLANA_NETWORK in the backend changes the universe for
   * the frontend. Power. Terrifying, env-var-shaped power.
   *
   * @returns {object} Network, RPC URL, program ID, fee config — the whole gospel.
   */
  @Get('config')
  @ApiOperation({ summary: 'Get chain config for the frontend (network, RPC URL, program ID, fees)' })
  getClientConfig() {
    // Sync — reads env vars that are set at startup. No async needed.
    // This is the one endpoint in the whole system that never lets us down.
    // Cherish it. Frame it. Put it on the wall.
    return {
      success: true,
      data: this.solanaService.getClientConfig(),
    };
  }

  /**
   * GET /api/solana/network
   *
   * Live network introspection. Version, slot, block height — a real-time snapshot
   * of a blockchain that has been running longer than most of our PRs.
   *
   * If this throws, the RPC is probably having a moment. Pour one out.
   * (Preferably coffee. It's probably Monday.)
   *
   * @returns {Promise<object>} Network info, version, current slot and block height.
   */
  @Get('network')
  @ApiOperation({ summary: 'Get Solana network information' })
  async getNetworkInfo() {
    return {
      success: true,
      data: await this.solanaService.getNetworkInfo(),
    };
  }

  /**
   * GET /api/solana/balance/:address
   *
   * Retrieves the SOL balance for a given wallet address.
   * Also returns lamports, because some of us prefer our despair in whole numbers.
   *
   * Validates the address first — because sending a garbage string to the RPC
   * is the blockchain equivalent of screaming into the void and expecting an echo.
   * (The void does not echo. It just charges you a transaction fee.)
   *
   * @param {string} address - A (hopefully) valid base58-encoded Solana public key.
   * @returns {Promise<object>} Balance in SOL and lamports, or an error if the address
   *   is malformed or the connection decides today is not the day.
   */
  @Get('balance/:address')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiParam({ name: 'address', description: 'Solana wallet address' })
  async getBalance(@Param('address') address: string) {
    // Validate before we even think about touching the RPC.
    // An ounce of validation is worth a pound of "Error: Invalid public key input."
    if (!this.solanaService.isValidAddress(address)) {
      return {
        success: false,
        error: 'Invalid Solana address',
      };
    }

    try {
      // Ask the blockchain politely. (It doesn't care about politeness. Ask anyway.)
      const balance = await this.solanaService.getAccountBalance(address);
      return {
        success: true,
        data: {
          address,
          // SOL — for humans who trust floating point arithmetic with their finances.
          balance,
          // Lamports — for humans who prefer their poverty quantified precisely.
          balanceLamports: balance * 1e9,
        },
      };
    } catch (error: any) {
      // The blockchain didn't feel like sharing today. Happens to the best of us.
      return {
        success: false,
        error: error.message || 'Failed to get balance',
      };
    }
  }

  /**
   * GET /api/solana/verify-transaction/:signature
   *
   * Checks whether a given transaction signature is valid and error-free.
   * Because "I sent it, trust me" is not a valid treasury management strategy.
   *
   * On-chain means permanent. This is both comforting (the transaction happened)
   * and terrifying (the transaction HAPPENED). Verification is how we cope.
   *
   * @param {string} signature - The base58-encoded transaction signature.
   * @returns {Promise<object>} The signature and a boolean verdict from the chain.
   */
  @Get('verify-transaction/:signature')
  @ApiOperation({ summary: 'Verify transaction signature' })
  @ApiParam({ name: 'signature', description: 'Transaction signature' })
  async verifyTransaction(@Param('signature') signature: string) {
    try {
      // One question. One boolean. The blockchain is occasionally this decisive.
      const isValid = await this.solanaService.verifyTransaction(signature);
      return {
        success: true,
        data: {
          signature,
          // true: the transaction went through. Celebrate responsibly.
          // false: the transaction errored on-chain. It's still there, though.
          // Forever. As a reminder. The blockchain doesn't do forgiveness.
          verified: isValid,
        },
      };
    } catch (error: any) {
      // If we can't even query the status, something is deeply wrong with the RPC.
      // Or the universe. Probably both.
      return {
        success: false,
        error: error.message || 'Failed to verify transaction',
      };
    }
  }

  /**
   * GET /api/solana/validate-address/:address
   *
   * Validates whether a string is a legitimate base58-encoded Solana public key.
   * No async. No RPC call. Just math and tears.
   *
   * Useful for frontend pre-validation before attempting anything on-chain.
   * Because "check your work before submitting" is advice that transcends education
   * and applies equally to blockchain transactions.
   *
   * @param {string} address - The address string to validate.
   * @returns {object} The address and whether it passes the public key sanity check.
   */
  @Get('validate-address/:address')
  @ApiOperation({ summary: 'Validate Solana address' })
  @ApiParam({ name: 'address', description: 'Address to validate' })
  async validateAddress(@Param('address') address: string) {
    // Pure synchronous validation. No network. No drama. A rare gift.
    const isValid = this.solanaService.isValidAddress(address);
    return {
      success: true,
      data: {
        address,
        // valid: true  — congratulations, you have a real public key.
        // valid: false — you have a string. It is not a public key. Please try again.
        valid: isValid,
      },
    };
  }

  /**
   * GET /api/solana/contracts/status
   *
   * Returns the deployment status of the Nexus Launchpad program on the current network.
   * Essentially asks: "Is our program actually out there, executable, on the chain?"
   *
   * This is the endpoint you call when you're 3am-anxious before a launch.
   * "Is it deployed?" Yes. It's deployed. It's been deployed. Go to sleep.
   * (Run it again just to be sure. We understand. The blockchain understands nothing,
   * but we understand.)
   *
   * @returns {Promise<object>} Program deployment status — deployed: true or deployed: false
   *   (and if it's false before a mint goes live, may the odds be ever in your favor).
   */
  @Get('contracts/status')
  @ApiOperation({ summary: 'Get smart contract deployment status' })
  async getContractStatus() {
    return {
      success: true,
      // This is the health check your DevOps dashboard deserves.
      // Green means go. Red means it's time to have a very honest conversation
      // with whoever deployed the program. (It was probably Juan.)
      data: await this.contractsService.getContractStatuses(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// Six endpoints. Six windows into a blockchain that is entirely indifferent to
// our needs, our deadlines, and our feelings about RPC rate limits.
// And yet — here we are. Mapping routes. Building APIs. Believing.
//
// The controller doesn't mint anything, sign anything, or own anything.
// It just asks. Politely. Repeatedly. With appropriate error handling.
// Honestly, it's the most emotionally mature component in this whole module.
//
//  — Juan, Chief HTTP Optimist, Reluctant Lamport Accountant
// ─────────────────────────────────────────────────────────────────────────────
