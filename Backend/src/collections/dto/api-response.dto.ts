// ══════════════════════════════════════════════════════════════════════════════
// api-response.dto.ts
//
// The envelope. The wrapper. The thing we put our data inside before handing it
// to the outside world, so the outside world always knows what shape to expect.
//
// Three fields: success, data, error. That's it.
// We didn't over-engineer this one. We are proud of that.
// ══════════════════════════════════════════════════════════════════════════════

// @nestjs/swagger: the decorator that generates OpenAPI documentation from class shapes.
// Without @ApiProperty, Swagger sees a class and shrugs.
// With @ApiProperty, Swagger sees a class and produces beautiful documentation.
// (The documentation that nobody reads until something breaks and they need to debug it.)
import { ApiProperty } from '@nestjs/swagger';


/**
 * ApiResponseDto<T>
 *
 * The universal response envelope for this API.
 * Every endpoint wraps its payload in one of these so the client always has
 * a consistent shape to destructure. No more "is it data.data or just data?"
 * (We've all suffered through APIs that couldn't decide. This is not that API.)
 *
 * Anatomy of a response:
 *   success: boolean  — Did this work? true = yes. false = no. No ambiguity.
 *   data?:   T        — The payload, when success is true. Generic so it fits everything.
 *   error?:  string   — The error message, when success is false. Human-readable, ideally.
 *   message?: string  — An optional human-readable context message. The "here's what happened" field.
 *
 * Generic parameter T allows this DTO to wrap any payload type:
 *   ApiResponseDto<NFTCollection>     — single collection response
 *   ApiResponseDto<NFTCollection[]>   — list response
 *   ApiResponseDto<{ slug: string }>  — minimal deployment response
 *   ApiResponseDto<void>              — "it worked, nothing to return" response
 *
 * (Yes, ApiResponseDto<void> is a valid mood.)
 */
export class ApiResponseDto<T> {
  /**
   * Whether the operation succeeded.
   *
   * true  = request was processed, data may be present
   * false = something went wrong, error may be present
   *
   * Always present. Never optional. The first thing you check.
   * Unlike my code reviews, which are sometimes optional and always late.
   */
  @ApiProperty()
  success: boolean;

  /**
   * The response payload.
   *
   * Present when success = true. Absent (undefined) when success = false.
   * Type T is whatever the endpoint promised to return.
   * Trust the type. The type is a contract. Respect the contract.
   */
  @ApiProperty({ required: false })
  data?: T;

  /**
   * The error message.
   *
   * Present when success = false. Absent when everything is fine.
   * Human-readable. Actionable, ideally. Not "An error occurred."
   * (Never "An error occurred." That tells us nothing. Nothing at all.)
   */
  @ApiProperty({ required: false })
  error?: string;

  /**
   * An optional contextual message.
   *
   * The "more information" field. Can be present on both success and failure.
   * Used for things like "Collection created. Awaiting on-chain confirmation."
   * (The optimistic message. The one that says "we tried." We always try.)
   */
  @ApiProperty({ required: false })
  message?: string;
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// ApiResponseDto: the consistent wrapper that every API should have and most don't.
// It's small. It's boring. It saves the frontend developer from writing
// try { JSON.parse(res) } catch { also try JSON.parse(res.body) }
// for the 40th time in their career.
//
// Small kindnesses compound. This is a small kindness.
// ══════════════════════════════════════════════════════════════════════════════
