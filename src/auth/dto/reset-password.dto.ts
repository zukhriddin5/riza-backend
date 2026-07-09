import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// "Forgot password": identify the account (phone/email) and set a new password.
// NOTE: no verification step yet — add an SMS/email code before real traffic.
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  email: string; // phone or email — the account's identifier

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  password: string;
}
