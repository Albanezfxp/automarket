import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RevelarFaturamentoDto {
  @IsString()
  senha: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;
}
