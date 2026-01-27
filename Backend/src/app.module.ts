import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CollectionsModule } from './collections/collections.module';
import { PrismaModule } from './database/prisma.module';
import { SolanaModule } from './solana/solana.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CollectionsModule,
    SolanaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
