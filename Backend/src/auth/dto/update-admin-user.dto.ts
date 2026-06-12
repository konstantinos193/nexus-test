import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole } from '../../database/entities/admin-user.entity';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
