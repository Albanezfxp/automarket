import { useEffect, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { CatalogLayout } from "../../layouts/CatalogLayout/CatalogLayout";
import { catalogService } from "../../service/Catalog.service";
import { ApiError } from "../../service/http/api-cliente";
import type { Loja } from "../../types/store";
import { useLojaSlug } from "./hooks/useLojaSlug";
import { usePageTitle } from "../../lib/usePageTitle";
import { useFavicon } from "../../lib/useFavicon";
import styles from "./CatalogRoot.module.css";

interface CatalogOutletContext {
  loja: Loja;
}

/** Usado pelas páginas filhas (`CatalogPage`, `VehicleDetailPage`) pra pegar a loja já carregada, sem refazer a chamada. */
export function useLojaAtual(): Loja {
  return useOutletContext<CatalogOutletContext>().loja;
}

/**
 * Resolve a loja pelo slug da rota (`useLojaSlug`) e monta o `CatalogLayout`
 * uma única vez em torno de todas as rotas do site público (catálogo +
 * single page) — mesmo papel que `AdminLayout` cumpre pro painel, mas aqui
 * a loja não vem de sessão autenticada, vem de um GET público.
 */
export function CatalogRoot() {
  const lojaSlug = useLojaSlug();
  const [loja, setLoja] = useState<Loja | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoja(null);
    setErro(null);

    catalogService
      .getLojaPublica(lojaSlug)
      .then((data) => {
        if (!cancelado) setLoja(data);
      })
      .catch((err) => {
        if (cancelado) return;
        setErro(
          err instanceof ApiError && err.status === 404
            ? "Loja não encontrada."
            : "Não foi possível carregar esta loja.",
        );
      });

    return () => {
      cancelado = true;
    };
  }, [lojaSlug]);

  // Título/favicon base do site da loja — páginas filhas (CatalogPage,
  // VehicleDetailPage etc.) podem sobrescrever o título com seu próprio
  // `usePageTitle` pra acrescentar um sufixo (ex: nome do veículo).
  usePageTitle(loja?.nome ?? "Catálogo de veículos");
  useFavicon(loja?.logo);

  if (erro) {
    return (
      <div className={styles.fallback}>
        <span className="material-symbols-outlined">storefront</span>
        <p>{erro}</p>
      </div>
    );
  }

  if (!loja) {
    return <div className={styles.fallback}>Carregando...</div>;
  }

  return (
    <CatalogLayout loja={loja}>
      <Outlet context={{ loja } satisfies CatalogOutletContext} />
    </CatalogLayout>
  );
}
