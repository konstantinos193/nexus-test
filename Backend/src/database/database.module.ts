// The database module.
// The sacred connection to PostgreSQL — the persistent, relational, surprisingly emotional
// foundation upon which all collection data rests.
// Without this, nothing is saved. Without this, every restart is a fresh start.
// Without this, the NFT launchpad is just a web server with dreams.

// NestJS module primitives — @Module defines the module; @Global makes it available
// to every other module without manual imports. Powerful. Dangerous. Used here wisely.
import { Module, Global } from '@nestjs/common';

// TypeORM's NestJS integration — the bridge between TypeScript and PostgreSQL.
// forRootAsync lets us configure the connection using the async ConfigService,
// because DATABASE_URL isn't available until the config module initializes.
import { TypeOrmModule } from '@nestjs/typeorm';

// ConfigModule and ConfigService — the .env file's ambassadors to the NestJS world.
// We import ConfigModule here so ConfigService can be injected in the factory function.
import { ConfigModule, ConfigService } from '@nestjs/config';

// Our only entity for now — the Collection.
// Every NFT collection ever created on this platform lives in this table.
// TypeORM needs to know about it before it can manage it.
import { Collection } from './entities/collection.entity';

/**
 * DatabaseModule
 *
 * @Global() makes this module's exports (TypeOrmModule) available to every
 * other module in the application without needing to import it explicitly.
 * It's the database — everything needs it. Global is the correct decision here.
 *
 * Configures a PostgreSQL connection pool via TypeORM's async factory pattern,
 * reads DATABASE_URL from environment, parses it into components, and
 * sets sane pool limits and timeout thresholds.
 *
 * If DATABASE_URL is not set, we throw immediately at startup.
 * There is no fallback. There is no in-memory SQLite rescue mode.
 * There is DATABASE_URL or there is nothing.
 */
@Global()  // Makes TypeOrmModule exports available application-wide — no need to import DatabaseModule in every feature module
@Module({
  imports: [
    /**
     * TypeOrmModule.forRootAsync
     *
     * Async factory configuration — reads DATABASE_URL from ConfigService
     * and assembles the TypeORM connection options at module initialization time.
     * Async is required because ConfigService itself is async-injectable.
     */
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],  // ConfigModule must be imported so ConfigService can be injected

      /**
       * useFactory
       *
       * The factory function that builds the TypeORM DataSource options.
       * Called once at startup. If it throws, the application does not start.
       * Which is the correct behavior. A launchpad without a database is not a launchpad.
       *
       * @param configService - NestJS config service, reads .env and environment variables
       * @returns TypeORM DataSource options object — the complete database connection spec
       */
      useFactory: (configService: ConfigService) => {
        // DATABASE_URL is non-negotiable. Postgres connection string, full stop.
        // Format: postgresql://user:password@host:port/database?schema=public
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          // No URL = no database = no app. We fail fast and loudly.
          // A clear error message is more useful than a cryptic TypeORM timeout at runtime.
          throw new Error('DATABASE_URL is required but not found in environment variables');
        }

        // Parse the DATABASE_URL into its component parts.
        // The URL API handles this cleanly — no regex archaeology required.
        // Parse DATABASE_URL: postgresql://user:password@host:port/database?schema=public
        const url = new URL(databaseUrl);
        const database = url.pathname.slice(1);                    // Remove the leading '/' from pathname
        const schema = url.searchParams.get('schema') || 'public'; // Schema defaults to 'public' if unset

        // isDev: full SQL query logging in development only.
        // Logging every query in production is a storage bill and a privacy concern.
        const isDev = configService.get<string>('NODE_ENV') === 'development';
        const isProd = configService.get<string>('NODE_ENV') === 'production';

        // Pool size: configurable via DB_POOL_MAX, default 25.
        // 25 connections: enough for a healthy workload, not so many that Postgres weeps.
        const poolMax = configService.get<number>('DB_POOL_MAX') ?? 25;

        // SSL: enabled in production or when DB_SSL=true is set explicitly.
        // Keeps dev/staging simple (no cert setup) while enforcing encryption in prod.
        const sslEnabled = isProd || configService.get<string>('DB_SSL') === 'true';

        return {
          type: 'postgres',               // We are a Postgres shop. TypeORM supports others; we do not care.
          host: url.hostname,             // e.g. 'localhost' or 'db.production.example.com'
          port: parseInt(url.port) || 5432, // 5432: PostgreSQL's default port, sacred and immovable
          username: url.username,         // DB user — has appropriate permissions, ideally not 'postgres' in prod
          password: url.password,         // DB password — from env, not hardcoded, never hardcoded
          database: database,             // The specific database name we're connecting to
          schema: schema,                 // Usually 'public'; configurable for multi-schema setups

          // Our entities: TypeORM needs to know which classes map to which tables.
          // This is the one place where the entity/table relationship is declared globally.
          entities: [Collection],  // Sole tenant for now. May grow. Schema migrations will be required.

          // synchronize: FALSE in all environments.
          // Auto-sync is a footgun that will silently drop columns in production.
          // We run explicit migrations. We control our schema. We are professionals. Mostly.
          synchronize: false,

          // Logging: full SQL in dev (see every query, learn, regret), warn-only in production.
          // Full SQL logging: invaluable for debugging, terrifying to run in production.
          // Full SQL logging only in dev; slow-query threshold fires in all envs.
          logging: isDev ? true : ['warn'],

          // Log queries that exceed 2 seconds. Slow queries are the silent killers of NFT launches.
          // A query that takes 2+ seconds on mint day is a query that needs an index.
          maxQueryExecutionTime: 2000,

          // Retry on startup: if the DB container is still initializing when the app starts,
          // wait and retry rather than crashing immediately. 5 attempts × 3s = 15s grace window.
          retryAttempts: 5,
          retryDelay: 3000,

          // SSL: required in production. Controlled by NODE_ENV=production or DB_SSL=true.
          // rejectUnauthorized: true rejects self-signed certs; set false only when using
          // managed services that present certs from a private CA (e.g. some RDS configs).
          ...(sslEnabled && {
            ssl: { rejectUnauthorized: false },
          }),

          // Connection pool configuration — the tuning knobs that separate a stable app from an unstable one.
          extra: {
            // Maximum number of connections in the pool.
            // Sized to handle concurrent mint traffic without exhausting Postgres's connection limit.
            max: Number(poolMax),

            // How long an idle connection stays in the pool before being closed.
            // 30 seconds: long enough to reuse, short enough to not accumulate stale connections.
            idleTimeoutMillis: 30_000,

            // How long to wait to acquire a connection from the pool.
            // 3 s: fast-fail under pool exhaustion so the load balancer can route to another
            // instance rather than queuing requests inside this process indefinitely.
            // If your pool is exhausted, 3 seconds of waiting is better than 30 seconds of hanging.
            connectionTimeoutMillis: 3_000,

            // Maximum time a single SQL statement can run before Postgres cancels it.
            // 30 seconds: generous for complex queries, fatal for runaway aggregations.
            // Allow queries to run longer than pool acquisition so a slow query
            // doesn't kill requests that are waiting for a connection.
            statement_timeout: 30_000,

            // Mirror SSL settings in the pg driver extra config for managed cloud DBs
            // that require sslmode on the connection itself (e.g. Supabase, Neon, RDS).
            ...(sslEnabled && { ssl: true }),
          },
        };
      },
      inject: [ConfigService],  // Inject ConfigService into the factory function. The circle of dependency is complete.
    }),

    // Register the Collection entity for repository injection.
    // This is what makes @InjectRepository(Collection) work in feature modules.
    // The @Global() decorator means other modules get this without explicit imports.
    TypeOrmModule.forFeature([Collection]),
  ],

  // Export TypeOrmModule so any module in the application can inject TypeORM
  // repositories and DataSource without re-importing DatabaseModule.
  // @Global() + exports: [TypeOrmModule] = "here is the database, it belongs to everyone."
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Database whisperer, connection pool philosopher, migration advocate
// Opinions held strongly:
//   1. synchronize: false. Always. Forever. No exceptions.
//   2. DATABASE_URL in .env, not in code. The code is not a secret vault.
//   3. Connection pool timeouts: set them. Test them. Know what happens when they fire.
//   4. Slow query logging: turn it on in dev and keep the discipline of checking it.
//      That 2-second query is 0.2 seconds with the right index. Add the right index.
// Note: If you're reading this at 3am because the database is down,
//       check the connection pool first. Then check the host. Then get coffee.
//       In that order. Every time.
// ─────────────────────────────────────────────────────────────────────────────
