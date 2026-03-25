import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  uri: string; // Base URI from IPFS

  @ApiProperty()
  @IsNumber()
  totalSupply: number;

  @ApiProperty()
  @IsNumber()
  mintPrice: number;

  @ApiProperty()
  @IsBoolean()
  freeMint: boolean;

  @ApiProperty()
  @IsNumber()
  royaltyPercent: number;

  @ApiProperty()
  @IsString()
  royaltyWallet: string;

  @ApiProperty({ type: [MintPhaseDto] })
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => MintPhaseDto)
  phases: MintPhaseDto[];

  @ApiProperty()
  @IsString()
  creatorAddress: string;

  @ApiProperty({ enum: ['Core', 'Metaplex', 'CNFT'] })
  @IsEnum(['Core', 'Metaplex', 'CNFT'])
  metadataStandard: 'Core' | 'Metaplex' | 'CNFT';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collectionImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  freezeCollection?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  freezeUntilDate?: string;
}
