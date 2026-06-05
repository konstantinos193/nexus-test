// ══════════════════════════════════════════════════════════════════════════════
// collections-sync.module.ts
//
// The smallest module in the codebase. Four lines of real code.
// And yet without it, the sync service would simply not exist.
// Like a keystone. Or a single bolt on a bridge. Don't remove it.
// ══════════════════════════════════════════════════════════════════════════════

// The Module decorator — the magic word that turns a plain class into a NestJS module.
// Without @Module, this file is just a class that knows about other classes.
// With @Module, it's infrastructure. (The distinction matters more than it sounds.)
import { Module } from '@nestjs/common';

// TypeOrmModule.forFeature: the incantation that binds a TypeORM entity to a module's scope.
// This is how CollectionsSyncService gets its @InjectRepository(Collection) resolved.
// (Behind the scenes: a LOT of DI magic. In front of the scenes: one line. Beautiful.)
import { TypeOrmModule } from '@nestjs/typeorm';

// The service being housed by this module.
// The actual worker. The cron-running, blockchain-crawling, DB-upserting beast.
import { CollectionsSyncService } from './collections-sync.service';

// The Collection entity — the database table definition that TypeORM needs
// to give us a properly typed Repository<Collection>.
// Without this in forFeature, the @InjectRepository in the service would throw
// at runtime. Dramatically. Without mercy.
import { Collection } from '../database/entities/collection.entity';

// The SolanaModule — because CollectionsSyncService depends on SolanaService,
// and SolanaService lives in SolanaModule. NestJS modules are about dependency scope.
// You can't use what you haven't imported. This is the law.
import { SolanaModule } from '../solana/solana.module';


/**
 * CollectionsSyncModule
 *
 * The NestJS module that packages the CollectionsSyncService with its dependencies.
 *
 * Responsibilities:
 * - Provide: CollectionsSyncService (the service that actually does the work)
 * - Import:  TypeOrmModule for Collection (so the service has a Repository)
 * - Import:  SolanaModule (so the service has a Solana RPC connection)
 * - Export:  CollectionsSyncService (so other modules can inject it if needed)
 *
 * This module wires nothing complex. It assembles the pieces so NestJS can
 * instantiate CollectionsSyncService with all its constructor args satisfied.
 * Small, decisive, purposeful. Like a good commit. (Unlike most commits.)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Collection]), // Registers Collection repo in this module's scope.
    SolanaModule,                           // Brings in SolanaService for RPC access.
  ],
  providers: [CollectionsSyncService],      // The service that does the actual sync work.
  exports:   [CollectionsSyncService],      // Exported so AppModule or others can reference it.
})
export class CollectionsSyncModule {}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// This is the shortest file in the collections domain. It is also, somehow,
// the one that gets blamed when the sync service mysteriously stops running.
// ("Did you import the ScheduleModule?" Yes. Every time. We always import the ScheduleModule.)
//
// If the sync service isn't running: check AppModule, not this file.
// This file is fine. This file has always been fine.
// ══════════════════════════════════════════════════════════════════════════════
