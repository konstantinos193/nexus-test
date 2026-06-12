// AuditModule — provides AuditService to anyone who records or reads privileged actions.
// Intentionally has no controller and imports no other feature module, so it can be a
// safe leaf dependency of AuthModule, AdminModule, etc. without creating import cycles.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
