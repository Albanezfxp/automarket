import { Link } from "react-router-dom";

import styles from "./StoreSellersPage.module.css";
import { useLojaAtual } from "../catalog/CatalogRoot";
import { StoreSellerCard } from "./components/StoreSellerCard/StoreSellerCard";
import { usePageTitle } from "../../lib/usePageTitle";

/**
 * Página "Vendedores" da loja — quem são as pessoas por trás do estoque.
 * `loja.vendedores` já vem carregado uma vez em `CatalogRoot`
 * (`GET /lojas/publico/:slug`, só ativos), sem chamada própria aqui.
 */
export default function StoreSellersPage() {
  const loja = useLojaAtual();
  const vendedores = loja.vendedores ?? [];
  usePageTitle(`Vendedores · ${loja.nome}`);

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
          <h1 className={styles.title}>Nossa equipe</h1>
          <p className={styles.subtitle}>
            Escolha quem você quer chamar no WhatsApp.
          </p>
        </div>
      </header>

      <div className={styles.body}>
        {vendedores.length > 0 ? (
          <div className={styles.grid}>
            {vendedores.map((vendedor) => (
              <StoreSellerCard key={vendedor.id} vendedor={vendedor} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 40 }}
            >
              support_agent
            </span>
            <p>Nenhum vendedor cadastrado no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
