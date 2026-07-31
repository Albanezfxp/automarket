import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VeiculoImagemService } from './veiculo_imagem.service';
import { CreateVeiculoImagemDto } from './dto/create-veiculo_imagem.dto';
import { UpdateVeiculoImagemDto } from './dto/update-veiculo_imagem.dto';

@Controller('veiculo-imagem')
export class VeiculoImagemController {
  constructor(private readonly veiculoImagemService: VeiculoImagemService) {}

  @Post()
  create(@Body() createVeiculoImagemDto: CreateVeiculoImagemDto) {
    return this.veiculoImagemService.create(createVeiculoImagemDto);
  }

  @Get()
  findAll() {
    return this.veiculoImagemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.veiculoImagemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVeiculoImagemDto: UpdateVeiculoImagemDto) {
    return this.veiculoImagemService.update(+id, updateVeiculoImagemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.veiculoImagemService.remove(+id);
  }
}
