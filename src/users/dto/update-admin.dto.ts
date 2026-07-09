import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// Editing an admin: any subset of these. Password, if present, resets the login.
export class UpdateAdminDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
