import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// Admins are identified by EMAIL (safer for privileged accounts). Customers use
// phone (see CreateUserDto). The identifier is still stored in the `email` column.
export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
