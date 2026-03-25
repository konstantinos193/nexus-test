import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for uploading files to IPFS
 */
export class UploadFileDto {
  @ApiProperty({
    description: 'File content as Buffer or string',
    type: 'string',
    format: 'binary',
  })
  file: Buffer | string;

  @ApiPropertyOptional({
    description: 'Optional filename',
    example: 'metadata.json',
  })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({
    description: 'Optional content type (MIME type)',
    example: 'application/json',
  })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Whether to pin the file',
    default: true,
  })
  @IsOptional()
  pin?: boolean;
}

/**
 * DTO for uploading JSON metadata to IPFS
 */
export class UploadMetadataDto {
  @ApiProperty({
    description: 'Metadata object to upload',
    example: {
      name: 'My NFT Collection',
      description: 'A cool NFT collection',
      image: 'ipfs://QmHash...',
    },
  })
  @IsObject()
  metadata: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether to pin the file',
    default: true,
  })
  @IsOptional()
  pin?: boolean;
}

/**
 * Response DTO for IPFS upload operations
 */
export class IpfsUploadResponseDto {
  @ApiProperty({
    description: 'IPFS hash (CID) of the uploaded file',
    example: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  hash: string;

  @ApiProperty({
    description: 'IPFS path (ipfs://hash)',
    example: 'ipfs://QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  path: string;

  @ApiProperty({
    description: 'Gateway URL to access the file',
    example: 'https://ipfs.io/ipfs/QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  gatewayUrl: string;

  @ApiProperty({
    description: 'Size of the file in bytes',
    example: 1024,
  })
  size: number;

  @ApiProperty({
    description: 'Whether the file is pinned',
    example: true,
  })
  pinned: boolean;
}

/**
 * Response DTO for IPFS pin operations
 */
export class IpfsPinResponseDto {
  @ApiProperty({
    description: 'IPFS hash (CID) that was pinned',
    example: 'QmYjtig7VJQ6XsnUjqqJvj7QaMcCAwtrgNdahSiFofrE7o',
  })
  hash: string;

  @ApiProperty({
    description: 'Whether the pin operation was successful',
    example: true,
  })
  success: boolean;
}
