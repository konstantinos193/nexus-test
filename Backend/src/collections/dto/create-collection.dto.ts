import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsEnum, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FundReceiverDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  share: string;
}

export class MintPhaseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  startDateTime: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDateTime?: string;

  @ApiProperty({ enum: ['public', 'allowlist'] })
  @IsEnum(['public', 'allowlist'])
  phaseType: 'public' | 'allowlist';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  priceOverride?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  allowlistRaw?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maxPerWallet?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maxSupply?: string;
}

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  symbol: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  creatorAddress: string;

  // uri/metadataUri — IPFS base URI, optional until media is uploaded in step 2
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uri?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metadataUri?: string;

  // Supply + pricing — optional at step 1, required before on-chain deploy
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  totalSupply?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mintPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  freeMint?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  royaltyPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  royaltyWallet?: string;

  // Phases — optional at step 1; step 3 fills these in
  @ApiProperty({ type: [MintPhaseDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => MintPhaseDto)
  phases?: MintPhaseDto[];

  // Metadata standard — defaults to Core (best for mainnet)
  @ApiProperty({ enum: ['Core', 'Legacy', 'Metaplex', 'Programmable', 'CNFT', 'Compressed'], required: false })
  @IsOptional()
  @IsEnum(['Core', 'Legacy', 'Metaplex', 'Programmable', 'CNFT', 'Compressed'])
  metadataStandard?: 'Core' | 'Legacy' | 'Metaplex' | 'Programmable' | 'CNFT' | 'Compressed';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collectionImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiProperty({ type: [FundReceiverDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => FundReceiverDto)
  fundReceivers?: FundReceiverDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  freezeCollection?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  freezeUntilDate?: string;
}
