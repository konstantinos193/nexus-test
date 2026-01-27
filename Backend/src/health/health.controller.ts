import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { SolanaService } from '../solana/solana.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private solana: SolanaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      solana: 'unknown',
    };

    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch (error) {
      health.status = 'error';
      health.database = 'disconnected';
    }

    try {
      // Test Solana connection
      const networkInfo = await this.solana.getNetworkInfo();
      health.solana = 'connected';
      health['solanaNetwork'] = networkInfo.network;
    } catch (error) {
      health.status = health.status === 'error' ? 'error' : 'partial';
      health.solana = 'disconnected';
    }

    return health;
  }
}
