import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { usePageTitle } from "../../lib/usePageTitle";
import { useFavicon } from "../../lib/useFavicon";
import { PRIMARY_NAV_ITEMS } from "../Sidebar/navItems";
import "../../styles/themes/admin-theme.css";
import styles from "./AdminLayout.module.css";
import { Sidebar } from "../Sidebar/Sidebar";

/**
 * Casca do painel administrativo: sidebar fixa + área de conteúdo roteada.
 *
 * Aplica a classe `admin-theme` uma única vez aqui — todo o subtree (sidebar
 * + páginas) herda os tokens de `styles/themes/admin-theme.css` por
 * cascata normal de CSS custom properties, sem precisar redeclarar em cada
 * componente.
 *
 * Título/favicon: cada seção da sidebar vira o título da aba (ex: "Veículos
 * · Auto Center Silva") e o favicon segue a logo da loja logada — mesmo
 * tratamento do site público (ver `CatalogRoot`), aqui usando `PRIMARY_NAV_ITEMS`
 * como fonte única do rótulo em vez de duplicar a lista. Páginas com um
 * título mais específico (ex: `AddVehiclePage` distinguindo criar/editar)
 * podem sobrescrever com o próprio `usePageTitle` — o efeito delas roda
 * depois deste, então vence.
 */
export function AdminLayout() {
  const { loja } = useAuth();
  const location = useLocation();

  const secaoAtual = PRIMARY_NAV_ITEMS.find((item) =>
    location.pathname.startsWith(item.to),
  );
  usePageTitle(
    secaoAtual
      ? `${secaoAtual.label} · ${loja?.nome ?? "AutoMarket"}`
      : (loja?.nome ?? "AutoMarket"),
  );
  useFavicon(loja?.logo);

  return (
    <div className={`admin-theme ${styles.shell}`}>
      <Sidebar storeName={loja?.nome ?? ""} />
      <main className={styles.content}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
