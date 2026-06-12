// AuthController — login + session + admin-user management for the owner console.
//
//   POST /api/admin/auth/login      (public)        → { token, expiresIn, user }
//   GET  /api/admin/auth/me         (any admin)     → current admin
//   GET  /api/admin/auth/users      (super_admin)   → list admins
//   POST /api/admin/auth/users      (super_admin)   → create admin
//   PATCH /api/admin/auth/users/:id (super_admin)   → update admin (role/disable/password)

import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, AuthedAdmin } from './decorators/current-user.decorator';
import { AdminRole } from '../database/entities/admin-user.entity';

@Controller('api/admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto.email, dto.password, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthedAdmin) {
    return user;
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  listUsers() {
    return this.authService.listUsers();
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  createUser(@Body() dto: CreateAdminUserDto, @CurrentUser() actor: AuthedAdmin, @Ip() ip: string) {
    return this.authService.createUser(dto, actor, ip);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() actor: AuthedAdmin,
    @Ip() ip: string,
  ) {
    return this.authService.updateUser(id, dto, actor, ip);
  }
}
