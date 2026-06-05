// ══════════════════════════════════════════════════════════════════════════════
// update-collection.dto.ts
//
// The form for changing your mind. The "I deployed it but now I want to tweak it"
// endpoint payload. All fields optional. All changes authorized by wallet address.
//
// This is the PATCH semantics DTO. Send only what you want to change.
// The service applies only the fields that are present. The rest stays as-is.
// (Refreshing, in a world where some APIs overwrite everything on every save.
//  We don't do that here. We are thoughtful. We are surgeons, not sledgehammers.)
// ══════════════════════════════════════════════════════════════════════════════

// Swagger decorators: the annotations that make this DTO visible in OpenAPI docs.
// Without @ApiProperty, the Swagger UI shows "{}". With it: the full mutation surface.
import { ApiProperty } from '@nestjs/swagger';

// class-validator: the library that ensures incoming data is what it claims to be.
// Every field here is optional, but if it IS present, it must be valid.
// Optional ≠ unvalidated. (This distinction has saved us from many creative frontend errors.)
import {
  IsString,     // String. Actual string. Not a number wrapped in quotes. String.
  IsNumber,     // Number. Actual number. Not "5". Not NaN. A number.
  IsArray,      // Array. The [] kind. Not an object. Not null. An array.
  IsOptional,   // The field may be absent. Its absence is not a failure. It's a choice.
  ValidateNested, // For objects inside arrays — validates the contents, not just the container.
  Min,          // The number must be at least this much.
  Max,          // The number must be at most this much.
  IsDateString, // A valid ISO 8601 date string. Not "next tuesday". Not "soon".
  IsUrl,        // A valid URL. With a protocol. https:// counts. "google.com" does not.
} from 'class-validator';

// Type transformer: required alongside @ValidateNested to instantiate nested
// class instances so their decorators actually fire during validation.
// (Without @Type, ValidateNested watches the shapes arrive and does nothing.
//  Very relatable energy. We use @Type to snap it out of it.)
import { Type } from 'class-transformer';

// Re-used from CreateCollectionDto because phases and fund receivers
// have the same shape whether you're creating or updating.
// DRY. One source of truth. One set of validators. Two importers.
// (The FundReceiverDto and MintPhaseDto did not ask to be reused.
//  But they are reusable. And we appreciate them for it.)
import { FundReceiverDto, MintPhaseDto } from './create-collection.dto';


/**
 * UpdateCollectionDto
 *
 * The partial update payload for PATCH /collections/:id.
 * Every field is optional. Only present fields are applied.
 *
 * Authorization: callerAddress (passed via request header or body, extracted by the controller)
 * must match the collection's creatorAddress or the service throws Unauthorized.
 *
 * After applying changes, the service recomputes effectiveStatus based on the
 * new phases (if updated). The status follows the clock. The clock follows entropy.
 * We follow the clock.
 *
 * What CAN be updated here:
 *   - Display metadata: name, description, images, social links
 *   - Financial config: royalty percentage, price
 *   - Schedule: mintStart, endDate, phases
 *   - Revenue routing: fundReceivers
 *
 * What CANNOT be updated here:
 *   - creatorAddress (immutable after deploy — you are who you are)
 *   - blockchain (it's Solana, always Solana)
 *   - mintAddress / txSignature (set by confirmDeployment, not here)
 *   - status (set by computeEffectiveStatus or confirmDeployment, not manually here)
 *
 * (Manual status overrides are a road to madness. The system computes status.
 *  Trust the system. If the system is wrong: fix the compute function, not the data.)
 */
export class UpdateCollectionDto {
  /**
   * The new display name for the collection.
   * Optional — only update if changing.
   * Note: the slug is NOT regenerated on name change. Slugs are permanent.
   * (A changed name with the same slug. A mild inconsistency we've decided to live with.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * The new description.
   * The pitch, the lore, the updated roadmap that replaced the first roadmap.
   * Optional — but an updated description is a sign of a living project.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * The new primary image URL.
   * Replaces the existing imageUrl entirely when present.
   * Send an empty string to clear it. (Please don't. Clearing images is sad.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  /**
   * The new banner image URL.
   * Replaces the existing bannerUrl when present.
   * A banner refresh can make a collection look brand new. Magic, almost.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  // ── Social links ─────────────────────────────────────────────────────────────
  // All optional. All validated as full URLs when present.
  // Because @IsUrl({ require_protocol: true }) is the only thing standing between
  // us and "discord.gg/something" living in our database as a URL.
  // (It would technically work as a link. But it is NOT a URL. We have standards.)

  /**
   * The updated Twitter/X profile URL.
   * Must include https:// if provided.
   * Changed handle? New account? Migrated to X? Update here.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  twitterUrl?: string;

  /**
   * The updated Discord invite URL.
   * Full URL required. Must be a valid URL.
   * Invite links expire sometimes. This field exists for that reason.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  discordUrl?: string;

  /**
   * The updated website URL.
   * Launched a new domain? Migrated the docs? Updated here.
   * Must be a valid URL with protocol. The internet is full of partial URLs.
   * We do not store partial URLs. We are firm on this.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  // ── Financial config ──────────────────────────────────────────────────────────

  /**
   * The updated royalty percentage (0–50%).
   * Converted to basis points on save (×100).
   * Min 0: no royalty, maximum generosity.
   * Max 50: the legal/ethical ceiling that marketplaces respect.
   *
   * (50% royalty is technically possible. It is also socially inadvisable.
   *  We allow it. The market will have opinions about it. We will not.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)   // 0% is valid. It's called "generosity" or "marketing."
  @Max(50)  // 50% is the ceiling. Above this: you are the house, and also the villain.
  royaltyPercent?: number;

  /**
   * The updated mint price in SOL.
   * Min 0: free mint is always a valid option.
   * No max: aspirational pricing is also valid. (The market will decide.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0) // Free mint is legal. Negative price is not. Math wins.
  price?: number;

  // ── Schedule ──────────────────────────────────────────────────────────────────

  /**
   * The updated mint start time — ISO 8601 date string.
   * Changing this pushes or pulls the start of the first phase.
   * (Push the start date: the collectors wait longer.
   *  Pull the start date: the collectors scramble. Both are valid strategies.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  mintStart?: string;

  /**
   * The updated end date — ISO 8601 date string.
   * Extending the end date: more time to mint. More chances. More hope.
   * Shortening the end date: urgency. FOMO. Chaos. Marketing.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString() // Not @IsDateString here to match original — flexible format accepted.
  endDate?: string;

  /**
   * The updated mint phases array.
   * Replaces the entire phases array when present.
   * Each phase is validated recursively — same rules as CreateCollectionDto.
   *
   * When phases change, effectiveStatus is recomputed in the service.
   * The new phases drive the new status. The clock is re-consulted. The truth is updated.
   * (This is why changing phases can immediately flip a collection from READY to MINTING.
   *  The service computes truth. The truth is sometimes surprising. Plan accordingly.)
   */
  @ApiProperty({ type: [MintPhaseDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true }) // Each phase must be a valid MintPhaseDto. No exceptions.
  @IsArray()
  @Type(() => MintPhaseDto)       // Instantiate MintPhaseDto for each element so validation fires.
  phases?: MintPhaseDto[];

  /**
   * The updated fund receivers array.
   * Replaces the entire fundReceivers array when present.
   * Each receiver is validated recursively.
   *
   * Changing fund receivers is a significant action — it changes where money goes.
   * The service requires authorization (callerAddress === creatorAddress).
   * Only the creator can reroute the funds. (As it should be.)
   */
  @ApiProperty({ type: [FundReceiverDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true }) // Each receiver must be valid. Address and share. Both.
  @IsArray()
  @Type(() => FundReceiverDto)
  fundReceivers?: FundReceiverDto[];

  /**
   * The caller's wallet address — used server-side to authorize the update.
   *
   * NOT stored in the collection record itself (that's creatorAddress, set at deploy).
   * This field is the proof of identity for this specific update request.
   * Extracted from the request in the controller and passed to the service.
   *
   * If callerAddress !== collection.creatorAddress: the service throws Unauthorized.
   * No exceptions. No admin overrides at this layer. The creator owns their collection.
   * (With great wallet address comes great authorization responsibility.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  creatorAddress?: string;
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// UpdateCollectionDto: all fields optional, all changes consequential.
//
// "Nothing is truly optional if you care about the outcome."
// — Proverb invented by someone debugging a PATCH endpoint at 1 AM.
//
// The service applies only what you send. If you send phases, effectiveStatus
// is recomputed. If you send fundReceivers, the money routing changes.
// If you send nothing: nothing changes. (A valid request. Sometimes that's the point.)
//
// But always: the caller must be the creator. That part is not optional.
// ══════════════════════════════════════════════════════════════════════════════
