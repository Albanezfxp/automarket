import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateVendedorDto {
  @IsString()
  @MaxLength(150)
  nome!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  fotoUrl?: string;

  // formato E.164 sem "+": código do país + DDD + número, ex: 5583999998888
  @IsString()
  @MaxLength(20)
  @Matches(/^\d{10,15}$/, {
    message:
      'WhatsApp deve conter apenas números, com DDI e DDD (ex: 5583999998888)',
  })
  whatsapp!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
