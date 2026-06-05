// The IPFS module. Wiring together the unholy trinity of upload, control, and brutal API gatekeeping.
// Think of this as the organizational chart for our corner of the decentralized web.
// Nobody asked for a org chart. Here it is anyway. (You're welcome.)

// The beating heart of NestJS dependency injection — without this, nothing talks to anything.
import { Module } from '@nestjs/common';

// The service that does the actual heavy lifting of screaming bytes into the void.
import { IpfsService } from './ipfs.service';

// The controller that bravely accepts HTTP requests and prays the service is awake.
import { IpfsController } from './ipfs.controller';

// The velvet rope. The bouncer. The humorless guardian of our sacred upload endpoints.
import { ApiKeyGuard } from './guards/api-key.guard';

/**
 * IpfsModule
 *
 * The NestJS module that holds the entire IPFS operation together with the structural
 * integrity of duct tape and blind optimism.
 *
 * Registers:
 * - IpfsService      → the actual brains (does not run on coffee, unfortunately)
 * - ApiKeyGuard      → the bouncer at the door (no key, no party)
 * - IpfsController   → the friendly face that greets HTTP requests before they get lost
 *
 * Exports IpfsService so other modules can also scream into the decentralized void
 * without having to bring their own duct tape.
 */
@Module({
  // Providers: the workers. IpfsService does the job; ApiKeyGuard makes sure randoms don't crash the party.
  providers: [IpfsService, ApiKeyGuard],

  // Controllers: the front door. This is where HTTP requests knock and either get let in or turned away.
  controllers: [IpfsController],

  // Export IpfsService so the rest of the app can also commit data to the blockchain's attic.
  // (Yes, IPFS is basically a global attic. Permanent, peer-to-peer, and nobody knows who owns what.)
  exports: [IpfsService],
})
export class IpfsModule {}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Module architect, amateur philosopher, professional duct-tape engineer
// Note: This module has been declared @Global in DatabaseModule. IpfsModule has
//       not. Probably for the best — not everything deserves to be everywhere.
// ─────────────────────────────────────────────────────────────────────────────
