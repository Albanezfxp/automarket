import { useCallback, useState, type FormEvent } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import styles from "./RelatorioPasswordModal.module.css";

interface RelatorioPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Deve rejeitar (senha incorreta) ou resolver (senha ok, relatório já baixado pelo chamador). */
  onSubmit: (senha: string) => Promise<void>;
}

/**
 * Senha do gerente pedida no clique de "Ver Relatório Completo", quando o
 * faturamento ainda não foi revelado no `RevenueCard` nesta sessão — mesmo
 * texto/UX do prompt inline do `RevenueCard`, só que em modal (o botão vive
 * no `SellerRanking`, longe do card de faturamento).
 */
export function RelatorioPasswordModal({
  isOpen,
  onClose,
  onSubmit,
}: RelatorioPasswordModalProps) {
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // `useCallback` aqui não é só otimização: `Modal` refaz o foco no primeiro
  // elemento focável (o X de fechar) toda vez que `onClose` muda de
  // identidade (é dependência do `useEffect` de foco). Sem isso, cada
  // keystroke no campo de senha recriava `handleClose`, e o foco pulava do
  // input pro X a cada letra digitada.
  const handleClose = useCallback(() => {
    setSenha("");
    setError(null);
    onClose();
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(senha);
      setSenha("");
    } catch {
      setError("Senha incorreta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Senha do gerente">
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.hint}>
          O relatório completo inclui o faturamento do período, protegido pela
          senha do gerente.
        </p>
        <input
          type="password"
          className={styles.input}
          placeholder="Senha do Gerente"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
          disabled={submitting}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Verificando..." : "Gerar relatório"}
        </button>
      </form>
    </Modal>
  );
}
