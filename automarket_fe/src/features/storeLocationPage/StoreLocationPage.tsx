import { Link } from "react-router-dom";
import { formatEndereco } from "../../lib/format";
import styles from "./StoreLocationPage.module.css";
import { useLojaAtual } from "../catalog/CatalogRoot";
import { usePageTitle } from "../../lib/usePageTitle";

/**
 * Página "Localização" da loja. `loja.endereco` já vem carregado uma vez em
 * `CatalogRoot` (`GET /lojas/publico/:slug`), sem chamada própria aqui.
 *
 * Mapa embutido via Google Maps (endpoint de embed sem necessidade de API
 * key/conta no Google Cloud — o mesmo `output=embed` que o botão "Incorporar
 * mapa" do próprio Google Maps gera) — não precisamos geocodificar nada
 * porque a loja já digita o endereço completo em Configurações; o Maps só
 * recebe esse texto como busca (`q=`) e resolve a localização sozinho.
 */
export default function StoreLocationPage() {
  const loja = useLojaAtual();
  usePageTitle(`Localização · ${loja.nome}`);
  const endereco = loja.endereco;
  const enderecoTexto = endereco ? formatEndereco(endereco) : "";
  const mapsHref = endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoTexto)}`
    : undefined;
  const mapEmbedSrc = endereco
    ? `https://maps.google.com/maps?q=${encodeURIComponent(enderecoTexto)}&z=15&output=embed`
    : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.pageHero}>
        <div className={styles.pageHeroInner}>
          <Link to={`/${loja.slug}`} className={styles.breadcrumb}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              arrow_back
            </span>
            {loja.nome}
          </Link>
          <h1 className={styles.title}>Onde estamos</h1>
        </div>
      </header>

      <div className={styles.body}>
        {endereco ? (
          <div className={styles.layout}>
            <div className={styles.signage}>
              <span className={styles.eyebrow}>Endereço</span>
              {endereco.rua && (
                <p className={styles.street}>
                  {endereco.rua}
                  {endereco.numero ? `, ${endereco.numero}` : ""}
                </p>
              )}
              <p className={styles.cityLine}>
                {endereco.bairro ? `${endereco.bairro} · ` : ""}
                {endereco.cidade} - {endereco.estado}
              </p>
              {endereco.cep && <p className={styles.cep}>CEP {endereco.cep}</p>}

              <div className={styles.actions}>
                <a
                  className={styles.primaryCta}
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20 }}
                  >
                    directions
                  </span>
                  Ver no mapa
                </a>
                {loja.telefone && (
                  <a
                    className={styles.secondaryCta}
                    href={`tel:${loja.telefone.replace(/[^\d+]/g, "")}`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20 }}
                    >
                      call
                    </span>
                    {loja.telefone}
                  </a>
                )}
              </div>
            </div>

            <div className={styles.mapPanel}>
              <iframe
                className={styles.mapFrame}
                src={mapEmbedSrc}
                title={`Mapa mostrando a localização de ${loja.nome}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 40 }}
            >
              location_off
            </span>
            <p>Endereço não informado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
