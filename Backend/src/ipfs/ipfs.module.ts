import { Module } from '@nestjs/common';
import { IpfsService } from './ipfs.service';
import { IpfsController } from './ipfs.controller';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  providers: [IpfsService, ApiKeyGuard],
  controllers: [IpfsController],
  exports: [IpfsService], // Export so other modules can use it
})
export class IpfsModule {}
