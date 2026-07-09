import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
export class CreateProductDto {
    // Uzbek name (default locale) — required.
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;

    // Russian name — required (both languages).
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    nameRu: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    descriptionRu?: string;

    @IsInt()
    @Min(0)
    price: number;

    @IsInt()
    @Min(0)
    stock: number;

    @IsOptional()
    // require_tld:false so localhost URLs (dev uploads) are accepted; real
    // domains like *.r2.dev still validate normally in production.
    @IsUrl({ require_tld: false })
    imageUrl?: string;

    // Extra gallery images (each a URL). Cover stays in imageUrl above.
    @IsOptional()
    @IsArray()
    @IsUrl({ require_tld: false }, { each: true })
    images?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(5)
    rating?: number;


    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    // IDs of categories to attach (many-to-many). Optional; server connects them.
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categoryIds?: string[];
}
