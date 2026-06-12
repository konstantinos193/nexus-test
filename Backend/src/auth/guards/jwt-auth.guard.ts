// JwtAuthGuard — the human-facing door to the owner console.
//
// Validates a Bearer token, loads the live admin (so disabled accounts are locked out
// immediately, not just when their token expires), and attaches it to req.adminUser for
// downstream @CurrentUser() / RolesGuard. Throws 401 when there is no valid token.

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const admin = await this.authService.validateToken(token);
    if (!admin) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    req.adminUser = admin; // Available to @CurrentUser() and RolesGuard.
    return true;
  }

  private extractBearer(req: any): string | null {
    const header = req.headers?.['authorization'];
    if (header && header.startsWith('Bearer ')) {
      return header.substring(7);
    }
    return null;
  }
}
