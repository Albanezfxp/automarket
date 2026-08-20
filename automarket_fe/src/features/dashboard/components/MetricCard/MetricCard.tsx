import { memo, type ReactNode } from 'react';
import styles from './MetricCard.module.css';

interface MetricCardTrend {
  /** Percentual já formatado, ex: "+4.2%" — quem chama decide o formato (moeda, contagem, etc. variam). */
  label: string;
  direction: 'up' | 'down' | 'neutral';
}

interface MetricCardProps {
  icon: string;
  title: string;
  value: ReactNode;
  trend?: MetricCardTrend;
  footnote?: ReactNode;
  children?: ReactNode;
  /** Destaque visual reservado à métrica mais importante da tela (Receita). */
  featured?: boolean;
}

const TREND_ICON: Record<MetricCardTrend['direction'], string> = {
  up: 'trending_up',
  down: 'trending_down',
  neutral: 'trending_flat',
};

const TREND_CLASS: Record<MetricCardTrend['direction'], string> = {
  up: styles.trendPositive,
  down: styles.trendNegative,
  neutral: styles.trendNeutral,
};

/**
 * Card genérico de métrica do bento grid do Dashboard. As métricas com
 * comportamento especial (Receita bloqueada por senha, Conversão com barra
 * de progresso) usam este mesmo visual mas envolvem lógica própria — ver
 * `RevenueCard` e `ConversionCard`.
 */
function MetricCardComponent({
  icon,
  title,
  value,
  trend,
  footnote,
  children,
  featured,
}: MetricCardProps) {
  return (
    <div className={`${styles.card} ${featured ? styles.cardFeatured : ''}`}>
      <h3 className={styles.title}>
        <span className="material-symbols-outlined">{icon}</span>
        {title}
      </h3>

      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>

        {trend && (
          <div className={`${styles.trend} ${TREND_CLASS[trend.direction]}`}>
            <span className="material-symbols-outlined">{TREND_ICON[trend.direction]}</span>
            <span>{trend.label}</span>
          </div>
        )}

        {footnote && <p className={styles.footnote}>{footnote}</p>}

        {children}
      </div>
    </div>
  );
}

export const MetricCard = memo(MetricCardComponent);
