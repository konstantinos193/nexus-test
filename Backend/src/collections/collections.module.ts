import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionsSyncService } from './collections-sync.service';
import { Collection } from '../database/entities/collection.entity';
import { SolanaModule } from '../solana/solana.module';

@Module({
  imports: [TypeOrmModule.forFeature([Collection]), SolanaModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, CollectionsSyncService],
  exports: [CollectionsService, CollectionsSyncService],
})
export class CollectionsModule {}
