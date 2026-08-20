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
import { VendedorService } from './vendedor.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';

@Controller('vendedor')
export class VendedorController {
  constructor(private readonly vendedorService: VendedorService) {}

  @Post()
  create(
    @Body() createVendedorDto: CreateVendedorDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.vendedorService.create(createVendedorDto, loja.id);
  }

  @Get()
  findAll(
    @LojaAtual() loja: LojaAutenticada,
    @Query('ativo') ativo?: string,
  ) {
    return this.vendedorService.findAll({
      lojaId: loja.id,
      ativo: ativo === undefined ? undefined : ativo === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.vendedorService.findOne(+id, loja.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVendedorDto: UpdateVendedorDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.vendedorService.update(+id, updateVendedorDto, loja.id);
  }

  @Patch('desativar-vendedor/:id')
  disactive(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.vendedorService.deactivate(+id, loja.id);
  }

  @Patch('reativar-vendedor/:id')
  reactive(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.vendedorService.reactivate(+id, loja.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.vendedorService.remove(+id, loja.id);
  }
}
