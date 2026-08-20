/**
 * Formas de dados já *derivadas* (calculadas a partir de Veiculo/Vendedor/
 * ContatoWhatsapp) que a UI do dashboard consome. Não existem como tabelas
 * no backend — são o resultado de `GET /dashboard/metricas`.
 */
import type { Veiculo } from './vehicle';

export interface FaturamentoMetrica {
  totalPeriodo: number;
  variacaoPercentualVsPeriodoAnterior: number;
}

export interface TicketMedioMetrica {
  valor: number;
  variacaoPercentualVsPeriodoAnterior: number;
}

export interface ConversaoMetrica {
  taxaPercentual: number;
  totalContatos: number;
  totalVendas: number;
}

export interface EstoqueMetrica {
  valorTotal: number;
  quantidadeVeiculos: number;
}

export interface VeiculoEmAlta extends Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'anoModelo' | 'quilometragem' | 'preco'> {
  imagemUrl?: string;
  visualizacoes: number;
}

export type AcaoSugerida = 'REDUZIR_PRECO' | 'REVISAR_FOTOS';

export interface AlertaPrecificacao extends Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'anoModelo' | 'quilometragem' | 'preco'> {
  imagemUrl?: string;
  visualizacoes: number;
  totalContatos: number;
  taxaContatoPorView: number;
  acaoSugerida: AcaoSugerida;
}

export interface RankingVendedor {
  vendedorId: number;
  nome: string;
  fotoUrl?: string;
  totalContatos: number;
  totalVendas: number;
}

/**
 * `faturamento` não faz parte deste pacote de propósito — o valor só existe
 * em memória depois que `dashboardService.revelarFaturamento` valida a senha
 * do gerente no backend (ver `RevenueCard`). Nunca deve chegar ao browser
 * junto com o resto das métricas, mascarado ou não.
 */
export interface DashboardMetricas {
  ticketMedio: TicketMedioMetrica;
  conversao: ConversaoMetrica;
  estoque: EstoqueMetrica;
  emAlta: VeiculoEmAlta[];
  alertasPrecificacao: AlertaPrecificacao[];
  rankingVendedores: RankingVendedor[];
}
