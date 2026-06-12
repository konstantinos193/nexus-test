// RolesGuard — enforces @Roles(...) on a route. Runs AFTER JwtAuthGuard (which attaches
// req.adminUser). super_admin always passes. No @Roles metadata = any authenticated admin.

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminRole } from '../../database/entities/admin-user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No role restriction declared — any authenticated admin may proceed.
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.adminUser;
    if (!user) {
      throw new ForbiddenException('No authenticated admin on request');
    }

    // The super admin is omnipotent by design.
    if (user.role === AdminRole.SUPER_ADMIN) return true;

    if (!required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
