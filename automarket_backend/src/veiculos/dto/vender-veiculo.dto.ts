import { IsInt } from 'class-validator';

export class VenderVeiculoDto {
  @IsInt()
  vendedorId: number;
}
