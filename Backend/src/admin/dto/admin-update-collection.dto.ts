import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CollectionStatus } from '../../database/entities/collection.entity';

export class AdminUpdateCollectionDto {
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;
}
