// ─────────────────────────────────────────────────────────────────────────────
// collections.module.ts — The Collections Department.
//
// This module is the organizational unit that keeps everything related to
// NFT collections from becoming a chaotic pile of unregistered providers.
// Think of it as HR for your services. Nobody loves HR, but imagine the
// alternative. (Actually, please don't imagine the alternative.)
// ─────────────────────────────────────────────────────────────────────────────

// The @Module decorator. The sacred sigil that transforms a plain class
// into something NestJS actually acknowledges. Without it: just a class.
// With it: a module. The difference is one decorator and a lot of self-respect.
import { Module } from '@nestjs/common';

// TypeOrmModule — for plugging the Collection entity into the database.
// forFeature([]) is how you tell TypeORM: "yes, this module owns this table."
// Very territorial. Very correct.
import { TypeOrmModule } from '@nestjs/typeorm';

// The controller — handles incoming HTTP requests and dispatches them
// to the service layer. The receptionist of the Collections Department.
// Very polite. Validates everything. Throws exceptions when provoked.
import { CollectionsController } from './collections.controller';

// The service — where the actual work happens.
// Business logic lives here, far from the chaos of HTTP params.
// This is the engine room. Loud, important, underappreciated.
import { CollectionsService } from './collections.service';

// The sync service — runs on a schedule and talks to the blockchain.
// It's the one doing the midnight homework nobody sees.
// Patient. Relentless. Mildly terrifying.
import { CollectionsSyncService } from './collections-sync.service';

// The Collection entity — the database representation of an NFT collection.
// A TypeScript class that doubles as a database schema. Very busy. Very tired.
import { Collection } from '../database/entities/collection.entity';

// FeeLedger entity — the sync service writes a revenue row here whenever it observes
// a collection's on-chain minted count tick upward. Registered so the repo can inject.
import { FeeLedger } from '../database/entities/fee-ledger.entity';

// SolanaModule — imported here so CollectionsSyncService can talk to the chain.
// Because you can't verify on-chain data without actually going on-chain.
// (Surprisingly, this turned out to be necessary.)
import { SolanaModule } from '../solana/solana.module';

// ApiKeyGuard — borrowed from the IPFS module because sharing is caring,
// and also because we don't want just anyone triggering a manual sync.
// Keys are for adults who know what they're doing. (Mostly.)
import { ApiKeyGuard } from '../ipfs/guards/api-key.guard';

/**
 * CollectionsModule — The formal declaration that all of this belongs together.
 *
 * Imports:  TypeORM feature registration + SolanaModule (for blockchain access)
 * Controllers: CollectionsController (handles the REST endpoints)
 * Providers:   CollectionsService (business logic), CollectionsSyncService (chain sync),
 *              ApiKeyGuard (protects the sync trigger endpoint)
 * Exports:     CollectionsService and CollectionsSyncService for anyone downstream
 *              who needs to do collection things without re-importing everything.
 *
 * If you add a new feature related to collections, it probably belongs here.
 * If you're unsure, add it here anyway and we'll sort it out later.
 * (We will not sort it out later.)
 */
@Module({
  imports: [
    // Register the Collection entity with TypeORM for this module's scope.
    // This is how repositories get injected. Sacred rite. Do not skip.
    TypeOrmModule.forFeature([Collection, FeeLedger]),

    // Import SolanaModule so its exported services are available here.
    // CollectionsSyncService needs to verify things on-chain,
    // and it can't do that without this. Trust the process.
    SolanaModule,
  ],

  // The controller is where the outside world knocks.
  // It opens the door, checks their credentials, and calls the service.
  controllers: [CollectionsController],

  providers: [
    // The service that does the actual collection CRUD.
    // Create, read, update, the whole liturgy.
    CollectionsService,

    // The sync service that periodically reconciles our DB with the blockchain.
    // Runs on a schedule. Reports to nobody. Answers to the cron.
    CollectionsSyncService,

    // The API key guard — because /sync should not be a public endpoint.
    // Registered as a provider here so NestJS can inject it where needed.
    ApiKeyGuard,
  ],

  // Export the services so other modules can use them.
  // CollectionsService and CollectionsSyncService leave the building.
  // They're needed out there. Let them go. They'll be fine.
  exports: [CollectionsService, CollectionsSyncService],
})
export class CollectionsModule {}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Coded by Juan — This module declaration is 17 lines of logic
 * holding together the entire NFT collection feature set.
 * A deceptively small file doing a deceptively large job.
 * Like a good database index: invisible, essential, deeply satisfying.
 * ─────────────────────────────────────────────────────────────────────────────
 */
