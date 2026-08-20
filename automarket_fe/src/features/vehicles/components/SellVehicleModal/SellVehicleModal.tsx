import { useEffect, useState } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import { vendedoresService } from "../../../../service/Vendedores.service";
import type { Vendedor } from "../../../../types/seller";
import styles from "./SellVehicleModal.module.css";

interface SellVehicleModalProps {
  isOpen: boolean;
  veiculoNome: string;
  onClose: () => void;
  onConfirm: (vendedorId: number) => Promise<void>;
}

/**
 * Seletor de vendedor pra confirmar uma venda — passo extra exigido antes de
 * marcar um veículo como VENDIDO, já que a venda agora precisa de um
 * `vendedorId` real (`PATCH /veiculos/:id/vender`), não mais só uma troca
 * de status.
 */
export function SellVehicleModal({
  isOpen,
  veiculoNome,
  onClose,
  onConfirm,
}: SellVehicleModalProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSelectedId(null);

    vendedoresService
      .findAll({ ativo: true })
      .then(setVendedores)
      .catch(() => setError("Não foi possível carregar os vendedores."))
      .finally(() => setLoading(false));
  }, [isOpen]);

  async function handleConfirm() {
    if (selectedId === null) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Marcar como vendido"
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
            className={styles.buttonPrimary}
            onClick={handleConfirm}
            disabled={selectedId === null || submitting}
          >
            {submitting ? "Confirmando..." : "Confirmar venda"}
          </button>
        </>
      }
    >
      <p className={styles.description}>
        Selecione quem vendeu <strong>{veiculoNome}</strong>:
      </p>

      {loading && <p className={styles.stateMessage}>Carregando vendedores...</p>}
      {error && !loading && <p className={styles.stateMessageError}>{error}</p>}
      {!loading && !error && vendedores.length === 0 && (
        <p className={styles.stateMessage}>Nenhum vendedor ativo cadastrado.</p>
      )}

      {!loading && !error && vendedores.length > 0 && (
        <div className={styles.list}>
          {vendedores.map((vendedor) => (
            <label key={vendedor.id} className={styles.option}>
              <input
                type="radio"
                name="vendedor"
                checked={selectedId === vendedor.id}
                onChange={() => setSelectedId(vendedor.id)}
              />
              {vendedor.nome}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
