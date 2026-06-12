// @Roles(...) — attaches the set of roles permitted to call a route handler.
// Read by RolesGuard. No metadata = no role restriction (any authenticated admin).

import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../database/entities/admin-user.entity';

export const ROLES_KEY = 'admin_roles';

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
