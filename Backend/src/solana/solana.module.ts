/**
 * Solana Module
 * Provides Solana blockchain integration
 */

import { Module } from '@nestjs/common';
import { SolanaService } from './solana.service';
import { SolanaController } from './solana.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [SolanaController],
  providers: [SolanaService, ContractsService],
  exports: [SolanaService, ContractsService],
})
export class SolanaModule {}
