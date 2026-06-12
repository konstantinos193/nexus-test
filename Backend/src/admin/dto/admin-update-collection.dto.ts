import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CollectionStatus } from '../../database/entities/collection.entity';

export class AdminUpdateCollectionDto {
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  // Explicit featured display order (lower surfaces first). Null clears it (falls back to minted).
  @IsOptional()
  @IsInt()
  @Min(0)
  featuredRank?: number;
}
