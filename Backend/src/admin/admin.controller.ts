import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Ip,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { AdminUpdateCollectionDto } from './dto/admin-update-collection.dto';
import { ReorderFeaturedDto } from './dto/reorder-featured.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthedAdmin } from '../auth/decorators/current-user.decorator';
import { AdminRole } from '../database/entities/admin-user.entity';

// Class-level JwtAuthGuard: every route requires a valid admin session.
// Mutations add RolesGuard + @Roles(MODERATOR) (super_admin always passes).
@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  // ── Read (any authenticated admin) ────────────────────────────────────────
  @Get('stats')
  async getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @Get('creators')
  async getCreators() {
    return this.adminService.getCreators();
  }

  @Get('audit')
  async getAudit(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.auditService.list({ page, pageSize, action, actorId });
  }

  // ── Moderation (moderator or super_admin) ─────────────────────────────────
  @Patch('collections/:id')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateCollection(
    @Param('id') id: string,
    @Body() dto: AdminUpdateCollectionDto,
    @CurrentUser() actor: AuthedAdmin,
    @Ip() ip: string,
  ): Promise<void> {
    return this.adminService.updateCollection(id, dto, actor, ip);
  }

  @Patch('featured/order')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderFeatured(
    @Body() dto: ReorderFeaturedDto,
    @CurrentUser() actor: AuthedAdmin,
    @Ip() ip: string,
  ): Promise<void> {
    return this.adminService.reorderFeatured(dto.orderedIds, actor, ip);
  }

  @Delete('collections/:id')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCollection(
    @Param('id') id: string,
    @CurrentUser() actor: AuthedAdmin,
    @Ip() ip: string,
  ): Promise<void> {
    return this.adminService.deleteCollection(id, actor, ip);
  }

  @Post('collections/:id/restore')
  @UseGuards(RolesGuard)
  @Roles(AdminRole.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreCollection(
    @Param('id') id: string,
    @CurrentUser() actor: AuthedAdmin,
    @Ip() ip: string,
  ): Promise<void> {
    return this.adminService.restoreCollection(id, actor, ip);
  }
}
