import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ContatoWhatsappService } from './contato_whatsapp.service';
import { CreateContatoWhatsappDto } from './dto/create-contato_whatsapp.dto';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';
import { Public } from 'src/auth/public.decorator';

@Controller('contato-whatsapp')
export class ContatoWhatsappController {
  constructor(
    private readonly contatoWhatsappService: ContatoWhatsappService,
  ) {}

  // Registro de contato feito pelo visitante do catálogo público (sem
  // login) — deriva a loja a partir do veículo, nunca de um lojaId no body.
  @Public()
  @Post('publico')
  createPublico(@Body() dto: CreateContatoWhatsappDto) {
    return this.contatoWhatsappService.createPublico(dto);
  }

  @Post()
  create(
    @Body() createContatoWhatsappDto: CreateContatoWhatsappDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.contatoWhatsappService.create(createContatoWhatsappDto, loja.id);
  }

  @Get()
  findAll(
    @LojaAtual() loja: LojaAutenticada,
    @Query('veiculoId') veiculoId?: string,
    @Query('vendedorId') vendedorId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.contatoWhatsappService.findAll({
      lojaId: loja.id,
      veiculoId: veiculoId ? +veiculoId : undefined,
      vendedorId: vendedorId ? +vendedorId : undefined,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      page: page ? +page : undefined,
      perPage: perPage ? +perPage : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.contatoWhatsappService.findOne(+id, loja.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.contatoWhatsappService.remove(+id, loja.id);
  }
}
