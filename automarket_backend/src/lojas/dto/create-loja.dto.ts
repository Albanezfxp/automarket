import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsUrl,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO auxiliar: endereço da loja (relação 1:1)
export class EnderecoDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rua?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bairro?: string;

  @IsString()
  @MaxLength(100)
  cidade!: string;

  @IsString()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'Estado deve ser a sigla com 2 letras maiúsculas (ex: PB)',
  })
  estado!: string;
}

export class CreateLojaDto {
  @IsString()
  @MaxLength(150)
  nome!: string;

  // opcional: se não vier, o backend gera automaticamente a partir do nome (slugify)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  bannerUrl?: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  // senha em texto puro recebida do client; o backend faz o hash (bcrypt/argon2)
  // antes de persistir em passwordHash — nunca salvar isso direto no banco
  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72) // limite prático do bcrypt
  password!: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72) // limite prático do bcrypt
  confirm_password!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco!: EnderecoDto;
}
