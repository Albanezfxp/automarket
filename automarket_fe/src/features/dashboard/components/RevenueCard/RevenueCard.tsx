import { useEffect, useState, type FormEvent } from "react";
import { dashboardService } from "../../../../service/Dashboard.service";
import { formatCurrency, formatSignedPercentage } from "../../../../lib/format";
import { MetricCard } from "../MetricCard/MetricCard";
import styles from "./RevenueCard.module.css";

export interface FaturamentoRevelado {
  totalPeriodo: number;
  variacaoPercentualVsPeriodoAnterior: number;
}

interface RevenueCardProps {
  dataInicio: string;
  /** Deixa o `Dashboard` reaproveitar o valor revelado (ex: no botão "Ver Relatório Completo") sem pedir a senha de novo. */
  onRevealed?: (faturamento: FaturamentoRevelado) => void;
}

/**
 * Métrica de Faturamento Total, protegida por senha própria do dono da loja.
 * O valor só entra na memória do browser depois que o backend valida a
 * senha do gerente (`POST /dashboard/faturamento/revelar`) — antes disso,
 * nenhum número real chega até aqui, nem mascarado.
 */
export function RevenueCard({ dataInicio, onRevealed }: RevenueCardProps) {
  const [isPromptOpen, setPromptOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [faturamento, setFaturamento] = useState<FaturamentoRevelado | null>(
    null,
  );

  const revealed = faturamento !== null;

  // Muda o período -> o faturamento revelado deixa de valer, tem que pedir
  // a senha de novo (evita mostrar/exportar um valor de outro período).
  useEffect(() => {
    setFaturamento(null);
    setPromptOpen(false);
  }, [dataInicio]);

  function handleToggleLock() {
    if (revealed) {
      setFaturamento(null);
      return;
    }
    setError(null);
    setPromptOpen((open) => !open);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const resultado = await dashboardService.revelarFaturamento(
        password,
        dataInicio,
      );
      setFaturamento(resultado);
      onRevealed?.(resultado);
      setPromptOpen(false);
      setPassword("");
    } catch (err) {
      setError("Senha incorreta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MetricCard
      featured
      icon="account_balance_wallet"
      title="Receita Total"
      value={
        <div className={styles.valueLine}>
          {revealed ? (
            formatCurrency(faturamento.totalPeriodo)
          ) : (
            <span className={styles.maskedValue}>R$ •••••••</span>
          )}
          <button
            type="button"
            className={styles.unlockButton}
            onClick={handleToggleLock}
            aria-label={
              revealed ? "Ocultar receita total" : "Ver receita total"
            }
          >
            <span className="material-symbols-outlined">
              {revealed ? "lock_open" : "lock"}
            </span>
          </button>
        </div>
      }
      trend={
        revealed
          ? {
              label: `${formatSignedPercentage(faturamento.variacaoPercentualVsPeriodoAnterior)} vs período anterior`,
              direction:
                faturamento.variacaoPercentualVsPeriodoAnterior >= 0
                  ? "up"
                  : "down",
            }
          : undefined
      }
      footnote={
        !revealed && (
          <span className={styles.restrictedNote}>
            <span className="material-symbols-outlined">info</span>
            Acesso restrito
          </span>
        )
      }
    >
      {!revealed && isPromptOpen && (
        <form className={styles.promptBox} onSubmit={handleSubmit}>
          <div className={styles.promptRow}>
            <input
              type="password"
              className={styles.promptInput}
              placeholder="Senha do Gerente"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              disabled={submitting}
            />
            <button
              type="submit"
              className={styles.promptButton}
              disabled={submitting}
            >
              {submitting ? "Verificando..." : "Ver"}
            </button>
          </div>
          {error && <p className={styles.promptError}>{error}</p>}
        </form>
      )}
    </MetricCard>
  );
}
