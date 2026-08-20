import { formatWhatsapp } from "../../../../lib/format";
import type { Vendedor } from "../../../../types/seller";
import styles from "./SellerCard.module.css";

interface SellerCardProps {
  vendedor: Vendedor;
  onEdit: (vendedor: Vendedor) => void;
  onToggleAtivo: (vendedor: Vendedor) => void;
  onDelete: (vendedor: Vendedor) => void;
}

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/** Hash simples só pra derivar uma cor estável a partir do nome/id — não precisa ser criptográfico. */
function hashHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Card de vendedor — cada um vira um "crachá" reconhecível mesmo sem foto:
 * sem `fotoUrl`, o avatar cai pra iniciais sobre uma cor derivada do próprio
 * nome/id, então o grid inteiro nunca fica com cards visualmente idênticos.
 */
export function SellerCard({ vendedor, onEdit, onToggleAtivo, onDelete }: SellerCardProps) {
  const inativo = !vendedor.ativo;
  const hue = hashHue(`${vendedor.id}-${vendedor.nome}`);
  const contatos = vendedor._count?.contatos ?? 0;

  return (
    <article className={`${styles.card} ${inativo ? styles.cardInativo : ""}`}>
      <div className={styles.topRow}>
        <div className={`${styles.avatarRing} ${inativo ? styles.avatarRingInativo : ""}`}>
          {vendedor.fotoUrl ? (
            <img className={styles.avatar} src={vendedor.fotoUrl} alt="" />
          ) : (
            <div
              className={styles.avatarFallback}
              style={{
                background: `hsl(${hue} 65% 93%)`,
                color: `hsl(${hue} 45% 30%)`,
              }}
            >
              {getInitials(vendedor.nome)}
            </div>
          )}
        </div>
        <span
          className={`${styles.statusPill} ${inativo ? styles.statusInativo : styles.statusAtivo}`}
        >
          {inativo ? "Inativo" : "Ativo"}
        </span>
      </div>

      <h3 className={styles.name}>{vendedor.nome}</h3>

      <a
        className={styles.whatsapp}
        href={`https://wa.me/${vendedor.whatsapp}`}
        target="_blank"
        rel="noreferrer"
      >
        <span className="material-symbols-outlined">chat</span>
        {formatWhatsapp(vendedor.whatsapp)}
      </a>

      <div className={styles.statRow}>
        <span className={styles.statLabel}>Contatos recebidos</span>
        <span className={styles.statValue}>{contatos}</span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          title="Editar"
          onClick={() => onEdit(vendedor)}
        >
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          title={inativo ? "Reativar" : "Desativar"}
          onClick={() => onToggleAtivo(vendedor)}
        >
          <span className="material-symbols-outlined">
            {inativo ? "toggle_off" : "toggle_on"}
          </span>
        </button>
        <button
          type="button"
          className={styles.actionButtonDanger}
          title="Excluir"
          onClick={() => onDelete(vendedor)}
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
    </article>
  );
}
