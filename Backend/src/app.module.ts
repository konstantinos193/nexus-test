// ─────────────────────────────────────────────────────────────────────────────
// app.module.ts — The God Module. The architect of all other modules.
// This file doesn't do much directly; it just holds the universe together.
// Humble work. Critically important. Like load-bearing duct tape.
// ─────────────────────────────────────────────────────────────────────────────

// The @Module decorator — the sticky note that tells NestJS
// "yes, this is a module, please treat it accordingly."
import { Module } from '@nestjs/common';

// ConfigModule: the ambassador of .env files everywhere.
// Without this, process.env.WHATEVER is just vibes and undefined values.
import { ConfigModule } from '@nestjs/config';

// ScheduleModule: for when you need things to happen on a cron schedule
// because apparently the app needs to do homework while you sleep.
import { ScheduleModule } from '@nestjs/schedule';

// ThrottlerModule: the bouncer at the door of our API.
// Too many requests too fast? Denied. Slow down. We're not a fire hose.
import { ThrottlerModule } from '@nestjs/throttler';

// CollectionsModule: the crown jewel. NFT collections. The whole point of this.
// Everything else in this file exists to support this module doing its job.
import { CollectionsModule } from './collections/collections.module';

// DatabaseModule: where our precious, sacred data lives.
// Treat it well. It's the only thing that persists when the container restarts.
import { DatabaseModule } from './database/database.module';

// SolanaModule: the blockchain whisperer.
// It talks to Solana so we don't have to cry about RPC calls directly.
import { SolanaModule } from './solana/solana.module';

// IpfsModule: permanent storage for NFT images and metadata.
// Because "permanent" is a strong word, but we say it with confidence anyway.
import { IpfsModule } from './ipfs/ipfs.module';

// HealthController: the "are you alive?" endpoint.
// Kubernetes asks this question obsessively. We respect the commitment.
import { HealthController } from './health/health.controller';

// AppController: serves the landing page HTML. A small file with a big heart.
// (And a very stylish dark-mode UI that nobody asked for but everyone appreciates.)
import { AppController } from './app.controller';

/**
 * AppModule — The root module of the NeXus backend.
 *
 * This is where all the moving parts shake hands and agree
 * to work together, at least in theory.
 *
 * If you add something new to this platform and forget to import its module here,
 * nothing will break loudly. It'll just silently not exist.
 * Like a dependency you forgot to inject. Very haunting.
 */
@Module({
  imports: [
    // ConfigModule — loaded globally so every other module can read .env values
    // without importing it themselves. Communal access to secrets. Very trusting.
    ConfigModule.forRoot({
      isGlobal: true,    // One module to rule all env vars. Global supremacy.
      envFilePath: '.env', // The sacred scroll. Do NOT commit it. Ever.
    }),

    // ScheduleModule — activates @Cron decorators across the app.
    // This is how we sync collections automatically while you're not watching.
    // The app doing its homework at midnight. Very responsible.
    ScheduleModule.forRoot(),

    // ThrottlerModule — rate limiting. 10 requests per minute per client.
    // Because "unlimited API calls" is not a feature, it's a vulnerability.
    // (TTL is in milliseconds. 60_000ms = 60s. Math you don't want to redo at 8am.)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),

    // DatabaseModule — PostgreSQL via TypeORM.
    // The source of truth. The oracle. The reason we can't just use localStorage.
    DatabaseModule,

    // CollectionsModule — NFT collections. The reason this whole thing exists.
    // Please handle with care. The users' JPEGs are in there.
    CollectionsModule,

    // SolanaModule — talks to the Solana blockchain.
    // Verification, transactions, on-chain data. The part where crypto gets real.
    SolanaModule,

    // IpfsModule — uploads and pins files to IPFS.
    // Because "put it on the blockchain permanently" is a promise we try to keep.
    IpfsModule,
  ],

  // Controllers registered at the root level.
  // AppController handles the landing page. HealthController says "I'm alive."
  // Together they cover the two most important questions: "What is this?" and "Is it on?"
  controllers: [AppController, HealthController],
})
export class AppModule {}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — This file is the skeleton key to the entire backend.
 * Change it carelessly and everything either crashes or quietly disappears.
 * It has 27 lines of actual code and carries the weight of the whole platform.
 * Respect the module. Fear the module. Love the module.
 * ─────────────────────────────────────────────────────────────────────────────
 */
