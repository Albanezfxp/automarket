import { useCallback, useEffect, useState } from "react";
import {
  formatCompactCurrency,
  formatNumber,
  formatSignedPercentage,
} from "../../lib/format";
import { downloadTextFile } from "../../lib/downloadFile";
import { useAuth } from "../auth/AuthContext";
import { dashboardService } from "../../service/Dashboard.service";
import styles from "./Dashboard.module.css";
import { ConversionCard } from "./components/ConversionCard/ConversionCard";
import { MetricCard } from "./components/MetricCard/MetricCard";
import { PeriodSelector } from "./components/PeriodSelector/PeriodSelector";
import { PriceAlertTable } from "./components/PriceAlertTable/PriceAlertTable";
import { RelatorioPasswordModal } from "./components/RelatorioPasswordModal/RelatorioPasswordModal";
import { RevenueCard, type FaturamentoRevelado } from "./components/RevenueCard/RevenueCard";
import { SellerRanking } from "./components/SellerRanking/SellerRanking";
import { TrendingVehicles } from "./components/TrendingVehicles/TrendingVehicles";
import { useDashboardData } from "./hooks/useDashboardData";
import { buildRelatorioCsv } from "./lib/buildRelatorioCsv";
import { ultimos30Dias, type Periodo } from "./lib/period";

/**
 * Visão geral do painel: as 7 métricas listadas no briefing do produto
 * (faturamento, ticket médio, conversão, estoque, veículos em alta, alerta
 * de precificação e ranking de vendedores), todas calculadas no backend a
 * partir dos dados reais da loja — ver `GET /dashboard/metricas` e
 * `hooks/useDashboardData`. O período é escolhido em `PeriodSelector` (fim
 * sempre "hoje", início até 90 dias atrás).
 */
export default function Dashboard() {
  const { loja } = useAuth();

  const [periodo, setPeriodo] = useState<Periodo>(() => ultimos30Dias());
  const { metricas, isLoading, error } = useDashboardData(periodo.dataInicio);

  // Faturamento revelado no RevenueCard (senha do gerente) — cacheado aqui
  // só pra o botão "Ver Relatório Completo" não pedir a senha de novo se o
  // lojista já revelou nesta sessão. Some sempre que o período muda.
  const [faturamentoCache, setFaturamentoCache] = useState<FaturamentoRevelado | null>(null);
  useEffect(() => {
    setFaturamentoCache(null);
  }, [periodo]);

  const [senhaModalAberto, setSenhaModalAberto] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  const baixarRelatorio = useCallback(
    (faturamento: FaturamentoRevelado) => {
      if (!metricas || !loja) return;
      const csv = buildRelatorioCsv({ loja, periodo, metricas, faturamento });
      const dataGeracao = new Date().toISOString().slice(0, 10);
      downloadTextFile(
        `relatorio-${loja.slug}-${dataGeracao}.csv`,
        csv,
        "text/csv;charset=utf-8;",
      );
    },
    [metricas, loja, periodo],
  );

  function handleGerarRelatorio() {
    if (faturamentoCache) {
      baixarRelatorio(faturamentoCache);
      return;
    }
    setSenhaModalAberto(true);
  }

  async function handleSenhaConfirmada(senha: string) {
    setGerandoRelatorio(true);
    try {
      const faturamento = await dashboardService.revelarFaturamento(
        senha,
        periodo.dataInicio,
      );
      setFaturamentoCache(faturamento);
      setSenhaModalAberto(false);
      baixarRelatorio(faturamento);
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Visão Geral</h2>
          <p className={styles.subtitle}>Metricas e performance da loja</p>
        </div>
        <div className={styles.headerActions}>
          {loja && (
            <a
              className={styles.viewStoreLink}
              href={`https://${loja.slug}.automarket.com.br`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Ver site público de ${loja.nome}`}
            >
              <span className="material-symbols-outlined">visibility</span>
            </a>
          )}
          <PeriodSelector value={periodo} onChange={setPeriodo} />
        </div>
      </header>

      {isLoading && (
        <div className={styles.skeletonGroup} aria-hidden="true">
          <div className={styles.metricsGrid}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
          <div className={styles.secondaryGrid}>
            <div className={styles.mainColumn}>
              <div className={styles.skeletonPanel} style={{ height: 220 }} />
              <div className={styles.skeletonPanel} style={{ height: 260 }} />
            </div>
            <div className={styles.skeletonPanel} style={{ height: 340 }} />
          </div>
        </div>
      )}
      {error && !isLoading && (
        <p className={styles.stateMessageError}>{error}</p>
      )}

      {metricas && loja && !isLoading && !error && (
        <>
          <div className={styles.metricsGrid}>
            <RevenueCard
              dataInicio={periodo.dataInicio}
              onRevealed={setFaturamentoCache}
            />

            <MetricCard
              icon="sell"
              title="Ticket Médio"
              value={formatCompactCurrency(metricas.ticketMedio.valor)}
              trend={{
                label: `${formatSignedPercentage(metricas.ticketMedio.variacaoPercentualVsPeriodoAnterior)} vs período anterior`,
                direction:
                  metricas.ticketMedio.variacaoPercentualVsPeriodoAnterior >= 0
                    ? "up"
                    : "down",
              }}
            />

            <ConversionCard
              taxaPercentual={metricas.conversao.taxaPercentual}
              totalContatos={metricas.conversao.totalContatos}
              totalVendas={metricas.conversao.totalVendas}
            />

            <MetricCard
              icon="inventory_2"
              title="Estoque Ativo"
              value={formatCompactCurrency(metricas.estoque.valorTotal)}
              footnote={`${formatNumber(metricas.estoque.quantidadeVeiculos)} veículos disponíveis`}
            />
          </div>

          <div className={styles.secondaryGrid}>
            <div className={styles.mainColumn}>
              <PriceAlertTable alertas={metricas.alertasPrecificacao} />
              <TrendingVehicles
                veiculos={metricas.emAlta}
                lojaSlug={loja.slug}
              />
            </div>

            <SellerRanking
              ranking={metricas.rankingVendedores}
              onGerarRelatorio={handleGerarRelatorio}
              gerandoRelatorio={gerandoRelatorio}
            />
          </div>
        </>
      )}

      <RelatorioPasswordModal
        isOpen={senhaModalAberto}
        onClose={() => setSenhaModalAberto(false)}
        onSubmit={handleSenhaConfirmada}
      />
    </div>
  );
}
