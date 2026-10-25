import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { LojasService } from './lojas.service';
import { CreateLojaDto } from './dto/create-loja.dto';
import { UpdateLojaDto } from './dto/update-loja.dto';
import { Public } from 'src/auth/public.decorator';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';

@Controller('lojas')
export class LojasController {
  constructor(private readonly lojasService: LojasService) {}

  // Registro de loja — não exige autenticação prévia.
  @Public()
  @Post()
  create(@Body() createLojaDto: CreateLojaDto) {
    return this.lojasService.create(createLojaDto);
  }

  // Só devolve a própria loja: listar todas expunha e-mail/telefone de
  // outras lojas para qualquer lojista autenticado.
  @Get()
  findAll(@LojaAtual() loja: LojaAutenticada) {
    return this.lojasService.findAll(loja.id);
  }

  // Dados públicos da loja por slug, pro catálogo público (visitante sem
  // login). Precisa vir ANTES de @Get(':id') — senão o Nest tenta casar
  // "publico" como se fosse um :id.
  @Public()
  @Get('publico/:slug')
  findPublicoPorSlug(@Param('slug') slug: string) {
    return this.lojasService.findPublicoPorSlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    this.garantirPropriaLoja(id, loja);
    return this.lojasService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLojaDto: UpdateLojaDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    this.garantirPropriaLoja(id, loja);
    return this.lojasService.update(+id, updateLojaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    this.garantirPropriaLoja(id, loja);
    return this.lojasService.remove(+id);
  }

  // Uma loja só pode ler/editar/apagar a si mesma.
  private garantirPropriaLoja(id: string, loja: LojaAutenticada) {
    if (+id !== loja.id) {
      throw new ForbiddenException('Você não tem acesso a essa loja.');
    }
  }
}
