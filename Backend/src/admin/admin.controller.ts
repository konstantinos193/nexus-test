import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdminUpdateCollectionDto } from './dto/admin-update-collection.dto';
import { ApiKeyGuard } from '../ipfs/guards/api-key.guard';

@Controller('api/admin')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('creators')
  async getCreators() {
    return this.adminService.getCreators();
  }

  @Patch('collections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateCollection(
    @Param('id') id: string,
    @Body() dto: AdminUpdateCollectionDto,
  ): Promise<void> {
    return this.adminService.updateCollection(id, dto);
  }

  @Delete('collections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCollection(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteCollection(id);
  }
}
