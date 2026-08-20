import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const PASTAS_PERMITIDAS = [
  'veiculos',
  'lojas/logo',
  'lojas/banner',
  'vendedores',
] as const;

export class PresignUploadDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType: (typeof ALLOWED_CONTENT_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(8_000_000)
  fileSize: number;

  @IsIn(PASTAS_PERMITIDAS)
  pasta: (typeof PASTAS_PERMITIDAS)[number];
}
