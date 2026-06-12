// AuthService — the owner console's identity layer.
//
// Real accounts, hashed passwords, signed sessions, role checks. Replaces the old
// "any credentials log in" stub. On startup it seeds a first super-admin so a fresh
// deployment is reachable; after that, admins are managed through the API.

import { Injectable, Logger, OnModuleInit, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminUser, AdminRole } from '../database/entities/admin-user.entity';
import { AuditService } from '../audit/audit.service';
import { hashPassword, verifyPassword } from './password.util';
import { signJwt, verifyJwt } from './jwt.util';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AuthedAdmin } from './decorators/current-user.decorator';

/** Shape returned to clients — never includes passwordHash. */
export interface SafeAdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  disabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_TTL_SECONDS = 8 * 60 * 60; // 8 hours.

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly ttlSeconds: number;

  constructor(
    @InjectRepository(AdminUser)
    private readonly users: Repository<AdminUser>,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    // Prefer a dedicated JWT secret; fall back to the existing API_KEY so deployments that
    // already set one keep working. In production we refuse to run on the dev fallback.
    const secret =
      this.config.get<string>('JWT_SECRET') || this.config.get<string>('API_KEY') || '';
    if (!secret) {
      if (isProd) {
        throw new Error('JWT_SECRET (or API_KEY) must be set in production for admin auth.');
      }
      this.logger.warn('No JWT_SECRET/API_KEY set — using an insecure dev secret. Do NOT use in production.');
    }
    this.jwtSecret = secret || 'nexus-dev-insecure-secret';
    this.ttlSeconds = Number(this.config.get<string>('JWT_TTL_SECONDS')) || DEFAULT_TTL_SECONDS;
  }

  /** Seed the first super-admin if the table is empty, so a fresh deploy is reachable. */
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.users.count();
      if (count > 0) return;

      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      const email = (this.config.get<string>('ADMIN_SEED_EMAIL') || (isProd ? '' : 'admin@nexus.local')).toLowerCase();
      const password = this.config.get<string>('ADMIN_SEED_PASSWORD') || (isProd ? '' : 'changeme123');

      if (!email || !password) {
        this.logger.warn('No admin accounts and no ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD set — skipping seed. Create one via the API.');
        return;
      }

      await this.users.save(
        this.users.create({
          email,
          passwordHash: hashPassword(password),
          displayName: 'Platform Owner',
          role: AdminRole.SUPER_ADMIN,
          disabled: false,
        }),
      );
      this.logger.log(`Seeded initial super-admin: ${email}${isProd ? '' : ' (dev default password — change it)'}`);
    } catch (e) {
      // Most likely the migration hasn't run yet. Don't crash the app over it.
      this.logger.warn('Admin seed skipped (is the admin_user table migrated?): ' + ((e as any)?.message ?? e));
    }
  }

  private nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  private safe(u: AdminUser): SafeAdminUser {
    const { passwordHash, ...rest } = u;
    return rest;
  }

  /** Authenticate and issue a session token. */
  async login(email: string, password: string, ip?: string): Promise<{ token: string; expiresIn: number; user: SafeAdminUser }> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    // Uniform failure: never reveal whether the email exists.
    if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.users.save(user);

    const token = signJwt(
      { sub: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      this.ttlSeconds,
      this.nowSec(),
    );

    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.login',
      targetType: 'admin_user',
      targetId: user.id,
      ip,
    });

    return { token, expiresIn: this.ttlSeconds, user: this.safe(user) };
  }

  /** Validate a bearer token and return the live admin (or null). Disabled users are rejected. */
  async validateToken(token: string): Promise<AuthedAdmin | null> {
    const payload = verifyJwt(token, this.jwtSecret, this.nowSec());
    if (!payload) return null;
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || user.disabled) return null;
    return { id: user.id, email: user.email, role: user.role, displayName: user.displayName };
  }

  async listUsers(): Promise<SafeAdminUser[]> {
    const all = await this.users.find({ order: { createdAt: 'ASC' } });
    return all.map((u) => this.safe(u));
  }

  async createUser(dto: CreateAdminUserDto, actor: AuthedAdmin, ip?: string): Promise<SafeAdminUser> {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An admin with that email already exists');
    }
    const saved = await this.users.save(
      this.users.create({
        email,
        passwordHash: hashPassword(dto.password),
        displayName: dto.displayName,
        role: dto.role,
        disabled: false,
      }),
    );
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'admin_user.create',
      targetType: 'admin_user',
      targetId: saved.id,
      metadata: { email, role: dto.role },
      ip,
    });
    return this.safe(saved);
  }

  async updateUser(id: string, dto: UpdateAdminUserDto, actor: AuthedAdmin, ip?: string): Promise<SafeAdminUser> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Admin user not found');

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.disabled !== undefined) user.disabled = dto.disabled;
    if (dto.password !== undefined) user.passwordHash = hashPassword(dto.password);

    const saved = await this.users.save(user);
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'admin_user.update',
      targetType: 'admin_user',
      targetId: id,
      metadata: { role: dto.role, disabled: dto.disabled, passwordChanged: dto.password !== undefined },
      ip,
    });
    return this.safe(saved);
  }
}
