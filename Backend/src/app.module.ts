import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollectionsModule } from './collections/collections.module';
import { DatabaseModule } from './database/database.module';
import { SolanaModule } from './solana/solana.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    CollectionsModule,
    SolanaModule,
    IpfsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
