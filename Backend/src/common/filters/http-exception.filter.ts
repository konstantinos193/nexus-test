// The HTTP exception filter.
// The application's last line of defense before an error becomes a user-facing catastrophe.
// Every thrown exception — planned or otherwise — flows through here and gets
// dressed up in a consistent response envelope before it meets the client.
//
// Think of it as the cleanup crew that arrives after the party.
// The party was your controller throwing an exception.
// The mess is whatever raw error message was about to hit the wire.
// This filter hands it a napkin and a sensible JSON structure.

// NestJS filter primitives — the machinery that powers exception interception.
import {
  ExceptionFilter,    // The interface contract: implement catch() or you're not a filter
  Catch,              // @Catch() decorator — tells NestJS which exceptions to intercept here
  ArgumentsHost,      // The host: contains the HTTP context, the request, the response, the tears
  HttpException,      // NestJS's structured HTTP exception — has a status code and a message body
  HttpStatus,         // HTTP status code constants — so we write INTERNAL_SERVER_ERROR, not 500
} from '@nestjs/common';

// Express's Response type — typed so we can call .status().json() with confidence.
// Unlike raw JavaScript, where you call these and pray the object has those methods.
import { Response } from 'express';

// TypeORM error types — so DB failures get proper HTTP status codes instead of generic 500s.
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';

// PostgreSQL error code for unique constraint violation (e.g. duplicate slug or creator+name).
const PG_UNIQUE_VIOLATION = '23505';
// PostgreSQL error code for foreign key violation.
const PG_FOREIGN_KEY_VIOLATION = '23503';
// PostgreSQL error code for statement timeout (set to 30s in database.module.ts).
const PG_STATEMENT_TIMEOUT = '57014';

/**
 * HttpExceptionFilter
 *
 * A global exception filter that catches every unhandled exception thrown in the
 * NestJS request processing pipeline and transforms it into a consistent JSON response.
 *
 * Why @Catch() with no arguments? Because we catch EVERYTHING.
 * Known HttpExceptions get their proper status codes.
 * Unknown chaos gets 500 INTERNAL_SERVER_ERROR and a polite apology.
 *
 * Response envelope format:
 * {
 *   success: false,      ← always false; this IS the exception filter, after all
 *   error: "message",    ← the human-readable error (if message was a string)
 *   ...message fields,   ← spread if message was an object (HttpException bodies can be objects)
 *   timestamp: "...",    ← when this happened, in ISO 8601, for log correlation
 *   path: "/api/...",    ← which URL triggered this; useful for debugging at 3am
 * }
 *
 * This filter is registered globally in main.ts via app.useGlobalFilters().
 * Every exception in the application ends up here. Every single one.
 * The weight of that responsibility is manageable because we have coffee.
 */
@Catch()  // No argument = catch all exceptions, known and unknown alike
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * catch
   *
   * The single method that defines a filter. Called by NestJS whenever an exception
   * escapes a controller, service, guard, or interceptor without being handled.
   * This is not called for exceptions that are already handled in a try/catch —
   * only the ones that make it all the way out, like survivors of a very bad day.
   *
   * @param exception - The exception that was thrown. Could be anything. Usually isn't pleasant.
   * @param host      - The arguments host — our gateway to the HTTP context and its request/response
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // Switch to the HTTP context so we can access the request and response objects.
    // NestJS supports multiple contexts (HTTP, WebSocket, RPC) — we only care about HTTP here.
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();  // The Express response — we'll call .json() on this
    const request = ctx.getRequest();              // The Express request — we need the URL for the response

    // Determine the HTTP status code and message.
    // Priority: HttpException → TypeORM-specific → generic 500.
    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof QueryFailedError) {
      // Map known PostgreSQL error codes to meaningful HTTP statuses.
      const pgCode = (exception as any).code as string | undefined;
      if (pgCode === PG_UNIQUE_VIOLATION) {
        status = HttpStatus.CONFLICT;  // 409: duplicate slug, duplicate creator+name, etc.
        message = { error: 'A record with these details already exists' };
      } else if (pgCode === PG_FOREIGN_KEY_VIOLATION) {
        status = HttpStatus.UNPROCESSABLE_ENTITY;  // 422: references a non-existent row
        message = { error: 'Referenced record does not exist' };
      } else if (pgCode === PG_STATEMENT_TIMEOUT) {
        status = HttpStatus.SERVICE_UNAVAILABLE;  // 503: query exceeded 30s limit
        message = { error: 'Database query timed out, please try again' };
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = { error: 'Database error' };
      }
    } else if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;  // 404: TypeORM findOneOrFail / findOneByOrFail missed
      message = { error: 'Record not found' };
    } else if (exception instanceof TypeORMError) {
      // Connection pool exhaustion, malformed query, etc.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = { error: 'Database unavailable, please try again shortly' };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { error: 'Internal server error' };
    }

    // Build the error response envelope.
    // success: false is load-bearing — clients check this field before reading data.
    // If message is a string, we wrap it in { error: message }.
    // If message is an object (e.g. { message: [...], error: 'Bad Request' }), we spread it.
    const errorResponse = {
      success: false,
      ...(typeof message === 'string' ? { error: message } : message),
      timestamp: new Date().toISOString(), // When did this go wrong? ISO 8601 so logs can correlate.
      path: request.url,                   // Which endpoint caused this? Essential for debugging.
    };

    // Send the structured error response with the correct HTTP status.
    // This is the only place in the application that sends error responses — by design.
    // Consistent format. Every time. No exceptions to the exception handler. (Pun intended.)
    response.status(status).json(errorResponse);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Exception whisperer, chaos sanitizer, 3am incident responder
// Philosophy: Errors are inevitable. Ugly error responses are a choice.
//             This filter ensures that no matter how badly things break internally,
//             the client receives a clean, consistent, predictable JSON structure.
//             The system may be on fire. The response envelope will remain dignified.
// Note: This filter does NOT log the exception. Logging happens in the services and
//       controllers closer to the source. This filter just shapes the response.
//       If you need to add logging here, add it — but consider whether the source
//       isn't the better place for that conversation with the diary.
// ─────────────────────────────────────────────────────────────────────────────
