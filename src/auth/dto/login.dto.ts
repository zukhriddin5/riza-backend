import { IsNotEmpty, IsString } from 'class-validator';

// The contract for logging in. The `email` field now holds a phone number
// (kept named "email" to avoid a schema/type change). Login is lenient — it
// just needs to match a stored identifier.
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
