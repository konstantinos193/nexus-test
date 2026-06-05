/**
 * Solana Module
 *
 * The sacred NestJS container that bundles all our blockchain hopium into one tidy bow.
 * Three services walk into a module. The module says: "You're all providers now."
 * Only two of you get exported because ContractsService has trust issues. (Just kidding.
 * ContractsService is exported too. It goes everywhere. It never rests.)
 *
 * Dependency injection: because manually newing up services is how civilizations fall.
 */

// The glue that holds NestJS together. Without this, we're just sad TypeScript.
import { Module } from '@nestjs/common';

// The service that whispers sweet nothings to the Solana RPC and occasionally gets ghosted.
import { SolanaService } from './solana.service';

// The controller that bravely accepts HTTP requests and prays the blockchain cooperates.
import { SolanaController } from './solana.controller';

// The contracts wizard. Derives PDAs, builds transactions, never signs them.
// (A professional boundary that would make any therapist proud.)
import { ContractsService } from './contracts.service';

/**
 * @module SolanaModule
 *
 * The one module to rule them all. (Well, one of a few modules. But dramatically speaking.)
 * Register it once, import it wherever, and let NestJS's IoC container
 * do the heavy lifting — unlike the Solana RPC, which lifts exactly as much as it wants to.
 *
 * Exports both services so the rest of the app can beg the blockchain for data
 * without rolling their own connection. Sharing is caring. Especially on-chain,
 * where every new account costs rent. (Real rent. In SOL. The blockchain charges rent.
 * Let that sink in.)
 */
@Module({
  // The lone sentinel standing between chaos and your HTTP requests.
  controllers: [SolanaController],

  // The workhorses. SolanaService talks to the chain; ContractsService builds the transactions.
  // Together, they're basically a two-person startup that never sleeps.
  providers: [SolanaService, ContractsService],

  // Exported so other modules can use them without re-instantiating.
  // On-chain data is permanent. Module re-instantiation is not a strategy.
  exports: [SolanaService, ContractsService],
})
export class SolanaModule {}

// ─────────────────────────────────────────────────────────────────────────────
// Juan was here.
//
// This module is the simplest file in the codebase. Four lines of actual logic.
// Juan spent more time on these comments than on the file itself.
// Some things you do for the love of the craft.
// Some things you do because the blockchain demands witnesses.
//
//  — Juan, Module Wrangler, Reluctant Blockchain Enthusiast
// ─────────────────────────────────────────────────────────────────────────────
