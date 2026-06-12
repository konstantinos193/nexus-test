// RevenueModule — platform fee-revenue reporting.
// Imports SolanaModule (live treasury balance) and AuthModule (JwtAuthGuard).
// DataSource is global (DatabaseModule), so no entity registration is needed here —
// the service uses raw SQL against "Collection" and "fee_ledger".

import { Module } from '@nestjs/common';
import { SolanaModule } from '../solana/solana.module';
import { AuthModule } from '../auth/auth.module';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [SolanaModule, AuthModule],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}
