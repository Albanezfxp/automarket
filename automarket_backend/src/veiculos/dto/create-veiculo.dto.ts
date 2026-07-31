import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsUrl,
  Min,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Cambio,
  Combustivel,
  Cor,
  Direcao,
  ItemVeiculo,
  StatusVeiculo,
  TipoVeiculo,
} from 'generated/prisma/enums';

export class VeiculoImagemDto {
  @IsUrl()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  capa?: boolean;
}

export class CreateVeiculoDto {
  @IsInt()
  lojaId!: number;

  // Marca / Modelo
  @IsString()
  @MaxLength(100)
  marca!: string;

  @IsOptional()
  @IsInt()
  marcaFipeId?: number;

  @IsString()
  @MaxLength(150)
  modelo!: string;

  @IsOptional()
  @IsInt()
  modeloFipeId?: number;

  @IsString()
  @MaxLength(150)
  versao!: string;

  @IsInt()
  anoFabricacao!: number;

  @IsInt()
  anoModelo!: number;

  @IsEnum(TipoVeiculo)
  tipoVeiculo!: TipoVeiculo;

  @IsEnum(Cambio)
  cambio!: Cambio;

  @IsInt()
  portas!: number;

  @IsEnum(Combustivel)
  combustivel!: Combustivel;

  @IsEnum(Direcao)
  direcao!: Direcao;

  @IsString()
  @MaxLength(50)
  potenciaMotor!: string;

  @IsEnum(Cor)
  cor!: Cor;

  @IsInt()
  quilometragem!: number;

  @IsString()
  descricao!: string;

  @IsNumber()
  preco!: number;

  // Array de imagens: valida cada objeto dentro do array com VeiculoImagemDto
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VeiculoImagemDto)
  imagens?: VeiculoImagemDto[];

  // Array de enum
  @IsOptional()
  @IsArray()
  @IsEnum(ItemVeiculo, { each: true })
  itens?: ItemVeiculo[];

  // Opcionais
  @IsOptional()
  @IsNumber()
  precoPromocional?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  estadoFinanceiro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  documentacaoRegularizacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  conservacaoGarantia?: string;

  @IsOptional()
  @IsBoolean()
  aceitaTroca?: boolean;

  @IsOptional()
  @IsBoolean()
  aceitaFinanciamento?: boolean;
}
