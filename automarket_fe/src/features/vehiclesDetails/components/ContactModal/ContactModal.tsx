import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { VendedorPublico } from "../../../../types/catalog";
import { catalogService } from "../../../../service/Catalog.service";
import styles from "./ContactModal.module.css";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  veiculoId: number;
  vendedores: VendedorPublico[];
}

/**
 * Modal de escolha de vendedor — a loja pode ter mais de um vendedor. Ao
 * clicar: registra o evento via POST /contato-whatsapp/publico (sem
 * bloquear a UI — dispara e esquece) e abre o WhatsApp em nova aba
 * imediatamente, pro clique não parecer travado.
 *
 * Modal próprio (não reaproveita `components/Modal/Modal.tsx`) porque
 * aquele componente aplica a classe `admin-theme` fixa no portal — errado
 * pro contexto do catálogo público, que precisa de `catalog-theme`.
 */
export function ContactModal({ isOpen, onClose, veiculoId, vendedores }: ContactModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleEscolher(vendedor: VendedorPublico) {
    catalogService.registrarContato(veiculoId, vendedor.id).catch(() => {
      // log de evento é best-effort — não deve impedir o visitante de falar
      // com o vendedor mesmo se o registro falhar
    });
    window.open(`https://wa.me/${vendedor.whatsapp}`, "_blank", "noreferrer");
    onClose();
  }

  return createPortal(
    <div
      className={`catalog-theme ${styles.overlay}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <h2 className={styles.title}>Falar com um vendedor</h2>
        <p className={styles.subtitle}>Escolha quem você quer contatar pelo WhatsApp.</p>
        <div className={styles.list}>
          {vendedores.map((vendedor) => (
            <button
              key={vendedor.id}
              type="button"
              className={styles.sellerButton}
              onClick={() => handleEscolher(vendedor)}
            >
              {vendedor.fotoUrl ? (
                <img className={styles.avatar} src={vendedor.fotoUrl} alt="" />
              ) : (
                <span className={`material-symbols-outlined ${styles.avatar}`}>person</span>
              )}
              {vendedor.nome}
            </button>
          ))}
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>,
    document.body,
  );
}
