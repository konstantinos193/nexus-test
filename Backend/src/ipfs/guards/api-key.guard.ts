/**
 * API Key Guard
 * 
 * Secures IPFS endpoints by validating API key from request headers.
 * Only requests with valid API_KEY will be allowed to post/upload to IPFS.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKey: string;

  constructor(private configService: ConfigService) {
    // Get API key from environment
    this.validApiKey = this.configService.get<string>('API_KEY');
    
    if (!this.validApiKey) {
      this.logger.warn('API_KEY not set in environment. IPFS endpoints will be unsecured!');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // If no API key is configured, allow all requests (for development)
    // In production, this should always be set
    if (!this.validApiKey) {
      this.logger.warn('Allowing request without API key validation (API_KEY not configured)');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('Request rejected: No API key provided');
      throw new HttpException(
        'Unauthorized: API key required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (apiKey !== this.validApiKey) {
      this.logger.warn('Request rejected: Invalid API key');
      throw new HttpException(
        'Unauthorized: Invalid API key',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }

  /**
   * Extract API key from request headers
   * Supports both 'x-api-key' and 'Authorization: Bearer <key>' formats
   */
  private extractApiKey(request: any): string | null {
    // Check for x-api-key header
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    // Check for Authorization: Bearer <key>
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
