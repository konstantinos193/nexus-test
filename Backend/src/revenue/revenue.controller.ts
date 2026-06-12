// RevenueController — read-only platform fee-revenue reporting for the owner console.
// Any authenticated admin may view revenue (finance/read_only/super_admin/moderator);
// there are no mutations here, so JwtAuthGuard alone is the gate.

import {
  Controller,
  Get,
  Header,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/admin/revenue')
@UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('summary')
  getSummary() {
    return this.revenueService.getSummary();
  }

  @Get('by-collection')
  getByCollection(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.revenueService.getByCollection(limit ?? 100);
  }

  @Get('by-creator')
  getByCreator() {
    return this.revenueService.getByCreator();
  }

  @Get('timeseries')
  getTimeseries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('bucket') bucket?: string,
    @Query('includeBaseline', new ParseBoolPipe({ optional: true })) includeBaseline?: boolean,
  ) {
    return this.revenueService.getTimeseries({ from, to, bucket, includeBaseline });
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="platform-fee-revenue.csv"')
  exportCsv() {
    return this.revenueService.exportByCollectionCsv();
  }
}
