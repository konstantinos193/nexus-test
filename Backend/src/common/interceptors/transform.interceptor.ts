// The response transform interceptor.
// The application's response normalization middleware — the layer that ensures
// every successful response wears the same jacket before going out in public.
//
// Without this, some endpoints return { success: true, data: ... }
// and others return raw objects and everyone is confused by page two.
// With this, everything is consistent. Consistency is love.
// (Consistency is also a basic API contract. But love sounds nicer.)

// NestJS interceptor machinery — the building blocks of request/response pipeline middleware.
import {
  Injectable,         // Makes this class injectable — NestJS will manage its creation
  NestInterceptor,    // The interface contract: implement intercept() or you're not an interceptor
  ExecutionContext,   // The context of the current request — we look but don't touch
  CallHandler,        // The "next" in the pipeline — calling handle() passes through to the controller
} from '@nestjs/common';

// RxJS Observable — the reactive stream that NestJS uses for response handling.
// Every response in NestJS is an Observable under the hood. Embrace it.
import { Observable } from 'rxjs';

// RxJS map operator — transforms each emission in a stream.
// We use it to inspect and optionally wrap each response before it leaves the server.
import { map } from 'rxjs/operators';

/**
 * TransformInterceptor
 *
 * A global response interceptor that ensures every successful HTTP response
 * from this application follows the same envelope format:
 *
 * {
 *   success: true,
 *   data: <whatever the controller returned>
 * }
 *
 * Why? Because consistent API responses are better for frontend developers,
 * better for SDK consumers, and better for Juan's sanity when debugging issues.
 *
 * Smart behavior: if the response already has a `success` property
 * (which all our controllers provide explicitly), we pass it through unchanged.
 * This prevents double-wrapping — { success: true, data: { success: true, data: ... } }
 * which would be deeply embarrassing and incorrect.
 *
 * Registered globally in main.ts via app.useGlobalInterceptors().
 * Every successful response flows through here. Every single one.
 * Unlike my motivation, which is not globally available on Monday mornings.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  /**
   * intercept
   *
   * The single required method of NestInterceptor. Called by NestJS for every request
   * BEFORE and AFTER the controller handler runs. We use the `next.handle()` call
   * to let the controller do its work, then we intercept the response on the way out
   * via the RxJS pipe.
   *
   * @param context - The execution context — HTTP request/response and all metadata (we ignore these)
   * @param next    - The call handler — calling next.handle() runs the actual controller method
   * @returns An Observable of the (possibly wrapped) response data
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      // map() transforms each emission in the response stream.
      // For HTTP, there's exactly one emission: the controller's return value.
      map((data) => {
        // Check: does this response already have a `success` property?
        // If yes, the controller (or a previous layer) already wrapped it correctly.
        // Pass through unchanged — no double-wrapping, no double-enveloping, no drama.
        if (data && typeof data === 'object' && 'success' in data) {
          return data;  // Already wrapped. This controller did its homework. Respect.
        }

        // No `success` property? The controller returned a raw value.
        // Wrap it in the standard success envelope — consistent, predictable, professionally dressed.
        // This handles edge cases where controllers return plain objects, arrays, or simple values
        // without wrapping them manually. The interceptor has their back.
        return {
          success: true,  // The affirmation. The green light. The "yes, this worked."
          data,           // The actual content — whatever the controller produced
        };
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: Response shapeshifter, consistency enforcer, RxJS stream therapist
// Philosophy: A consistent API response format is a form of respect.
//             It says "I thought about you, the consumer, when I wrote this."
//             It says "you will always know what shape the data arrives in."
//             It says "I got enough sleep before writing this layer."
//             (Two of those three statements are true.)
// Note: This interceptor only runs on successful responses.
//       Errors take a different path — through HttpExceptionFilter.
//       The two layers together ensure 100% of responses are consistently shaped.
//       Success and failure, both wearing the same sensible jacket.
// ─────────────────────────────────────────────────────────────────────────────
