import styles from "./SellerToolbar.module.css";

export type SellerFiltro = "todos" | "ativos" | "inativos";

interface SellerToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtro: SellerFiltro;
  onFiltroChange: (filtro: SellerFiltro) => void;
}

const FILTROS: { value: SellerFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
];

export function SellerToolbar({
  search,
  onSearchChange,
  filtro,
  onFiltroChange,
}: SellerToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrapper}>
        <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar vendedor..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.filterGroup} role="tablist" aria-label="Filtrar por status">
        {FILTROS.map((opcao) => (
          <button
            key={opcao.value}
            type="button"
            role="tab"
            aria-selected={filtro === opcao.value}
            className={`${styles.filterTab} ${filtro === opcao.value ? styles.filterTabActive : ""}`}
            onClick={() => onFiltroChange(opcao.value)}
          >
            {opcao.label}
          </button>
        ))}
      </div>
    </div>
  );
}
