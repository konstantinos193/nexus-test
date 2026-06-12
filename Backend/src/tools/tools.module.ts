/**
 * tools.module.ts - The module that wires up the NFT generation tool.
 * Uses ScheduleModule (already registered globally in AppModule) for TTL cleanup.
 * One module, two endpoints, zero persistent state after download.
 *
 * @author Juan – module registrar, wiring supervisor
 */

import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}

// — Juan. Humble module. Keeps the server from accumulating ZIP files forever.
