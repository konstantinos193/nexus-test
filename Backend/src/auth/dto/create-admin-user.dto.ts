import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AdminRole } from '../../database/entities/admin-user.entity';

export class CreateAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  displayName: string;

  @IsEnum(AdminRole)
  role: AdminRole;
}
