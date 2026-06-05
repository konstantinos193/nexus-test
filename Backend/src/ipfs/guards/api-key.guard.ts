/**
 * API Key Guard
 *
 * The velvet rope of this application.
 * The bouncer at the club door who has seen everything and is impressed by nothing.
 * The stoic gatekeeper who cares about one thing and one thing only:
 * do you have the key?
 *
 * Secures all IPFS write endpoints (upload, pin, unpin) by validating the API key
 * from the incoming request headers. Two formats accepted, because we are generous:
 * - x-api-key header (the classic, the workhorse)
 * - Authorization: Bearer <key> (the fancy, for people who've read OAuth docs)
 *
 * No key? 401. Wrong key? Also 401. Right key? Welcome to the party.
 * We don't do guest lists. We do cryptographic secrets.
 *
 * In production: API_KEY must be set or the service refuses to boot entirely.
 * This is not excessive caution. This is wisdom born from reading incident reports.
 */

// NestJS essentials for implementing a guard. Without these, there is no door. Just an opening.
import {
  Injectable,         // Makes this class injectable — NestJS will manage its lifecycle
  CanActivate,        // The guard interface: canActivate returns true (enter) or throws (turn away)
  ExecutionContext,   // The context containing the incoming request and all its secrets
  HttpException,      // Structured HTTP error — used to return 401s with dignity
  HttpStatus,         // HTTP status codes — 401 UNAUTHORIZED is this file's primary export emotionally
  Logger,             // The bouncer's clipboard — notes every suspicious entry and refusal
} from '@nestjs/common';

// ConfigService: reads the API_KEY from the environment, where all secrets should live.
// Not in the code. Never in the code. The code is not a vault.
import { ConfigService } from '@nestjs/config';

/**
 * ApiKeyGuard
 *
 * Implements CanActivate — the single method contract that decides whether
 * a request is allowed through. Returns true = access granted. Throws = access denied.
 *
 * Registered as a provider in IpfsModule and applied per-endpoint with @UseGuards(ApiKeyGuard).
 * Not global (by design) — only IPFS write operations need this level of scrutiny.
 * Read operations are public, because information wants to be free. Uploads do not.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  /** The bouncer's personal log. Rejections recorded without mercy or explanation. */
  private readonly logger = new Logger(ApiKeyGuard.name);

  /** The single valid API key. Loaded at startup. Compared on every protected request. */
  private readonly validApiKey: string;

  /**
   * Constructor
   *
   * Loads the API key from environment on instantiation — at module initialization time,
   * before any requests arrive. If we're in production and the key is missing,
   * we throw immediately and refuse to start. No silent failures. No open doors.
   * The bouncer was hired to check keys. No key configured = the bouncer quits on the spot.
   *
   * @param configService - NestJS ConfigService, reads from process.env / .env file
   */
  constructor(private configService: ConfigService) {
    // Read the API key from the environment. This is its rightful home.
    this.validApiKey = this.configService.get<string>('API_KEY');

    if (!this.validApiKey) {
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      if (isProduction) {
        // Production without an API key is an open door to an NFT launchpad.
        // That is not a security posture. That is a security catastrophe.
        // We throw at startup — fast-fail is better than slow disaster.
        throw new Error('API_KEY must be set in production. Refusing to start with an open guard.');
      }

      // Non-production: warn loudly but allow it. Developers need to run things locally.
      // But they should feel at least mildly judged for this.
      this.logger.warn('API_KEY not set in environment. Admin endpoints will be unsecured!');
    }
  }

  /**
   * canActivate
   *
   * The core method. Called by NestJS for every request hitting a guarded endpoint.
   * Returns true if the request is authorized. Throws 401 if it is not.
   * There is no middle ground. The bouncer does not negotiate.
   *
   * @param context - The execution context — contains the HTTP request with all its headers
   * @returns true if the API key is valid and the request may proceed
   * @throws HttpException(401) if the key is missing or incorrect
   */
  canActivate(context: ExecutionContext): boolean {
    // Special case: no API key configured in a non-production environment.
    // This means the velvet rope has no electrics — it's just a rope. Anyone can step over it.
    // We log this prominently so developers know they're operating without a safety net.
    if (!this.validApiKey) {
      this.logger.warn('Allowing request without API key validation (API_KEY not configured)');
      return true;
    }

    // Extract the HTTP request from the execution context.
    // The request is where all the good evidence lives: headers, IP, URL.
    const request = context.switchToHttp().getRequest();

    // Attempt to extract the API key from the request headers.
    // Two formats are supported; if neither is present, the key is null.
    const apiKey = this.extractApiKey(request);

    // Case 1: No key whatsoever. The visitor arrived without ID.
    // Classic confidence move. Does not work here.
    if (!apiKey) {
      this.logger.warn('Request rejected: No API key provided');
      throw new HttpException(
        'Unauthorized: API key required',
        HttpStatus.UNAUTHORIZED,  // 401: the polite way of saying "not today"
      );
    }

    // Case 2: A key was provided, but it's the wrong one.
    // Either they guessed, they're testing, or they're using someone else's key.
    // All of the above result in the same outcome: 401.
    if (apiKey !== this.validApiKey) {
      this.logger.warn('Request rejected: Invalid API key');
      throw new HttpException(
        'Unauthorized: Invalid API key',
        HttpStatus.UNAUTHORIZED,  // Still 401. The number does not change based on effort.
      );
    }

    // Case 3: The key is correct. The velvet rope lifts. The visitor may enter.
    // Log the success with IP and endpoint for auditing purposes.
    // (The auditing is for security. And a little bit for the feeling of power.)
    const ip = request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
    this.logger.log(`API key accepted — endpoint: ${request.method} ${request.url}, ip: ${ip}`);
    return true;
  }

  /**
   * extractApiKey
   *
   * Checks the request headers for an API key in either of two supported formats:
   *
   * 1. x-api-key: <key>
   *    The most direct approach. Used by tools like Postman, curl, and people who
   *    know exactly what they're doing (or followed the README).
   *
   * 2. Authorization: Bearer <key>
   *    The OAuth-style format. Used by people who are very familiar with auth standards
   *    and have opinions about it. Also valid. Also accepted.
   *
   * @param request - The raw HTTP request object (Express.Request under the hood)
   * @returns The extracted API key string, or null if neither header was present
   */
  private extractApiKey(request: any): string | null {
    // Method 1: Direct x-api-key header check.
    // Simple, explicit, gets the job done without ceremony.
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;  // Found it. No need to look further.
    }

    // Method 2: Authorization: Bearer <key> format.
    // We strip the 'Bearer ' prefix (7 characters) to get the raw key.
    // If the header doesn't start with 'Bearer ', it's not our format — return null.
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);  // 'Bearer ' is exactly 7 characters. Math works.
    }

    // Neither format was found. The request arrived without credentials.
    // Return null — the canActivate method will handle the rejection with style.
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Head of Security, Velvet Rope Division, NFT Launchpad Branch
// Policy: No key, no access. Wrong key, also no access. Correct key, brief nod of
//         acknowledgment, quiet logging of your IP, access granted.
// Note: This guard protects upload and pin endpoints — the write operations.
//       Read operations (metadata, retrieve, pins) are intentionally public.
//       That is not a bug. That is the IPFS model. Content-addressed storage
//       is public by design. The security is about who gets to add new content.
// Philosophy: The velvet rope only works if someone is holding it.
//             That someone is this class. It holds the rope every time.
// ─────────────────────────────────────────────────────────────────────────────
