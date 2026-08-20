import { Link } from "react-router-dom";
import { formatCurrency, formatKilometragem } from "../../../../lib/format";
import { TIPO_VEICULO_LABELS } from "../../../vehicles/constants/fieldOptions";
import type { VeiculoPublico } from "../../../../types/catalog";
import styles from "./VehicleCard.module.css";

interface VehicleCardProps {
  veiculo: VeiculoPublico;
  lojaSlug: string;
}

/**
 * Card de veículo reaproveitado no carrossel de categoria e em qualquer
 * grid de resultado de busca/filtro. Preço promocional risca o original,
 * mesmo padrão visual do painel admin (ver AddVehiclePage.module.css,
 * classes previewPreco/previewPrecoOriginal).
 */
export function VehicleCard({ veiculo, lojaSlug }: VehicleCardProps) {
  const capa = veiculo.imagens.find((img) => img.capa) ?? veiculo.imagens[0];
  const temPromocao =
    veiculo.precoPromocional !== undefined &&
    veiculo.precoPromocional !== null &&
    veiculo.precoPromocional < veiculo.preco;

  return (
    <Link
      to={`/${lojaSlug}/veiculo/${veiculo.id}`}
      className={styles.card}
    >
      <div className={styles.mediaWrap}>
        {capa ? (
          <img className={styles.media} src={capa.url} alt={`${veiculo.marca} ${veiculo.modelo}`} loading="lazy" />
        ) : (
          <div className={styles.mediaEmpty}>
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
              directions_car
            </span>
          </div>
        )}
        {veiculo.status === "RESERVADO" && (
          <span className={styles.badge}>Reservado</span>
        )}
        {veiculo.status === "VENDIDO" && (
          <span className={`${styles.badge} ${styles.badgeSold}`}>Vendido</span>
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.tipo}>{TIPO_VEICULO_LABELS[veiculo.tipoVeiculo]}</span>
        <h3 className={styles.titulo}>
          {veiculo.marca} {veiculo.modelo}
        </h3>
        <span className={styles.meta}>
          {veiculo.anoModelo} · {formatKilometragem(veiculo.quilometragem)}
        </span>
        <div className={styles.priceRow}>
          {temPromocao && (
            <span className={styles.priceOriginal}>{formatCurrency(veiculo.preco)}</span>
          )}
          <span className={styles.price}>
            {formatCurrency(temPromocao ? veiculo.precoPromocional! : veiculo.preco)}
          </span>
        </div>
      </div>
    </Link>
  );
}
