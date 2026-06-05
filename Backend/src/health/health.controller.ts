// The health check controller.
// The application's way of answering "are you okay?" — a question
// asked by load balancers, DevOps dashboards, and the professionally anxious.
// We answer honestly. Sometimes the answer is "partial." Such is life.

// NestJS routing primitives. @Get makes us respond to pings. @Controller gives us an address.
import { Controller, Get } from '@nestjs/common';

// Swagger decorators — the docs generator that someone will appreciate when things break at 2am.
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// TypeORM's injection token — gives us the DataSource for issuing a diagnostic query.
// @InjectDataSource: NestJS's way of saying "here is the database, please do not break it."
import { InjectDataSource } from '@nestjs/typeorm';

// The DataSource itself — the actual database connection pool TypeORM manages for us.
import { DataSource } from 'typeorm';

// The Solana service — checks our blockchain network connection.
// Because an NFT launchpad with a dead Solana connection is just a database with ambitions.
import { SolanaService } from '../solana/solana.service';

/** Swagger tag: health checks get their own section in the API docs */
@ApiTags('health')

/** Route: /health — the universal "is it alive?" endpoint */
@Controller('health')
export class HealthController {
  /**
   * Injects the DataSource and SolanaService via NestJS dependency injection.
   * Both are needed to answer the health check accurately:
   * - Database: can we query anything at all?
   * - Solana: are we connected to the blockchain we are supposed to be launching on?
   *
   * @param dataSource   - TypeORM DataSource — the database connection pool
   * @param solana       - SolanaService — our portal to the blockchain network
   */
  constructor(
    @InjectDataSource()       // TypeORM injects the default DataSource here
    private dataSource: DataSource,
    private solana: SolanaService,  // Our Solana connection — bravely connecting to devnet/mainnet
  ) {}

  /**
   * GET /health
   *
   * The application's annual physical, available on demand.
   * Checks two critical systems and reports their status honestly:
   * 1. PostgreSQL database — can we issue a SELECT 1?
   * 2. Solana RPC — can we get network information?
   *
   * Status states:
   * - 'ok'      → everything works, ship it
   * - 'partial' → one system down, the other still alive, investigate urgently
   * - 'error'   → database is down — this is an "wake someone up" situation
   *
   * Note: this endpoint does NOT check IPFS — that lives at /api/ipfs/health.
   * We believe in separation of concerns and not making one endpoint do everything.
   * (Unlike certain engineers who shall not be named.)
   *
   * @returns Health status object with status, timestamp, database, and solana fields
   */
  @Get()
  @ApiOperation({ summary: 'Health check — tells you whether we are okay, partially okay, or definitely not okay' })
  async check() {
    // Start optimistically. Assume everything is fine.
    // The subsequent checks will correct this assumption as needed.
    const health = {
      status: 'ok',                           // Optimism: the default state, often revised downward
      timestamp: new Date().toISOString(),     // When this check was performed — useful for staleness detection
      database: 'unknown',                    // PostgreSQL status — will be resolved below
      solana: 'unknown',                      // Solana RPC status — will be resolved below
    };

    try {
      // Database check: issue SELECT 1.
      // If this succeeds, the database is accepting connections and executing queries.
      // It is the simplest, least intrusive diagnostic query in existence.
      await this.dataSource.query('SELECT 1');
      health.database = 'connected';  // The database answered. It is present. It is willing.
    } catch (error) {
      // Database is down. This is the serious one.
      // Without the database, collections can't be read, minting can't be tracked, nothing works.
      health.status = 'error';
      health.database = 'disconnected';  // Not "struggling" — disconnected. We are specific in tragedy.
    }

    try {
      // Solana check: ask for network info.
      // If this succeeds, we're connected to the RPC and can interact with the blockchain.
      const networkInfo = await this.solana.getNetworkInfo();
      health.solana = 'connected';  // The blockchain is reachable. NFTs may proceed.
      health['solanaNetwork'] = networkInfo.network;  // devnet? mainnet-beta? localnet? We report.
    } catch (error) {
      // Solana RPC is down or unreachable. Minting will fail. Alerting is warranted.
      // We set 'partial' only if the database is still up — otherwise it's already 'error'.
      health.status = health.status === 'error' ? 'error' : 'partial';
      health.solana = 'disconnected';  // The blockchain has gone quiet. Most unnerving.
    }

    // Return the assembled health report.
    // One of: 'ok', 'partial', or 'error'. The load balancer will decide what to do with this.
    return health;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Application health officer, incident first responder, reluctant bearer of bad news
// Observation: The health endpoint is the first thing you check when something is wrong
//              and the last thing you remember exists when everything is working.
//              Add it to your monitoring. Set up alerts. Wake someone up when it returns 'error'.
//              (That someone might be me. Send coffee.)
// Note: HTTP 200 is returned regardless of status field value. The load balancer
//       reads the JSON. Design decision: don't make health checks return 5xx —
//       that causes cascading restart loops. We report and let the operator decide.
// ─────────────────────────────────────────────────────────────────────────────
