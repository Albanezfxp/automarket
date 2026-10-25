import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RevelarFaturamentoDto } from './dto/revelar-faturamento.dto';
import { RateLimit } from 'src/common/rate-limit.guard';
import { LojaAtual, LojaAutenticada } from 'src/auth/loja-atual.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metricas')
  metricas(
    @LojaAtual() loja: LojaAutenticada,
    @Query('dataInicio') dataInicio?: string,
  ) {
    return this.dashboardService.metricas(loja.id, dataInicio);
  }

  // A senha do gerente também é alvo de força bruta.
  @RateLimit({ limit: 5, windowMs: 10 * 60 * 1000 })
  @Post('faturamento/revelar')
  revelarFaturamento(
    @LojaAtual() loja: LojaAutenticada,
    @Body() dto: RevelarFaturamentoDto,
  ) {
    return this.dashboardService.revelarFaturamento(
      loja.id,
      dto.senha,
      dto.dataInicio,
    );
  }
}
