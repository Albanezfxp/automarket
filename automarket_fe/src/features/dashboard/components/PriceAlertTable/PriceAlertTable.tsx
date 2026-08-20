import { memo } from 'react';
import { formatCurrency, formatNumber } from '../../../../lib/format';
import type { AlertaPrecificacao } from '../../../../types/dashboard';
import styles from './PriceAlertTable.module.css';

interface PriceAlertTableProps {
  alertas: AlertaPrecificacao[];
}

const ACAO_LABEL: Record<AlertaPrecificacao['acaoSugerida'], string> = {
  REDUZIR_PRECO: 'Reduzir Preço',
  REVISAR_FOTOS: 'Revisar Fotos',
};

const ACAO_BADGE_CLASS: Record<AlertaPrecificacao['acaoSugerida'], string> = {
  REDUZIR_PRECO: styles.badgeReduzirPreco,
  REVISAR_FOTOS: styles.badgeRevisarFotos,
};

/**
 * Cruza visualizações x contatos por veículo (ver `calcularAlertasPrecificacao`)
 * pra apontar anúncios que geram interesse mas não convertem em contato —
 * sinal de que o preço (ou as fotos/descrição) precisam de atenção.
 */
function PriceAlertTableComponent({ alertas }: PriceAlertTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          <span className="material-symbols-outlined">visibility_lock</span>
          Alerta de Precificação
        </h3>
        <p className={styles.headerSubtitle}>Muitas visualizações, mas baixo volume de leads (WhatsApp)</p>
      </div>

      {alertas.length === 0 ? (
        <p className={styles.emptyState}>Nenhum veículo com sinal de alerta no momento.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th>Veículo</th>
                <th>Preço</th>
                <th style={{ textAlign: 'center' }}>Views</th>
                <th style={{ textAlign: 'center' }}>Leads</th>
                <th style={{ textAlign: 'right' }}>Ação Sugerida</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {alertas.map((veiculo) => (
                <tr key={veiculo.id}>
                  <td>
                    <div className={styles.vehicleCell}>
                      <div className={styles.thumb}>
                        {veiculo.imagemUrl && <img src={veiculo.imagemUrl} alt="" loading="lazy" />}
                      </div>
                      <div>
                        <div className={styles.vehicleName}>
                          {veiculo.marca} {veiculo.modelo}
                        </div>
                        <div className={styles.vehicleMeta}>
                          {veiculo.anoModelo} • {formatNumber(veiculo.quilometragem)} km
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.priceCell}>{formatCurrency(veiculo.preco)}</td>
                  <td className={styles.metricCellHigh}>{formatNumber(veiculo.visualizacoes)}</td>
                  <td className={styles.metricCell}>{veiculo.totalContatos}</td>
                  <td className={styles.actionCell}>
                    <span className={`${styles.badge} ${ACAO_BADGE_CLASS[veiculo.acaoSugerida]}`}>
                      {ACAO_LABEL[veiculo.acaoSugerida]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const PriceAlertTable = memo(PriceAlertTableComponent);
