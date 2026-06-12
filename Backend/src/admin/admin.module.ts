import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../database/entities/collection.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

// AuthModule supplies JwtAuthGuard + RolesGuard; AuditModule supplies AuditService
// (every privileged action is recorded). The old single shared API key is gone from here.
@Module({
  imports: [TypeOrmModule.forFeature([Collection]), AuthModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
