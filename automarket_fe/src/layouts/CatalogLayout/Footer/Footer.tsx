import type { SVGProps } from "react";
import { formatEndereco, formatWhatsapp } from "../../../lib/format";
import type { Loja } from "../../../types/store";
import styles from "./Footer.module.css";

interface FooterProps {
  loja: Loja;
}

/**
 * Footer do site público, presente nas quatro páginas da loja (ver
 * `CatalogLayout`), reaproveitando só dados que a loja já cadastra em
 * Configurações — cada bloco (redes sociais / horário / telefone / WhatsApp)
 * só aparece se o campo correspondente estiver preenchido.
 */
export function Footer({ loja }: FooterProps) {
  const endereco = loja.endereco;
  const temHorario = loja.horarioAbertura && loja.horarioFechamento;
  const temRedeSocial = Boolean(
    loja.facebookUrl || loja.instagramUrl || loja.youtubeUrl,
  );
  const anoAtual = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.mainBlock}>
        <div className={styles.column}>
          <p className={styles.storeName}>{loja.nome}</p>
          {endereco && (
            <p className={styles.infoLine}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                location_on
              </span>
              {formatEndereco(endereco)}
            </p>
          )}
        </div>

        {temHorario && (
          <div className={styles.column}>
            <p className={styles.storeName}>Horario de funcionamento</p>
            <p className={styles.infoLine}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                schedule
              </span>
              Aberto das {loja.horarioAbertura} às {loja.horarioFechamento}
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <p className={styles.storeName}>Telefone</p>

          {loja.telefone && (
            <a
              className={styles.actionButton}
              href={`tel:${loja.telefone.replace(/[^\d+]/g, "")}`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                call
              </span>
              Ligue agora: {loja.telefone}
            </a>
          )}
          {loja.whatsapp && (
            <a
              className={`${styles.actionButton} ${styles.actionButtonWhatsapp}`}
              href={`https://wa.me/${loja.whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                chat
              </span>
              WhatsApp: {formatWhatsapp(loja.whatsapp)}
            </a>
          )}
        </div>
      </div>

      {temRedeSocial && (
        <div className={styles.socialBlock}>
          <span className={styles.socialLabel}>
            Siga-nos em nossas redes sociais
          </span>
          <div className={styles.socialIcons}>
            {loja.facebookUrl && (
              <a
                href={loja.facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className={styles.socialLink}
              >
                <FacebookIcon />
              </a>
            )}
            {loja.instagramUrl && (
              <a
                href={loja.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className={styles.socialLink}
              >
                <InstagramIcon />
              </a>
            )}
            {loja.youtubeUrl && (
              <a
                href={loja.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className={styles.socialLink}
              >
                <YoutubeIcon />
              </a>
            )}
          </div>
        </div>
      )}

      <div className={styles.bottomBlock}>
        <span>
          {loja.nome} © {anoAtual} - Todos os direitos reservados
        </span>
        {/* TODO: logo AutoMarket quando disponível */}
        <span className={styles.poweredBy}>AutoMarket</span>
      </div>
    </footer>
  );
}

// Material Symbols Outlined não tem glyphs de marca (Facebook/Instagram/
// YouTube são logos, não ícones genéricos) — únicos SVGs inline do projeto,
// deliberadamente fora do padrão `material-symbols-outlined` usado em todo
// o resto da UI.
function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      {...props}
    >
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      {...props}
    >
      <path d="M23 12s0-3.5-.45-5.15a2.9 2.9 0 0 0-2-2.05C18.9 4.3 12 4.3 12 4.3s-6.9 0-8.55.5a2.9 2.9 0 0 0-2 2.05C1 8.5 1 12 1 12s0 3.5.45 5.15a2.9 2.9 0 0 0 2 2.05c1.65.5 8.55.5 8.55.5s6.9 0 8.55-.5a2.9 2.9 0 0 0 2-2.05C23 15.5 23 12 23 12Z" />
      <path
        fill="currentColor"
        stroke="none"
        d="M9.75 15.02 15.5 12 9.75 8.98Z"
      />
    </svg>
  );
}
