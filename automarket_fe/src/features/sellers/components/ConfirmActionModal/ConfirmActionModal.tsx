import { Modal } from "../../../../components/Modal/Modal";
import styles from "./ConfirmActionModal.module.css";

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "danger";
  submitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmação genérica pra ações de excluir/desativar/reativar vendedor —
 * substitui `window.confirm`/`window.alert` por um modal de verdade.
 */
export function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel,
  variant,
  submitting,
  error,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={variant === "danger" ? styles.buttonDanger : styles.buttonPrimary}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Aguarde..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className={styles.message}>{message}</p>
      {error && <p className={styles.error}>{error}</p>}
    </Modal>
  );
}
