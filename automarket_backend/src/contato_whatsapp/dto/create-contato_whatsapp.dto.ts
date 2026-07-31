import { IsInt } from 'class-validator';

export class CreateContatoWhatsappDto {
  @IsInt()
  veiculoId!: number;

  @IsInt()
  vendedorId!: number;
}
