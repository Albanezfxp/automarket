import { formatWhatsapp } from "../../../../lib/format";
import type { VendedorPublico } from "../../../../types/catalog";
import styles from "./StoreSellerCard.module.css";

interface StoreSellerCardProps {
  vendedor: VendedorPublico;
}

function getInitials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/** Hash simples só pra derivar uma cor estável a partir do nome/id — mesmo truque do SellerCard do painel admin. */
function hashHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Card editorial da página "Vendedores" do catálogo público. Diferente do
 * `ContactModal`, aqui não há veículo associado ao clique — por isso o CTA
 * abre o WhatsApp direto, sem registrar evento em `ContatoWhatsapp` (esse
 * log é sempre por veículo, ver `POST /contato-whatsapp/publico`).
 */
export function StoreSellerCard({ vendedor }: StoreSellerCardProps) {
  const hue = hashHue(`${vendedor.id}-${vendedor.nome}`);

  return (
    <article className={styles.card}>
      <div className={styles.avatarWrap}>
        {vendedor.fotoUrl ? (
          <img className={styles.avatar} src={vendedor.fotoUrl} alt="" />
        ) : (
          <div
            className={styles.avatarFallback}
            style={{ background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 45% 32%)` }}
          >
            {getInitials(vendedor.nome)}
          </div>
        )}
      </div>

      <span className={styles.eyebrow}>Vendedor</span>
      <h3 className={styles.name}>{vendedor.nome}</h3>

      <a
        className={styles.cta}
        href={`https://wa.me/${vendedor.whatsapp}`}
        target="_blank"
        rel="noreferrer"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          chat
        </span>
        Chamar no WhatsApp
      </a>
      <span className={styles.number}>{formatWhatsapp(vendedor.whatsapp)}</span>
    </article>
  );
}
