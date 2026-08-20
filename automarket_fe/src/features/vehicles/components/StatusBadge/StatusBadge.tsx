import type { StatusVeiculo } from '../../../../types/vehicle';
import styles from './StatusBadge.module.css';

const STATUS_CONFIG: Record<StatusVeiculo, { label: string; className: string }> = {
  DISPONIVEL: { label: 'Disponível', className: styles.disponivel },
  RESERVADO: { label: 'Reservado', className: styles.reservado },
  VENDIDO: { label: 'Vendido', className: styles.vendido },
};

interface StatusBadgeProps {
  status: StatusVeiculo;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
}
