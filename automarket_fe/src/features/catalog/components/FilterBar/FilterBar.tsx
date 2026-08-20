import type { ChangeEvent } from "react";
import type { FiltrosVeiculoPublico } from "../../../../types/catalog";
import {
  CAMBIO_LABELS,
  COMBUSTIVEL_LABELS,
  TIPO_VEICULO_LABELS,
} from "../../../vehicles/constants/fieldOptions";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  filtros: FiltrosVeiculoPublico;
  onChange: (filtros: FiltrosVeiculoPublico) => void;
}

/**
 * Busca em destaque (marca/modelo) + filtros essenciais em barra horizontal
 * de selects tipo "chip" — cobre os campos que um comprador de usado busca
 * primeiro (tipo, câmbio, combustível, faixa de preço/ano), sem tentar
 * cobrir todo enum do schema (decisão documentada no prompt).
 */
export function FilterBar({ filtros, onChange }: FilterBarProps) {
  function update(patch: Partial<FiltrosVeiculoPublico>) {
    onChange({ ...filtros, ...patch });
  }

  function handleSelect(
    key: keyof FiltrosVeiculoPublico,
  ): (e: ChangeEvent<HTMLSelectElement>) => void {
    return (e) => update({ [key]: e.target.value || undefined } as Partial<FiltrosVeiculoPublico>);
  }

  const temFiltroAtivo =
    filtros.tipoVeiculo || filtros.cambio || filtros.combustivel || filtros.precoMax || filtros.anoMin;

  return (
    <div className={styles.bar}>
      <div className={styles.searchWrap}>
        <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
        <input
          className={styles.searchInput}
          placeholder="Busque por marca ou modelo (ex: Honda Civic)"
          value={filtros.busca ?? ""}
          onChange={(e) => update({ busca: e.target.value || undefined })}
        />
      </div>

      <select
        className={`${styles.select} ${filtros.tipoVeiculo ? styles.active : ""}`}
        value={filtros.tipoVeiculo ?? ""}
        onChange={handleSelect("tipoVeiculo")}
      >
        <option value="">Tipo</option>
        {Object.entries(TIPO_VEICULO_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={`${styles.select} ${filtros.cambio ? styles.active : ""}`}
        value={filtros.cambio ?? ""}
        onChange={handleSelect("cambio")}
      >
        <option value="">Câmbio</option>
        {Object.entries(CAMBIO_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={`${styles.select} ${filtros.combustivel ? styles.active : ""}`}
        value={filtros.combustivel ?? ""}
        onChange={handleSelect("combustivel")}
      >
        <option value="">Combustível</option>
        {Object.entries(COMBUSTIVEL_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={`${styles.select} ${filtros.precoMax ? styles.active : ""}`}
        value={filtros.precoMax ?? ""}
        onChange={(e) =>
          update({ precoMax: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">Preço até</option>
        <option value="40000">Até R$ 40 mil</option>
        <option value="70000">Até R$ 70 mil</option>
        <option value="100000">Até R$ 100 mil</option>
        <option value="150000">Até R$ 150 mil</option>
        <option value="250000">Até R$ 250 mil</option>
      </select>

      <select
        className={`${styles.select} ${filtros.anoMin ? styles.active : ""}`}
        value={filtros.anoMin ?? ""}
        onChange={(e) =>
          update({ anoMin: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">Ano a partir de</option>
        {[2024, 2022, 2020, 2018, 2015, 2010].map((ano) => (
          <option key={ano} value={ano}>
            {ano}+
          </option>
        ))}
      </select>

      {temFiltroAtivo && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={() =>
            onChange({ busca: filtros.busca })
          }
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
