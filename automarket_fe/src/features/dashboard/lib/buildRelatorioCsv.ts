import {
  formatCurrency,
  formatNumber,
  formatSignedPercentage,
} from "../../../lib/format";
import type { DashboardMetricas } from "../../../types/dashboard";
import type { Loja } from "../../../types/store";
import type { FaturamentoRevelado } from "../components/RevenueCard/RevenueCard";
import type { Periodo } from "./period";

interface BuildRelatorioCsvParams {
  loja: Loja;
  periodo: Periodo;
  metricas: DashboardMetricas;
  faturamento: FaturamentoRevelado;
}

const DELIMITADOR = ";";

/** Escapa aspas/`;`/quebra de linha só quando necessário — mantém o CSV legível a olho nu. */
function campo(valor: string | number): string {
  const texto = String(valor);
  if (/[";\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function linha(...campos: (string | number)[]): string {
  return campos.map(campo).join(DELIMITADOR);
}

/**
 * Monta o CSV do relatório completo a partir dos mesmos objetos já
 * calculados pelo backend e exibidos na tela (`DashboardMetricas` +
 * `FaturamentoRevelado`) — nenhuma agregação nova acontece aqui, só
 * formatação (reaproveita `lib/format.ts`, os mesmos textos que já aparecem
 * no Dashboard).
 */
export function buildRelatorioCsv({
  loja,
  periodo,
  metricas,
  faturamento,
}: BuildRelatorioCsvParams): string {
  const geradoEm = new Date().toLocaleString("pt-BR");
  const linhas: string[] = [
    linha(`Relatório - ${loja.nome}`),
    linha(`Período: ${periodo.label} (desde ${periodo.dataInicio} até hoje)`),
    linha(`Gerado em: ${geradoEm}`),
    "",
    linha("Faturamento", "Variação vs período anterior"),
    linha(
      formatCurrency(faturamento.totalPeriodo),
      formatSignedPercentage(faturamento.variacaoPercentualVsPeriodoAnterior),
    ),
    "",
    linha("Ticket Médio", "Variação vs período anterior"),
    linha(
      formatCurrency(metricas.ticketMedio.valor),
      formatSignedPercentage(
        metricas.ticketMedio.variacaoPercentualVsPeriodoAnterior,
      ),
    ),
    "",
    linha("Taxa de Conversão", "Total de Contatos", "Total de Vendas"),
    linha(
      `${metricas.conversao.taxaPercentual.toFixed(1)}%`,
      formatNumber(metricas.conversao.totalContatos),
      formatNumber(metricas.conversao.totalVendas),
    ),
    "",
    linha("Valor Imobilizado em Estoque", "Quantidade de Veículos"),
    linha(
      formatCurrency(metricas.estoque.valorTotal),
      formatNumber(metricas.estoque.quantidadeVeiculos),
    ),
    "",
    linha("Veículos Mais Procurados"),
    linha("Marca", "Modelo", "Ano", "Km", "Preço", "Visualizações"),
    ...metricas.emAlta.map((v) =>
      linha(
        v.marca,
        v.modelo,
        v.anoModelo,
        formatNumber(v.quilometragem),
        formatCurrency(v.preco),
        formatNumber(v.visualizacoes),
      ),
    ),
    "",
    linha("Alertas de Precificação (muita visualização, pouco contato)"),
    linha(
      "Marca",
      "Modelo",
      "Ano",
      "Preço",
      "Visualizações",
      "Contatos",
      "Taxa Contato/View",
      "Ação Sugerida",
    ),
    ...metricas.alertasPrecificacao.map((a) =>
      linha(
        a.marca,
        a.modelo,
        a.anoModelo,
        formatCurrency(a.preco),
        formatNumber(a.visualizacoes),
        formatNumber(a.totalContatos),
        `${a.taxaContatoPorView.toFixed(2)}%`,
        a.acaoSugerida === "REDUZIR_PRECO" ? "Reduzir preço" : "Revisar fotos",
      ),
    ),
    "",
    linha("Ranking de Vendedores"),
    linha("Vendedor", "Contatos", "Vendas"),
    ...metricas.rankingVendedores.map((v) =>
      linha(v.nome, formatNumber(v.totalContatos), formatNumber(v.totalVendas)),
    ),
  ];

  // BOM no início: sem isso, acentuação (ex: "Período", "Não") abre corrompida no Excel.
  return `﻿${linhas.join("\n")}`;
}
