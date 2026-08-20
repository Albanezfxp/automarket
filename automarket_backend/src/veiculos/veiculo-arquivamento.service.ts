import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';

const DIAS_ATE_ARQUIVAMENTO = 30;

const SELECT_CANDIDATO = {
  id: true,
  lojaId: true,
  marca: true,
  modelo: true,
  anoModelo: true,
  preco: true,
  status: true,
  visualizacoes: true,
  vendedorId: true,
  createdAt: true,
  dataVenda: true,
  excluidoEm: true,
} satisfies Prisma.VeiculoSelect;

type VeiculoCandidato = Prisma.VeiculoGetPayload<{ select: typeof SELECT_CANDIDATO }>;

/**
 * "Excluir" um veículo no painel só faz soft delete (ver
 * VeiculosService.delete) — some da tela na hora, mas continua no banco.
 * Esse cron roda 1x por dia e, pros veículos excluídos há 30 dias ou mais,
 * congela um retrato das métricas em VeiculoArquivado (ver schema.prisma)
 * e só então apaga o Veiculo de vez. Sem esse passo de arquivar antes, o
 * delete apagaria em cascata as imagens (sem problema, não têm valor
 * histórico) e perderia pra sempre os números que o Dashboard soma
 * (faturamento, ticket médio, conversão, ranking de vendedores) — ver como
 * DashboardService combina Veiculo + VeiculoArquivado nesses cálculos.
 */
@Injectable()
export class VeiculoArquivamentoService {
  private readonly logger = new Logger(VeiculoArquivamentoService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async arquivarVeiculosExcluidos() {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_ATE_ARQUIVAMENTO);

    const candidatos = await this.prisma.veiculo.findMany({
      where: { ativo: false, excluidoEm: { lte: limite } },
      select: SELECT_CANDIDATO,
    });

    if (candidatos.length === 0) return;

    let arquivados = 0;
    for (const veiculo of candidatos) {
      const sucesso = await this.arquivarUm(veiculo);
      if (sucesso) arquivados++;
    }

    this.logger.log(
      `${arquivados}/${candidatos.length} veículo(s) excluído(s) há mais de ${DIAS_ATE_ARQUIVAMENTO} dias foram arquivados e apagados definitivamente.`,
    );
  }

  private async arquivarUm(veiculo: VeiculoCandidato): Promise<boolean> {
    try {
      const totalContatos = await this.prisma.contatoWhatsapp.count({
        where: { veiculoId: veiculo.id },
      });

      await this.prisma.$transaction([
        this.prisma.veiculoArquivado.create({
          data: {
            veiculoIdOriginal: veiculo.id,
            lojaId: veiculo.lojaId,
            marca: veiculo.marca,
            modelo: veiculo.modelo,
            anoModelo: veiculo.anoModelo,
            preco: veiculo.preco,
            status: veiculo.status,
            visualizacoes: veiculo.visualizacoes,
            totalContatos,
            vendedorId: veiculo.vendedorId,
            criadoEm: veiculo.createdAt,
            dataVenda: veiculo.dataVenda,
            // sempre presente aqui: o where do findMany já exige
            // excluidoEm != null (ativo=false + excluidoEm <= limite)
            excluidoEm: veiculo.excluidoEm as Date,
          },
        }),
        // cascata apaga VeiculoImagem (sem valor histórico) e deixa
        // ContatoWhatsapp.veiculoId como null (SetNull) — o contato em si
        // sobrevive graças ao lojaId já denormalizado nele.
        this.prisma.veiculo.delete({ where: { id: veiculo.id } }),
      ]);

      return true;
    } catch (error) {
      this.logger.error(`Erro ao arquivar o veículo ${veiculo.id}`, error);
      return false;
    }
  }
}
