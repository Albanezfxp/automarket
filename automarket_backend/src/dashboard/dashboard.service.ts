import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { ContatoWhatsappService } from 'src/contato_whatsapp/contato_whatsapp.service';
import { StatusVeiculo } from 'generated/prisma/enums';

interface PeriodoReferencia {
  inicioAtual: Date;
  inicioAnterior: Date;
  fimAnterior: Date;
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function percentualVariacao(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

const VISUALIZACOES_MINIMAS_ALERTA = 500;
const LIMITE_REDUZIR_PRECO = 0.5;
const LIMITE_REVISAR_FOTOS = 1.2;
const MAX_DIAS_PERIODO = 90;
const PERIODO_PADRAO_DIAS = 30;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly contatoWhatsappService: ContatoWhatsappService,
  ) {}

  /**
   * O fim do período é sempre "agora" — o filtro de período do Dashboard só
   * escolhe até onde o início pode voltar (atalhos de 7/30/90 dias ou uma
   * data customizada), nunca um intervalo fechado no passado. Sem
   * `dataInicioStr`, cai no padrão de 30 dias. Válido só até
   * `MAX_DIAS_PERIODO` dias atrás — mais que isso (ou uma data futura) é
   * erro do cliente.
   */
  private resolverDataInicio(dataInicioStr?: string, agora = new Date()): Date {
    if (!dataInicioStr) return subtractDays(agora, PERIODO_PADRAO_DIAS);

    const dataInicio = new Date(dataInicioStr);
    if (Number.isNaN(dataInicio.getTime())) {
      throw new BadRequestException('Data de início inválida.');
    }
    if (dataInicio > agora) {
      throw new BadRequestException('Data de início não pode ser no futuro.');
    }
    if (dataInicio < subtractDays(agora, MAX_DIAS_PERIODO)) {
      throw new BadRequestException(
        `O período selecionado não pode ultrapassar ${MAX_DIAS_PERIODO} dias.`,
      );
    }

    return dataInicio;
  }

  private calcularPeriodo(
    dataInicio: Date,
    agora = new Date(),
  ): PeriodoReferencia {
    const duracaoMs = agora.getTime() - dataInicio.getTime();
    return {
      inicioAtual: dataInicio,
      inicioAnterior: new Date(dataInicio.getTime() - duracaoMs),
      fimAnterior: dataInicio,
    };
  }

  async metricas(lojaId: number, dataInicioStr?: string) {
    const periodo = this.calcularPeriodo(this.resolverDataInicio(dataInicioStr));

    const [
      estoque,
      conversao,
      ticketMedio,
      emAlta,
      alertasPrecificacao,
      rankingVendedores,
    ] = await Promise.all([
      this.calcularEstoque(lojaId),
      this.calcularConversao(lojaId, periodo),
      this.calcularTicketMedio(lojaId, periodo),
      this.calcularEmAlta(lojaId),
      this.calcularAlertasPrecificacao(lojaId, periodo),
      this.calcularRankingVendedores(lojaId, periodo),
    ]);

    return {
      estoque,
      conversao,
      ticketMedio,
      emAlta,
      alertasPrecificacao,
      rankingVendedores,
    };
  }

  async revelarFaturamento(
    lojaId: number,
    senha: string,
    dataInicioStr?: string,
  ) {
    const senhaValida = await this.authService.verificarSenhaGerente(
      lojaId,
      senha,
    );
    if (!senhaValida) {
      // Nenhum dado de faturamento é computado nem retornado quando a senha falha.
      throw new ForbiddenException('Senha do gerente incorreta.');
    }

    const { inicioAtual, inicioAnterior, fimAnterior } = this.calcularPeriodo(
      this.resolverDataInicio(dataInicioStr),
    );

    const [atual, anterior] = await Promise.all([
      this.somarVendasNoPeriodo(lojaId, inicioAtual),
      this.somarVendasNoPeriodo(lojaId, inicioAnterior, fimAnterior),
    ]);

    return {
      totalPeriodo: atual.soma,
      variacaoPercentualVsPeriodoAnterior: percentualVariacao(
        atual.soma,
        anterior.soma,
      ),
    };
  }

  /**
   * Soma+conta vendas (status VENDIDO, dataVenda no intervalo) de um
   * período, combinando veículos ainda ativos com os já arquivados (ver
   * VeiculoArquivamentoService) — uma venda de 40 dias atrás continua
   * contando pro faturamento/ticket médio mesmo que o veículo já tenha sido
   * excluído e arquivado nesse meio tempo. Usado por `revelarFaturamento` e
   * `calcularTicketMedio`.
   */
  private async somarVendasNoPeriodo(
    lojaId: number,
    gte: Date,
    lt?: Date,
  ): Promise<{ soma: number; quantidade: number }> {
    const dataVenda = lt ? { gte, lt } : { gte };

    const [ativos, arquivados] = await Promise.all([
      this.prisma.veiculo.aggregate({
        where: { lojaId, status: StatusVeiculo.VENDIDO, dataVenda },
        _sum: { preco: true },
        _count: { _all: true },
      }),
      this.prisma.veiculoArquivado.aggregate({
        where: { lojaId, status: StatusVeiculo.VENDIDO, dataVenda },
        _sum: { preco: true },
        _count: { _all: true },
      }),
    ]);

    return {
      soma: (ativos._sum.preco ?? 0) + (arquivados._sum.preco ?? 0),
      quantidade: ativos._count._all + arquivados._count._all,
    };
  }

  private async calcularEstoque(lojaId: number) {
    try {
      const agregado = await this.prisma.veiculo.aggregate({
        where: { lojaId, ativo: true, status: { not: StatusVeiculo.VENDIDO } },
        _sum: { preco: true },
        _count: { _all: true },
      });

      return {
        valorTotal: agregado._sum.preco ?? 0,
        quantidadeVeiculos: agregado._count._all,
      };
    } catch (error) {
      this.logger.error(`Erro ao calcular estoque da loja ${lojaId}`, error);
      throw error;
    }
  }

  private async calcularConversao(lojaId: number, periodo: PeriodoReferencia) {
    const [totalContatos, vendasNoPeriodo] = await Promise.all([
      this.prisma.contatoWhatsapp.count({
        where: { lojaId, createdAt: { gte: periodo.inicioAtual } },
      }),
      this.somarVendasNoPeriodo(lojaId, periodo.inicioAtual),
    ]);
    const totalVendas = vendasNoPeriodo.quantidade;

    return {
      taxaPercentual:
        totalContatos > 0 ? (totalVendas / totalContatos) * 100 : 0,
      totalContatos,
      totalVendas,
    };
  }

  private async calcularTicketMedio(
    lojaId: number,
    periodo: PeriodoReferencia,
  ) {
    const [atual, anterior] = await Promise.all([
      this.somarVendasNoPeriodo(lojaId, periodo.inicioAtual),
      this.somarVendasNoPeriodo(
        lojaId,
        periodo.inicioAnterior,
        periodo.fimAnterior,
      ),
    ]);

    // Média ponderada manual em vez de `_avg` do Prisma: como a venda pode
    // estar espalhada entre Veiculo (ativo) e VeiculoArquivado, não dá pra
    // pedir a média direto ao banco — cada aggregate só vê metade dos dados.
    const valor = atual.quantidade > 0 ? atual.soma / atual.quantidade : 0;
    const valorAnterior =
      anterior.quantidade > 0 ? anterior.soma / anterior.quantidade : 0;

    return {
      valor,
      variacaoPercentualVsPeriodoAnterior: percentualVariacao(
        valor,
        valorAnterior,
      ),
    };
  }

  private async calcularEmAlta(lojaId: number, topN = 4) {
    const veiculos = await this.prisma.veiculo.findMany({
      where: { lojaId, ativo: true, status: StatusVeiculo.DISPONIVEL },
      orderBy: { visualizacoes: 'desc' },
      take: topN,
      include: { imagens: true },
    });

    return veiculos.map((v) => ({
      id: v.id,
      marca: v.marca,
      modelo: v.modelo,
      anoModelo: v.anoModelo,
      quilometragem: v.quilometragem,
      preco: v.preco,
      visualizacoes: v.visualizacoes,
      imagemUrl: v.imagens.find((img) => img.capa)?.url ?? v.imagens[0]?.url,
    }));
  }

  private async calcularAlertasPrecificacao(
    lojaId: number,
    periodo: PeriodoReferencia,
    topN = 5,
  ) {
    const candidatos = await this.prisma.veiculo.findMany({
      where: {
        lojaId,
        ativo: true,
        status: StatusVeiculo.DISPONIVEL,
        visualizacoes: { gte: VISUALIZACOES_MINIMAS_ALERTA },
      },
      include: { imagens: true },
    });

    if (candidatos.length === 0) return [];

    // Reaproveita o groupBy de contatos por veículo já existente no domínio
    // de ContatoWhatsapp — só adiciona o filtro de período aqui.
    const ranking = await this.contatoWhatsappService.rankingPorVeiculo(
      lojaId,
      candidatos.length,
      periodo.inicioAtual,
    );
    const contatosPorVeiculo = new Map(
      ranking.map((r) => [r.veiculoId, r.totalContatos]),
    );

    return candidatos
      .map((v) => {
        const totalContatos = contatosPorVeiculo.get(v.id) ?? 0;
        const taxaContatoPorView = (totalContatos / v.visualizacoes) * 100;

        let acaoSugerida: 'REDUZIR_PRECO' | 'REVISAR_FOTOS' | null = null;
        if (taxaContatoPorView < LIMITE_REDUZIR_PRECO) {
          acaoSugerida = 'REDUZIR_PRECO';
        } else if (taxaContatoPorView < LIMITE_REVISAR_FOTOS) {
          acaoSugerida = 'REVISAR_FOTOS';
        }

        if (!acaoSugerida) return null;

        return {
          id: v.id,
          marca: v.marca,
          modelo: v.modelo,
          anoModelo: v.anoModelo,
          quilometragem: v.quilometragem,
          preco: v.preco,
          visualizacoes: v.visualizacoes,
          totalContatos,
          taxaContatoPorView,
          acaoSugerida,
          imagemUrl:
            v.imagens.find((img) => img.capa)?.url ?? v.imagens[0]?.url,
        };
      })
      .filter((alerta): alerta is NonNullable<typeof alerta> => alerta !== null)
      .sort((a, b) => b.visualizacoes - a.visualizacoes)
      .slice(0, topN);
  }

  private async calcularRankingVendedores(
    lojaId: number,
    periodo: PeriodoReferencia,
  ) {
    const [vendedores, contatosGroupBy, vendasAtivos, vendasArquivados] =
      await Promise.all([
        this.prisma.vendedor.findMany({ where: { lojaId, ativo: true } }),
        this.prisma.contatoWhatsapp.groupBy({
          by: ['vendedorId'],
          where: { lojaId, createdAt: { gte: periodo.inicioAtual } },
          _count: { vendedorId: true },
        }),
        this.prisma.veiculo.groupBy({
          by: ['vendedorId'],
          where: {
            lojaId,
            status: StatusVeiculo.VENDIDO,
            dataVenda: { gte: periodo.inicioAtual },
            vendedorId: { not: null },
          },
          _count: { vendedorId: true },
        }),
        this.prisma.veiculoArquivado.groupBy({
          by: ['vendedorId'],
          where: {
            lojaId,
            status: StatusVeiculo.VENDIDO,
            dataVenda: { gte: periodo.inicioAtual },
            vendedorId: { not: null },
          },
          _count: { vendedorId: true },
        }),
      ]);

    const contatosPorVendedor = new Map(
      contatosGroupBy.map((c) => [c.vendedorId, c._count.vendedorId]),
    );

    // Soma vendas de veículos ainda ativos com vendas já arquivadas —
    // mesmo veículo excluído há 30+ dias não deve "sumir" do ranking.
    const vendasPorVendedor = new Map<number, number>();
    for (const grupo of [...vendasAtivos, ...vendasArquivados]) {
      if (grupo.vendedorId === null) continue;
      vendasPorVendedor.set(
        grupo.vendedorId,
        (vendasPorVendedor.get(grupo.vendedorId) ?? 0) +
          grupo._count.vendedorId,
      );
    }

    return vendedores
      .map((vendedor) => ({
        vendedorId: vendedor.id,
        nome: vendedor.nome,
        fotoUrl: vendedor.fotoUrl ?? undefined,
        totalContatos: contatosPorVendedor.get(vendedor.id) ?? 0,
        totalVendas: vendasPorVendedor.get(vendedor.id) ?? 0,
      }))
      .sort((a, b) => b.totalVendas - a.totalVendas);
  }
}
