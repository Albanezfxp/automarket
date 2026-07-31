import {
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateEnderecoDto {
  @IsInt()
  lojaId!: number;

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
