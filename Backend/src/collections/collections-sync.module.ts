import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsSyncService } from './collections-sync.service';
import { Collection } from '../database/entities/collection.entity';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [TypeOrmModule.forFeature([Collection]), SolanaModule],
  providers: [CollectionsSyncService],
  exports: [CollectionsSyncService],
})
export class CollectionsSyncModule {}
