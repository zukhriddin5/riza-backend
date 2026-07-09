import { IsString, MinLength, IsOptional, IsNotEmpty, Matches } from 'class-validator';

// International phone format: "+" then 8–15 digits, e.g. +998901234567.
export const PHONE_REGEX = /^\+[0-9]{8,15}$/;

export class CreateUserDto {
    // Holds a phone number (field kept named "email" to avoid a schema change —
    // the column stays a unique string).
    @IsString()
    @IsNotEmpty()
    @Matches(PHONE_REGEX, {
      message: 'Phone must be in international format, e.g. +998901234567',
    })
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    password: string;

    @IsOptional()
    @IsString()
    name?: string;
}
