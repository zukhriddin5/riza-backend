import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  // Uzbek name (default locale) — the slug is server-generated from this.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  // Russian name — required (both languages).
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nameRu: string;
}
