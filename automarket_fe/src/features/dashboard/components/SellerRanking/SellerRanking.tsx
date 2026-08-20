import { memo } from "react";
import { formatNumber } from "../../../../lib/format";
import type { RankingVendedor } from "../../../../types/dashboard";
import styles from "./SellerRanking.module.css";

interface SellerRankingProps {
  ranking: RankingVendedor[];
  onGerarRelatorio: () => void;
  gerandoRelatorio?: boolean;
}

type Tier = "high" | "medium" | "low";

const TIER_DOT_CLASS: Record<Tier, string> = {
  high: styles.dotHigh,
  medium: styles.dotMedium,
  low: styles.dotLow,
};

/** Tier relativo ao vendedor líder — não é um limiar absoluto de "bom"/"ruim". */
function tierForShare(share: number): Tier {
  if (share >= 0.6) return "high";
  if (share >= 0.3) return "medium";
  return "low";
}

/** Ranking de vendedores por volume de vendas realizadas no período (ver `calcularRankingVendedores`). */
function SellerRankingComponent({
  ranking,
  onGerarRelatorio,
  gerandoRelatorio,
}: SellerRankingProps) {
  const maxVendas = ranking[0]?.totalVendas ?? 0;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>Ranking de Vendedores</h3>
        <p className={styles.headerSubtitle}>Volume de vendas realizadas</p>
      </div>

      {ranking.length === 0 ? (
        <p className={styles.emptyState}>
          Nenhuma venda registrada no período.
        </p>
      ) : (
        <ol className={styles.list}>
          {ranking.map((vendedor, index) => {
            const share =
              maxVendas > 0 ? vendedor.totalVendas / maxVendas : 0;
            const tier = tierForShare(share);

            return (
              <li
                key={vendedor.vendedorId}
                className={`${styles.item} ${tier === "low" ? styles.itemInactive : ""}`}
              >
                <div
                  className={`${styles.rankBadge} ${index === 0 ? styles.rankBadgeFirst : ""}`}
                >
                  {index + 1}
                </div>
                <div className={styles.info}>
                  <div className={styles.name}>{vendedor.nome}</div>
                  <div className={styles.contactRow}>
                    <span className={`${styles.dot} ${TIER_DOT_CLASS[tier]}`} />
                    {formatNumber(vendedor.totalContatos)} contatos
                  </div>
                </div>
                <div className={styles.salesColumn}>
                  <div className={styles.salesValue}>
                    {vendedor.totalVendas}
                  </div>
                  <div className={styles.salesLabel}>Vendas</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.reportButton}
          onClick={onGerarRelatorio}
          disabled={gerandoRelatorio}
        >
          {gerandoRelatorio ? "Gerando..." : "Ver Relatório Completo"}
        </button>
      </div>
    </div>
  );
}

export const SellerRanking = memo(SellerRankingComponent);
