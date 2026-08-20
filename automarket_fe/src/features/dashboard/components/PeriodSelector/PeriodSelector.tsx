import { useEffect, useRef, useState } from "react";
import {
  MAX_DIAS_PERIODO,
  dataInicioValida,
  periodoUltimosDias,
  type Periodo,
} from "../../lib/period";
import styles from "./PeriodSelector.module.css";

interface PeriodSelectorProps {
  value: Periodo;
  onChange: (periodo: Periodo) => void;
}

const ATALHOS = [
  { dias: 7, label: "Últimos 7 dias" },
  { dias: 30, label: "Últimos 30 dias" },
  { dias: 90, label: "Últimos 90 dias" },
];

/**
 * Filtro de período do Dashboard: atalhos comuns + data de início
 * personalizada (o fim é sempre "hoje", ver `lib/period.ts`). Range
 * inválido (mais de 90 dias atrás, ou data futura) é bloqueado antes de
 * disparar `onChange` — nunca chega a ser aplicado.
 */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const [aberto, setAberto] = useState(false);
  const [customizando, setCustomizando] = useState(false);
  const [dataCustom, setDataCustom] = useState(value.dataInicio);
  const [erro, setErro] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setAberto(false);
        setCustomizando(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  function aplicarAtalho(dias: number, label: string) {
    setErro(null);
    onChange(periodoUltimosDias(dias, label));
    setAberto(false);
    setCustomizando(false);
  }

  function aplicarCustom() {
    if (!dataInicioValida(dataCustom)) {
      setErro(`Escolha uma data de até ${MAX_DIAS_PERIODO} dias atrás.`);
      return;
    }
    setErro(null);
    onChange({ dataInicio: dataCustom, label: "Personalizado" });
    setAberto(false);
    setCustomizando(false);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.badge}
        onClick={() => setAberto((open) => !open)}
        aria-expanded={aberto}
      >
        <span className="material-symbols-outlined">calendar_today</span>
        <span>{value.label}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {aberto ? "expand_less" : "expand_more"}
        </span>
      </button>

      {aberto && (
        <div className={styles.menu}>
          {ATALHOS.map((atalho) => (
            <button
              key={atalho.dias}
              type="button"
              className={`${styles.option} ${value.label === atalho.label ? styles.optionActive : ""}`}
              onClick={() => aplicarAtalho(atalho.dias, atalho.label)}
            >
              {atalho.label}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.option} ${customizando ? styles.optionActive : ""}`}
            onClick={() => setCustomizando((open) => !open)}
          >
            Personalizado
          </button>

          {customizando && (
            <div className={styles.customBox}>
              <label className={styles.customLabel}>
                De
                <input
                  type="date"
                  className={styles.customInput}
                  value={dataCustom}
                  onChange={(e) => setDataCustom(e.target.value)}
                />
              </label>
              <span className={styles.customUntil}>até hoje</span>
              <button type="button" className={styles.customApply} onClick={aplicarCustom}>
                Aplicar
              </button>
              {erro && <p className={styles.customError}>{erro}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
