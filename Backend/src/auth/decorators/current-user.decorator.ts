// @CurrentUser() — pulls the authenticated admin (attached by JwtAuthGuard) off the request.
// Use in controllers to attribute actions to a person: who featured this, who deleted that.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthedAdmin {
  id: string;
  email: string;
  role: string;
  displayName: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedAdmin | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.adminUser;
  },
);
