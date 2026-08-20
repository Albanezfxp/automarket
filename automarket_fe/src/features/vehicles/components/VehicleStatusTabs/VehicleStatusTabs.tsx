import styles from "./VehicleStatusTabs.module.css";

export type StatusFiltroVeiculo = "DISPONIVEL" | "RESERVADO" | "VENDIDO" | "TODOS";

const OPCOES: { value: StatusFiltroVeiculo; label: string }[] = [
  { value: "DISPONIVEL", label: "Disponíveis" },
  { value: "RESERVADO", label: "Reservados" },
  { value: "VENDIDO", label: "Vendidos" },
  { value: "TODOS", label: "Ver todos veículos" },
];

interface VehicleStatusTabsProps {
  value: StatusFiltroVeiculo;
  onChange: (value: StatusFiltroVeiculo) => void;
  counts: Record<StatusFiltroVeiculo, number>;
}

/**
 * Filtro por status — separado do dropdown "Filtros" (ver
 * `VehicleToolbar`) de propósito: é o filtro que a loja usa o tempo todo
 * (ver o que ainda está à venda), então fica sempre visível como abas, não
 * escondido atrás de um clique. Contagens refletem a busca + filtros
 * detalhados já aplicados, não o estoque inteiro — respondem "quantos eu
 * veria se clicasse nessa aba agora".
 */
export function VehicleStatusTabs({ value, onChange, counts }: VehicleStatusTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Filtrar por status">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.value}
          type="button"
          role="tab"
          aria-selected={value === opcao.value}
          className={`${styles.tab} ${value === opcao.value ? styles.tabActive : ""}`}
          onClick={() => onChange(opcao.value)}
        >
          {opcao.label}
          <span className={styles.count}>{counts[opcao.value]}</span>
        </button>
      ))}
    </div>
  );
}
