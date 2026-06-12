// AuthModule — owns admin identity and exports the guards every protected feature uses.
//
// Imports AuditModule (one-directional) so logins and user changes are recorded.
// Exports AuthService + both guards so AdminModule/RevenueModule/etc. can apply them
// without re-providing anything.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdminUser } from '../database/entities/admin-user.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser]), ConfigModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
