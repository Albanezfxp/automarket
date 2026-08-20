import { memo } from "react";
import {
  formatCompactNumber,
  formatCurrency,
  formatNumber,
} from "../../../../lib/format";
import type { VeiculoEmAlta } from "../../../../types/dashboard";
import styles from "./TrendingVehicles.module.css";

interface TrendingVehiclesProps {
  veiculos: VeiculoEmAlta[];
  lojaSlug: string;
}

/** Veículos disponíveis com mais visualizações no catálogo público — sinal de demanda. */
function TrendingVehiclesComponent(props: TrendingVehiclesProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Em Alta (Mais Visualizados)</h3>
      <div className={styles.grid}>
        {props.veiculos.map((veiculo) => (
          <article key={veiculo.id} className={styles.card}>
            <div className={styles.imageWrapper}>
              {veiculo.imagemUrl && (
                <img
                  src={veiculo.imagemUrl}
                  alt={`${veiculo.marca} ${veiculo.modelo}`}
                  loading="lazy"
                />
              )}
              <div className={styles.viewsBadge}>
                <span className="material-symbols-outlined">visibility</span>
                {formatCompactNumber(veiculo.visualizacoes)} views
              </div>
            </div>
            <div className={styles.body}>
              <h4 className={styles.name}>
                {veiculo.marca} {veiculo.modelo}
              </h4>
              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <span className="material-symbols-outlined">
                    calendar_month
                  </span>
                  {veiculo.anoModelo}
                </span>
                <span>•</span>
                <span className={styles.metaItem}>
                  <span className="material-symbols-outlined">speed</span>
                  {formatNumber(veiculo.quilometragem)} km
                </span>
              </div>
              <div className={styles.price}>
                {formatCurrency(veiculo.preco)}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export const TrendingVehicles = memo(TrendingVehiclesComponent);
