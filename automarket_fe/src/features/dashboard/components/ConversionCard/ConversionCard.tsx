import { formatNumber } from '../../../../lib/format';
import { MetricCard } from '../MetricCard/MetricCard';
import styles from './ConversionCard.module.css';

interface ConversionCardProps {
  taxaPercentual: number;
  totalContatos: number;
  totalVendas: number;
}

/** Taxa de Conversão (contatos WhatsApp → vendas), com barra de progresso visual. */
export function ConversionCard({ taxaPercentual, totalContatos, totalVendas }: ConversionCardProps) {
  const taxaArredondada = Math.round(taxaPercentual * 10) / 10;
  const larguraBarra = Math.min(taxaArredondada, 100);

  return (
    <MetricCard
      icon="forum"
      title="Taxa de Conversão"
      value={
        <div className={styles.valueLine}>
          <span>{taxaArredondada}%</span>
          <span className={styles.helperText}>(Leads p/ Venda)</span>
        </div>
      }
    >
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${larguraBarra}%` }} />
      </div>
      <div className={styles.statsRow}>
        <span>Contatos: {formatNumber(totalContatos)}</span>
        <span>Vendas: {formatNumber(totalVendas)}</span>
      </div>
    </MetricCard>
  );
}
