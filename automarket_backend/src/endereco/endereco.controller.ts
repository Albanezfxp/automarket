import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EnderecoService } from './endereco.service';
import { CreateEnderecoDto } from './dto/create-endereco.dto';
import { UpdateEnderecoDto } from './dto/update-endereco.dto';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';

@Controller('endereco')
export class EnderecoController {
  constructor(private readonly enderecoService: EnderecoService) {}

  @Post()
  create(
    @Body() createEnderecoDto: CreateEnderecoDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.enderecoService.create(createEnderecoDto, loja.id);
  }

  @Get()
  findAll(@LojaAtual() loja: LojaAutenticada) {
    return this.enderecoService.findAll(loja.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.enderecoService.findOne(+id, loja.id);
  }

  @Get('/lojaid/:id')
  findByLoja(@Param('id') lojaId: string, @LojaAtual() loja: LojaAutenticada) {
    return this.enderecoService.findByLojaId(+lojaId, loja.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEnderecoDto: UpdateEnderecoDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.enderecoService.update(+id, updateEnderecoDto, loja.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.enderecoService.remove(+id, loja.id);
  }
}
