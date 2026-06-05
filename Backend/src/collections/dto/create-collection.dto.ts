// ══════════════════════════════════════════════════════════════════════════════
// create-collection.dto.ts
//
// The form that a creator fills out before unleashing an NFT collection
// upon the world. Every field here is a decision. Some decisions are required.
// Most are optional — because at step 1, hope is the only mandatory field.
//
// This DTO represents the payload that arrives from the frontend after the
// creator has gone through the multi-step launch wizard. It is validated.
// It is whitelisted. It is handled with appropriate suspicion.
// ══════════════════════════════════════════════════════════════════════════════

// @nestjs/swagger: for generating beautiful documentation of request bodies.
// Without @ApiProperty, the Swagger UI shows "{}". With it: the full picture.
import { ApiProperty } from '@nestjs/swagger';

// class-validator: the library that ensures what arrives matches what we expected.
// Because the frontend sends whatever it wants, and we validate anyway.
// (Always validate. Even from yourself. Especially from yourself.)
import {
  IsString,    // It must be a string. A real string. Not a number pretending to be a string.
  IsNumber,    // It must be a number. A real number. Not "5" in quotes.
  IsBoolean,   // It must be true or false. Not "true". Not 1. true.
  IsArray,     // It must be an array. An actual [] array.
  IsEnum,      // It must be one of the allowed values. The whitelist approach.
  IsOptional,  // The field is optional. Its absence is not a crime.
  ValidateNested, // For validating objects inside arrays. Recursion, but controlled.
  Min,         // The value must be >= this number. We have standards.
  Max,         // The value must be <= this number. We also have ceilings.
  IsNotEmpty,  // Empty strings are not values. They are lies. This enforces honesty.
  IsDateString, // It must be a valid ISO 8601 date string. Not "tomorrow". Not "soon".
  IsUrl,       // It must be a valid URL. Not "google" or "my website". An actual URL.
} from 'class-validator';

// Type transformer: works with ValidateNested to instantiate nested class instances
// so class-validator can validate their fields too.
// (Without @Type, nested objects arrive as plain objects and validation is skipped.
//  Sneaky. We've seen it in production. We don't talk about that sprint.)
import { Type } from 'class-transformer';


// ── Sub-DTOs ──────────────────────────────────────────────────────────────────
// The building blocks that CreateCollectionDto is composed of.
// Each gets its own class so validation can be applied recursively.


/**
 * FundReceiverDto
 *
 * Defines one recipient in the mint proceeds distribution.
 * The collection can have multiple fund receivers, splitting revenue
 * between the creator, co-founders, team members, charity wallets — you name it.
 *
 * Fields:
 *   address — the Solana wallet that receives this share
 *   share   — the percentage or share amount (as a string because percentages
 *              from forms often arrive as strings before conversion)
 *
 * The array of FundReceiverDtos should add up to 100%.
 * (They don't always. We validate at write time. We do what we can.)
 */
export class FundReceiverDto {
  /**
   * The recipient wallet address (Solana base58 public key).
   * Where the money goes. The most important field in this DTO.
   * (Possibly the most important field in the entire system.
   *  Wrong address = money gone = very bad Monday.)
   */
  @ApiProperty()
  @IsString()
  address: string;

  /**
   * The percentage share allocated to this receiver.
   * Stored as a string because form inputs are strings and we'd rather
   * validate format before converting than convert and then validate.
   * (String = "50", "25.5", "100". Not NaN. Not "half".)
   */
  @ApiProperty()
  @IsString()
  share: string;
}


/**
 * MintPhaseDto
 *
 * Defines one phase of a collection's mint schedule.
 * A collection can have multiple phases — public sale, allowlist round,
 * team mint, free claim window, etc. Each phase is a window in time.
 *
 * Phases are stored as a JSONB array on the Collection entity.
 * They drive computeEffectiveStatus() — the phase schedule determines
 * when the collection transitions from READY → MINTING → COMPLETED.
 *
 * (The phases are the heartbeat. The cron listens to the heartbeat.
 *  This is how time and blockchain are reconciled. Elegantly. Mostly.)
 */
export class MintPhaseDto {
  /**
   * The phase's display name.
   * "Public Sale", "Whitelist Round 1", "Team Mint", "Free Claim" — whatever the creator decides.
   * Shown in the UI. Required because unnamed phases are unnamed chaos.
   */
  @ApiProperty()
  @IsString()
  name: string;

  /**
   * When this phase begins — ISO 8601 date string.
   * Required. A phase without a start time is a phase that never begins.
   * (And a collection that never begins is a draft that never shipped.
   *  We've been that collection. It's not a great feeling.)
   */
  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  startDateTime: string;

  /**
   * When this phase ends — ISO 8601 date string.
   * Optional — some phases run indefinitely (open editions, "until sold out" patterns).
   * When present, it contributes to the COMPLETED status transition.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDateTime?: string;

  /**
   * Whether this phase is public or allowlist-gated.
   * 'public'    — anyone with SOL can mint. The democratic approach.
   * 'allowlist' — only wallets on the allowlist can mint. The exclusive approach.
   *               (With great exclusivity comes great demand. Allegedly.)
   */
  @ApiProperty({ enum: ['public', 'allowlist'] })
  @IsEnum(['public', 'allowlist'])
  phaseType: 'public' | 'allowlist';

  /**
   * A phase-specific price override (as a string, converted downstream).
   * Allows "allowlist gets 0.5 SOL, public gets 1 SOL" pricing models.
   * Optional — defaults to the collection's base price if omitted.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  priceOverride?: string;

  /**
   * The raw allowlist data — wallet addresses, one per line, for allowlist phases.
   * Stored as a string because it arrives from a textarea in the wizard.
   * Parsed server-side or on-chain into a Merkle tree for efficient verification.
   * (A Merkle tree for an allowlist: cryptography in service of FOMO. Poetic.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  allowlistRaw?: string;

  /**
   * Maximum mints per wallet during this phase (as a string).
   * "1" means sybil-resistant. "∞" means you trust people. (Don't trust people.)
   * Optional — defaults to the collection's global limit if omitted.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maxPerWallet?: string;

  /**
   * Maximum supply for this phase (as a string).
   * Allows phased supply releases — e.g., "first 500 for allowlist, rest for public."
   * Optional — defaults to the collection's total supply if omitted.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maxSupply?: string;
}


// ── Main DTO ──────────────────────────────────────────────────────────────────

/**
 * CreateCollectionDto
 *
 * The payload shape for POST /collections/deploy.
 *
 * Sent by the frontend after the creator has completed the launch wizard.
 * At this point, the on-chain transaction may have already been signed
 * (collectionAddress + txSignature), or we're recording the intent pre-sign.
 *
 * Required fields (always):
 *   name, symbol, description, creatorAddress
 *
 * Optional fields (filled during specific wizard steps):
 *   uri / metadataUri   — after IPFS upload (step 2)
 *   totalSupply, mintPrice, royaltyPercent — after supply config (step 2)
 *   phases, fundReceivers — after schedule config (step 3)
 *   collectionAddress, txSignature — after on-chain deployment (step 4)
 *
 * Why are so many fields optional? Because creators start the process with just
 * a name and a dream, and fill in the rest as they go through the wizard.
 * The backend is accommodating. The blockchain is not. We bridge the gap.
 */
export class CreateCollectionDto {
  /**
   * The collection's display name.
   * The first and most important decision a creator makes.
   * It will end up on-chain. It will end up in the slug.
   * It cannot easily be changed. Choose wisely.
   * (They almost never choose wisely on the first try. The update endpoint exists for this reason.)
   */
  @ApiProperty()
  @IsString()
  name: string;

  /**
   * The on-chain token symbol (e.g., "MONK" for a monkey collection).
   * Short. Uppercase. Memorable. Usually 3-5 characters.
   * (Stored on-chain as part of the token metadata. Permanent. Choose wisely here too.)
   */
  @ApiProperty()
  @IsString()
  symbol: string;

  /**
   * A description of the collection — the pitch, the lore, the elevator speech.
   * Shown on the detail page. Shown in marketplace listings.
   * Shown in Swagger documentation by the developer who wrote this comment.
   */
  @ApiProperty()
  @IsString()
  description: string;

  /**
   * The creator's Solana wallet address (base58 public key).
   * The identity that will be recorded as the collection's owner.
   * Also used for authorization on update/confirm endpoints.
   * (This address is trusted. Don't let the frontend lie about it.
   *  The signature verification happens on-chain. We record what they tell us.)
   */
  @ApiProperty()
  @IsString()
  creatorAddress: string;

  // ── IPFS / metadata URI ─────────────────────────────────────────────────────
  // Optional at step 1; filled in step 2 after media upload.
  // Two fields for the same concept (uri / metadataUri) because the frontend
  // was once inconsistent about which name it used. We handle both. We're flexible.
  // (Flexibility in the face of frontend inconsistency: the backend developer's curse.)

  /**
   * The IPFS base URI for the collection's metadata.
   * Optional at creation time — set after media upload in the wizard.
   * Stored on-chain as the authoritative metadata source.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uri?: string;

  /**
   * Alias for uri — the same IPFS metadata URI under a different name.
   * Because "uri" and "metadataUri" are the same thing and history is complicated.
   * (Accept both. Merge downstream. Move on. This is the way.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metadataUri?: string;

  // ── Supply + pricing ─────────────────────────────────────────────────────────
  // Optional at step 1, required before on-chain deploy.
  // We don't enforce "required before deploy" here — that's the wizard's job.
  // We just store what arrives and trust the frontend to gate the deploy step.
  // (Trust, but verify. We verify at deploy time. Eventually.)

  /**
   * The total number of NFTs in this collection (max supply).
   * 0 or absent = open edition (no hard cap). A dangerous freedom.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalSupply?: number;

  /**
   * The mint price in SOL.
   * Optional — overridden by freeMint: true.
   * If both mintPrice and freeMint are absent: defaults to 0 in the service.
   * (Free by accident is still free. The minters won't complain.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mintPrice?: number;

  /**
   * Whether this is a free mint.
   * When true, price is forced to 0 regardless of mintPrice.
   * The gift to the community. The price: zero. The gas: very much not zero.
   * (Nothing on Solana is truly free. But the intent is generous.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  freeMint?: boolean;

  /**
   * The royalty percentage the creator receives on secondary sales.
   * Stored as a percentage (0–100) and converted to basis points (×100) on save.
   * Optional — collections without royalties are valid and occasionally strategic.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  royaltyPercent?: number;

  /**
   * The wallet address that receives royalty payments.
   * If omitted, defaults to creatorAddress on the on-chain side.
   * Stored for reference but the on-chain program handles actual routing.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  royaltyWallet?: string;

  // ── Phases ─────────────────────────────────────────────────────────────────
  // Optional at step 1; step 3 fills these in.
  // An empty phases array means no schedule — effectiveStatus = baseStatus.
  // A populated phases array means the cron will transition the status automatically.
  // (This is the magic. The cron watches the clock. The clock watches the phases.)

  /**
   * The mint phases defining the collection's schedule.
   * Validated recursively via @ValidateNested — each phase must be a valid MintPhaseDto.
   * Stored as a JSONB array on the Collection entity.
   */
  @ApiProperty({ type: [MintPhaseDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true }) // Validate each element in the array, not just the array itself.
  @IsArray()
  @Type(() => MintPhaseDto)       // Transform plain objects to MintPhaseDto instances for validation.
  phases?: MintPhaseDto[];

  // ── Metadata standard ───────────────────────────────────────────────────────

  /**
   * The Metaplex metadata standard to use for this collection's tokens.
   * Core is the recommended default for new mainnet collections.
   * (Core: modern, efficient, recommended.
   *  Legacy: the old way. Still works. Like an old car that refuses to die.
   *  Compressed: for when you need 10,000 NFTs at the cost of approximately a coffee.)
   */
  @ApiProperty({ enum: ['Core', 'Legacy', 'Metaplex', 'Programmable', 'CNFT', 'Compressed'], required: false })
  @IsOptional()
  @IsEnum(['Core', 'Legacy', 'Metaplex', 'Programmable', 'CNFT', 'Compressed'])
  metadataStandard?: 'Core' | 'Legacy' | 'Metaplex' | 'Programmable' | 'CNFT' | 'Compressed';

  // ── Visual assets ───────────────────────────────────────────────────────────

  /**
   * URL to the collection's primary image.
   * Expected: an IPFS URL after the media upload step.
   * Stored as imageUrl on the entity. The face of the project.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collectionImage?: string;

  /**
   * URL to the collection's banner image.
   * The wide-format header. The billboard. Completely optional but very impactful.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  // ── Fund distribution ───────────────────────────────────────────────────────

  /**
   * The list of wallet addresses and their share of mint proceeds.
   * Validated recursively — each entry must be a valid FundReceiverDto.
   * Stored as a JSONB array. The money routing table. Sacred data.
   * (If this is wrong, real money goes to the wrong place.
   *  Validate it. Test it. Triple-check it. Then validate it again.)
   */
  @ApiProperty({ type: [FundReceiverDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => FundReceiverDto)
  fundReceivers?: FundReceiverDto[];

  // ── Collection freeze ───────────────────────────────────────────────────────

  /**
   * Whether to freeze the collection's metadata after deployment.
   * Frozen metadata = immutable after freezeUntilDate.
   * A sign of commitment. "We will not rug the art." (Admirable.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  freezeCollection?: boolean;

  /**
   * The date until which the collection is frozen (if freezeCollection = true).
   * After this date, metadata can be updated again. Or not. Depends on the creator.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  freezeUntilDate?: string;

  // ── Social links ─────────────────────────────────────────────────────────────
  // All optional. All validated as URLs if present. Because partial URLs are not URLs.
  // (We've received "twitter.com/mycoolproject" without the https://. We require_protocol.)

  /**
   * The project's Twitter/X profile URL.
   * Must be a valid URL with protocol (https://). Validated by @IsUrl.
   * Optional — but a project without a Twitter is a project shouting into the void.
   * (Like my motivational tweets. Presence noted. Engagement: minimal.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true }) // https:// is not optional. http:// is technically fine but sus.
  twitterUrl?: string;

  /**
   * The project's Discord invite URL.
   * Where the community gathers. Where "wen mint?" is asked 40 times per day.
   * Must be a valid URL. Validated. Respected.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  discordUrl?: string;

  /**
   * The project's official website URL.
   * The home base. The roadmap. The "our team" page.
   * Having a website is a green flag. We record it. We appreciate the effort.
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string;

  // ── On-chain deployment confirmation ─────────────────────────────────────────
  // Set by the frontend AFTER the on-chain transaction is signed and broadcast.
  // At step 1 (initial save), these are absent. At deployment confirmation, they arrive.
  // The two-step dance: first we save optimistically, then we confirm on-chain.
  // (Optimistic saving: the practice of recording intent before confirmation.
  //  Click and pray is not a launch strategy. But optimistic saving is close, and it works.)

  /**
   * The Solana transaction signature of the deployment transaction.
   * The receipt. The proof. The "this actually happened on-chain" evidence.
   * Optional at creation; required for confirmDeployment().
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  txSignature?: string;

  /**
   * The on-chain address (public key) of the deployed collection account.
   * Derived from the program ID and collection-specific seeds.
   * Optional at creation (before the tx is signed); set by the frontend post-deploy.
   * (The address that identifies this collection forever. On the blockchain.
   *  Immutably. Until the heat death of the universe.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collectionAddress?: string;
}


// ══════════════════════════════════════════════════════════════════════════════
// — Juan
//
// CreateCollectionDto: the form that launches a thousand NFTs.
// (Or 5,000. Or 10,000. Or 1 open-edition piece with a very confused market cap.)
//
// Every optional field here is a step in the wizard.
// Every required field is a minimum viable collection.
// Every @IsUrl({ require_protocol: true }) is a small act of defensive programming
// that prevented "twitter.com/..." from entering the database at least once.
//
// It's the little things.
// ══════════════════════════════════════════════════════════════════════════════
