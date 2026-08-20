import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { VeiculoImagemService } from './veiculo_imagem.service';
import { CreateVeiculoImagemDto } from './dto/create-veiculo_imagem.dto';
import { UpdateVeiculoImagemDto } from './dto/update-veiculo_imagem.dto';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';

@Controller('veiculo-imagem')
export class VeiculoImagemController {
  constructor(private readonly veiculoImagemService: VeiculoImagemService) {}

  @Post()
  create(
    @Body() createVeiculoImagemDto: CreateVeiculoImagemDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.veiculoImagemService.create(createVeiculoImagemDto, loja.id);
  }

  @Get()
  findAll(
    @LojaAtual() loja: LojaAutenticada,
    @Query('veiculoId') veiculoId?: string,
  ) {
    return this.veiculoImagemService.findAll(loja.id, veiculoId ? +veiculoId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculoImagemService.findOne(+id, loja.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVeiculoImagemDto: UpdateVeiculoImagemDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.veiculoImagemService.update(+id, updateVeiculoImagemDto, loja.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculoImagemService.remove(+id, loja.id);
  }
}
