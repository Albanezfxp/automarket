import { useEffect, useRef, useState } from "react";
import type { VeiculoFiltrosDetalhados } from "../../../../types/vehicle";
import {
  CAMBIO_LABELS,
  COMBUSTIVEL_LABELS,
  DIRECAO_LABELS,
  TIPO_VEICULO_LABELS,
} from "../../constants/fieldOptions";
import styles from "./VehicleToolbar.module.css";

interface VehicleToolbarProps {
  value: string;
  onChange: (value: string) => void;
  filtros: VeiculoFiltrosDetalhados;
  onFiltrosChange: (filtros: VeiculoFiltrosDetalhados) => void;
}

const CAMPOS_NUMERICOS = ["precoMin", "precoMax", "anoMin", "anoMax"] as const;

function contarFiltrosAtivos(filtros: VeiculoFiltrosDetalhados): number {
  return Object.values(filtros).filter((v) => v !== undefined && v !== "").length;
}

/**
 * Busca + o dropdown "Filtros" (tipo, câmbio, combustível, direção, faixa
 * de preço/ano) — mais detalhado que o `FilterBar` do catálogo público
 * porque aqui é a própria loja peneirando o estoque, não um comprador. O
 * filtro por status (Disponíveis/Reservados/Vendidos) fica de fora de
 * propósito — vive como abas sempre visíveis em `VehicleStatusTabs`, um
 * nível acima, não escondido aqui atrás de um clique.
 */
export function VehicleToolbar({
  value,
  onChange,
  filtros,
  onFiltrosChange,
}: VehicleToolbarProps) {
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function handleClickFora(event: MouseEvent) {
      if (!painelRef.current?.contains(event.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  function update(patch: Partial<VeiculoFiltrosDetalhados>) {
    onFiltrosChange({ ...filtros, ...patch });
  }

  function updateNumero(
    campo: (typeof CAMPOS_NUMERICOS)[number],
    raw: string,
  ) {
    update({ [campo]: raw ? Number(raw) : undefined });
  }

  const filtrosAtivos = contarFiltrosAtivos(filtros);

  return (
    <div className={styles.toolbar} ref={painelRef}>
      <div className={styles.searchWrapper}>
        <span className={`material-symbols-outlined ${styles.searchIcon}`}>
          search
        </span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar marca ou modelo..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      <div className={styles.filterWrapper}>
        <button
          type="button"
          className={`${styles.filterButton} ${filtrosAtivos > 0 ? styles.filterButtonActive : ""}`}
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
        >
          <span className="material-symbols-outlined">filter_list</span>
          Filtros
          {filtrosAtivos > 0 && (
            <span className={styles.filterBadge}>{filtrosAtivos}</span>
          )}
        </button>

        {aberto && (
          <div className={styles.panel}>
            <div className={styles.panelGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tipo</span>
                <select
                  className={styles.select}
                  value={filtros.tipoVeiculo ?? ""}
                  onChange={(e) =>
                    update({
                      tipoVeiculo:
                        (e.target.value as VeiculoFiltrosDetalhados["tipoVeiculo"]) ||
                        undefined,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {Object.entries(TIPO_VEICULO_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Câmbio</span>
                <select
                  className={styles.select}
                  value={filtros.cambio ?? ""}
                  onChange={(e) =>
                    update({
                      cambio:
                        (e.target.value as VeiculoFiltrosDetalhados["cambio"]) ||
                        undefined,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {Object.entries(CAMBIO_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Combustível</span>
                <select
                  className={styles.select}
                  value={filtros.combustivel ?? ""}
                  onChange={(e) =>
                    update({
                      combustivel:
                        (e.target.value as VeiculoFiltrosDetalhados["combustivel"]) ||
                        undefined,
                    })
                  }
                >
                  <option value="">Todos</option>
                  {Object.entries(COMBUSTIVEL_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Direção</span>
                <select
                  className={styles.select}
                  value={filtros.direcao ?? ""}
                  onChange={(e) =>
                    update({
                      direcao:
                        (e.target.value as VeiculoFiltrosDetalhados["direcao"]) ||
                        undefined,
                    })
                  }
                >
                  <option value="">Todas</option>
                  {Object.entries(DIRECAO_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Preço mínimo</span>
                <input
                  className={styles.select}
                  type="number"
                  min={0}
                  placeholder="R$ 0"
                  value={filtros.precoMin ?? ""}
                  onChange={(e) => updateNumero("precoMin", e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Preço máximo</span>
                <input
                  className={styles.select}
                  type="number"
                  min={0}
                  placeholder="Sem limite"
                  value={filtros.precoMax ?? ""}
                  onChange={(e) => updateNumero("precoMax", e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ano a partir de</span>
                <input
                  className={styles.select}
                  type="number"
                  placeholder="Ex: 2018"
                  value={filtros.anoMin ?? ""}
                  onChange={(e) => updateNumero("anoMin", e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ano até</span>
                <input
                  className={styles.select}
                  type="number"
                  placeholder="Ex: 2024"
                  value={filtros.anoMax ?? ""}
                  onChange={(e) => updateNumero("anoMax", e.target.value)}
                />
              </label>
            </div>

            <button
              type="button"
              className={styles.clearButton}
              onClick={() => onFiltrosChange({})}
              disabled={filtrosAtivos === 0}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
