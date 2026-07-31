import { PartialType } from '@nestjs/mapped-types';
import { CreateVeiculoImagemDto } from './create-veiculo_imagem.dto';

export class UpdateVeiculoImagemDto extends PartialType(CreateVeiculoImagemDto) {}
