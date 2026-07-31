import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateVeiculoImagemDto {
  @IsInt()
  veiculoId!: number;

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
