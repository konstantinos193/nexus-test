// DTOs for IPFS operations.
// DTOs: Data Transfer Objects — the polite paperwork that stands between
// raw HTTP request bodies and our sacred service layer.
// Without DTOs, anything could arrive in the body. Anything. (Terrifying.)

// Swagger's annotation toolkit — for auto-generating API docs nobody reads until something breaks.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// class-validator: the disciplinarian. It checks that what was promised actually arrived.
import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';

// class-transformer: the shapeshifter. Turns plain JSON objects into proper class instances.
import { Type } from 'class-transformer';

/**
 * UploadFileDto
 *
 * The DTO for a direct file upload to IPFS. Carries the raw file data —
 * a Buffer or string — plus optional metadata about the file's name and type.
 *
 * Note: in the controller, single-file uploads arrive via Multer, not this DTO directly.
 * This class exists for completeness, type documentation, and Swagger's peace of mind.
 * Juan's peace of mind was never on the table.
 */
export class UploadFileDto {
  /**
   * The file content itself — raw bytes as Buffer or stringified content.
   * This is the actual data going into the decentralized void.
   * Choose wisely. The void does not offer a refund.
   */
  @ApiProperty({
    description: 'File content as Buffer or string — the actual bytes destined for eternity',
    type: 'string',
    format: 'binary',  // binary: HTTP's polite way of saying "it's files, not text"
  })
  file: Buffer | string;

  /**
   * Optional filename — what the file will be called in IPFS.
   * If omitted, falls back to 'file'. Creative? No. Functional? Barely.
   * Give your files meaningful names. The blockchain attic has no search.
   */
  @ApiPropertyOptional({
    description: 'Optional filename — give it a name or it will be called "file" forever',
    example: 'metadata.json',
  })
  @IsOptional()
  @IsString()
  filename?: string;

  /**
   * Optional MIME type — tells consumers what kind of content this is.
   * IPFS doesn't care about MIME types but browsers do, and browsers
   * are among our most important stakeholders.
   */
  @ApiPropertyOptional({
    description: 'Optional content type (MIME type) — what flavor of bytes is this?',
    example: 'application/json',
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  /**
   * Whether to pin this file after upload.
   * Default: true (configured at the service level).
   * Pinned = preserved. Unpinned = vibes with an expiry date.
   * Please pin your files. We cannot stress this enough.
   */
  @ApiPropertyOptional({
    description: 'Whether to pin the file after upload. Default: true. Seriously, pin it.',
    default: true,
  })
  @IsOptional()
  pin?: boolean;
}

/**
 * UploadMetadataDto
 *
 * The DTO for uploading JSON metadata to IPFS.
 * This is the most important DTO in this file — it carries the metadata object
 * that defines an NFT's identity. Name, description, image, attributes.
 * The soul of the token, packaged as a Record and committed to the void.
 *
 * Validated by @IsObject() because arriving with metadata: "lol" would be a bad day.
 */
export class UploadMetadataDto {
  /**
   * The metadata object to upload.
   * Typically follows the Metaplex/OpenSea metadata standard:
   * { name, symbol, description, image, attributes, ... }
   * Whatever you put here will be serialized to JSON and stored permanently in IPFS.
   * Typos in metadata are forever. Proofread. Then proofread again.
   */
  @ApiProperty({
    description: 'The NFT metadata object — the soul of the token, committed to eternity as JSON',
    example: {
      name: 'My NFT Collection',
      description: 'A cool NFT collection. (Put something better here in production.)',
      image: 'ipfs://QmHash...',  // The IPFS hash of the collection image — also uploaded, also pinned
    },
  })
  @IsObject()  // Must be an actual object. Not a string. Not a number. An object. We checked.
  metadata: Record<string, any>;

  /**
   * Whether to pin the metadata file after upload.
   * Again: pin it. Pin everything. If your NFT's metadata disappears from IPFS,
   * the token still exists on-chain but has no name, no image, no soul.
   * Don't let your NFTs become nameless ghosts on the blockchain.
   */
  @ApiPropertyOptional({
    description: 'Whether to pin the metadata file. Default: true. Do not disable this casually.',
    default: true,
  })
  @IsOptional()
  pin?: boolean;
}

/**
 * IpfsUploadResponseDto
 *
 * The DTO that comes back after a successful IPFS upload operation.
 * Contains everything the caller needs to reference, display, and
 * embed the uploaded content in a Solana program or frontend.
 *
 * This is what the controller returns. This is what the frontend awaits.
 * This is the proof that the upload actually happened and the data
 * now lives permanently in the decentralized web.
 */
export class IpfsUploadResponseDto {
  /**
   * The IPFS Content Identifier (CID) — the file's permanent, immutable identity.
   * Content-addressed: the hash is derived from the content itself.
   * Change the content by one byte, get a different hash. Beautiful. Terrifying.
   */
  @ApiProperty({
    description: 'IPFS hash (CID) — the permanent fingerprint of the uploaded content',
    example: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  hash: string;

  /**
   * The canonical IPFS path: ipfs://{hash}
   * Used in smart contracts, metadata JSON (image field), and IPFS-aware tools.
   * Not directly openable in most browsers without a gateway extension — that's what gatewayUrl is for.
   */
  @ApiProperty({
    description: 'IPFS path (ipfs://hash) — the canonical address, for contracts and tools',
    example: 'ipfs://QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  path: string;

  /**
   * The HTTP gateway URL — a normal https:// URL that browsers, marketplaces,
   * and humans can use to access the file without installing IPFS.
   * The civilized interface between the decentralized web and the rest of civilization.
   */
  @ApiProperty({
    description: 'Gateway URL — the HTTP address that browsers and mortals can actually open',
    example: 'https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  gatewayUrl: string;

  /**
   * File size in bytes. Useful for displaying to users, validating uploads,
   * and computing how much space your NFT collection is consuming
   * in the blockchain's eternal attic.
   */
  @ApiProperty({
    description: 'Size of the uploaded file in bytes — the weight of permanence',
    example: 1024,
  })
  size: number;

  /**
   * Whether the file is currently pinned on the IPFS node.
   * true = protected, preserved, safe.
   * false = on borrowed time. Take action immediately.
   */
  @ApiProperty({
    description: 'Whether the file is pinned on the node — true means it\'s protected from the void',
    example: true,
  })
  pinned: boolean;
}

/**
 * IpfsPinResponseDto
 *
 * The minimalist response after a pin or unpin operation.
 * Just the hash that was acted upon and whether the operation succeeded.
 * Elegant in its simplicity. Like a pinned file: small, persistent, reliable.
 */
export class IpfsPinResponseDto {
  /**
   * The CID that was pinned (or attempted to be pinned).
   * Returned so the caller can confirm which hash was processed
   * without having to remember what they sent.
   */
  @ApiProperty({
    description: 'IPFS hash (CID) that was targeted by the pin operation',
    example: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  hash: string;

  /**
   * Whether the pin operation succeeded.
   * true = pinned, preserved, at peace.
   * false = something went wrong — check the logs, check the node, check your choices.
   */
  @ApiProperty({
    description: 'Whether the pin operation was successful — true means the void is holding on',
    example: true,
  })
  success: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed: Juan
// Role: DTO architect, validator of incoming chaos, Swagger documentation reluctant contributor
// Philosophy: A DTO without validation is just a prayer wrapped in TypeScript.
//             A DTO with @IsObject() is a prayer with a bouncer at the door.
//             Both are necessary. One is more reassuring.
// Note: These DTOs represent the paper trail of eternity. The metadata uploaded
//       via UploadMetadataDto will outlive this codebase, this server, and possibly us.
//       Make it a good JSON object. Future collectors are counting on you.
// ─────────────────────────────────────────────────────────────────────────────
