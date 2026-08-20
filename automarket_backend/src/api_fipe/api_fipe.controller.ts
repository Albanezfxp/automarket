import { Controller, Get, Param } from '@nestjs/common';
import { ApiFipeService } from './api_fipe.service';
import { Public } from 'src/auth/public.decorator';

// Proxy de dado público de referência (tabela FIPE) — sem sensibilidade
// nem escopo de loja, por isso fica isento do JwtAuthGuard global.
@Public()
@Controller('api-fipe')
export class ApiFipeController {
  constructor(private readonly fipeService: ApiFipeService) {}

  @Get('/marcas')
  getMarcas() {
    return this.fipeService.getMarcas();
  }
  @Get('/marcas/:marcaId/modelos')
  getModelosDaMarca(@Param('marcaId') marcaId: string) {
    return this.fipeService.getModelosDaMarca(marcaId);
  }
  @Get('/marcas/:marcaId/modelos/:modeloId/anos')
  getYearOfOneModel(
    @Param('marcaId') marcaId: string,
    @Param('modeloId') modeloId: string,
  ) {
    return this.fipeService.getYearOfOneModel(marcaId, modeloId);
  }
  @Get('/marcas/:marcaId/modelos/:modeloId/anos/:anoId')
  getDetalheAno(
    @Param('marcaId') marcaId: string,
    @Param('modeloId') modeloId: string,
    @Param('anoId') anoId: string,
  ) {
    return this.fipeService.getDetalheAno(marcaId, modeloId, anoId);
  }
}
