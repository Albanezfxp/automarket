import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RevelarFaturamentoDto } from './dto/revelar-faturamento.dto';
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
