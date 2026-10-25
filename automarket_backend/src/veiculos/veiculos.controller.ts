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
import { VeiculosService } from './veiculos.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
import { VenderVeiculoDto } from './dto/vender-veiculo.dto';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';
import { StatusVeiculo, Cambio, Combustivel, TipoVeiculo } from 'generated/prisma/enums';
import { Public } from 'src/auth/public.decorator';

// Query string vem sempre como texto: valor não numérico ("abc") virava NaN e
// derrubava a query do Prisma com 500. Aqui vira "filtro ausente".
function numeroOuUndefined(valor?: string): number | undefined {
  if (valor === undefined || valor === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

// Enum inválido na query também derrubava o Prisma; valor desconhecido é
// ignorado em vez de gerar erro.
function enumOuUndefined<T extends string>(
  valor: string | undefined,
  enumObj: Record<string, T>,
): T | undefined {
  return (Object.values(enumObj) as string[]).includes(valor as string)
    ? (valor as T)
    : undefined;
}

@Controller('veiculos')
export class VeiculosController {
  constructor(private readonly veiculosService: VeiculosService) {}

  // Rotas públicas do catálogo (visitante sem login) — precisam vir ANTES
  // de @Get(':id') no arquivo, senão o Nest tenta casar "publico" como :id.
  @Public()
  @Get('publico')
  findAllPublico(
    @Query('slug') slug: string,
    @Query('busca') busca?: string,
    @Query('tipoVeiculo') tipoVeiculo?: TipoVeiculo,
    @Query('cambio') cambio?: Cambio,
    @Query('combustivel') combustivel?: Combustivel,
    @Query('precoMin') precoMin?: string,
    @Query('precoMax') precoMax?: string,
    @Query('anoMin') anoMin?: string,
    @Query('anoMax') anoMax?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.veiculosService.findAllPublico({
      slug,
      busca,
      tipoVeiculo: enumOuUndefined(tipoVeiculo, TipoVeiculo),
      cambio: enumOuUndefined(cambio, Cambio),
      combustivel: enumOuUndefined(combustivel, Combustivel),
      precoMin: numeroOuUndefined(precoMin),
      precoMax: numeroOuUndefined(precoMax),
      anoMin: numeroOuUndefined(anoMin),
      anoMax: numeroOuUndefined(anoMax),
      page: numeroOuUndefined(page),
      perPage: numeroOuUndefined(perPage),
    });
  }

  @Public()
  @Get('publico/:id')
  findOnePublico(@Param('id') id: string) {
    return this.veiculosService.findOnePublico(+id);
  }

  @Post()
  create(
    @Body() createVeiculoDto: CreateVeiculoDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.veiculosService.create(createVeiculoDto, loja.id);
  }

  @Get()
  findAll(
    @LojaAtual() loja: LojaAutenticada,
    @Query('status') status?: StatusVeiculo,
  ) {
    return this.veiculosService.findAll(loja.id, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculosService.findOne(+id, loja.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVeiculoDto: UpdateVeiculoDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.veiculosService.update(+id, updateVeiculoDto, loja.id);
  }

  @Patch(':id/vender')
  vender(
    @Param('id') id: string,
    @Body() dto: VenderVeiculoDto,
    @LojaAtual() loja: LojaAutenticada,
  ) {
    return this.veiculosService.vender(+id, dto.vendedorId, loja.id);
  }

  @Patch(':id/reservar')
  reservar(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculosService.reservar(+id, loja.id);
  }

  @Patch(':id/disponibilizar')
  disponibilizar(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculosService.disponibilizar(+id, loja.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculosService.delete(+id, loja.id);
  }

  @Patch(':id/reativar')
  reactivate(@Param('id') id: string, @LojaAtual() loja: LojaAutenticada) {
    return this.veiculosService.reactivate(+id, loja.id);
  }
}
