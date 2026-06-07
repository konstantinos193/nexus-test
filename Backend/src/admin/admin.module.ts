import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../database/entities/collection.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApiKeyGuard } from '../ipfs/guards/api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Collection])],
  controllers: [AdminController],
  providers: [AdminService, ApiKeyGuard],
})
export class AdminModule {}
