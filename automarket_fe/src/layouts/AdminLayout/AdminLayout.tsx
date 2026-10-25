import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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

  // Drawer da sidebar (só visível <768px; no desktop a sidebar é fixa).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Navegar (clicar num item) fecha o drawer.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    // Esc fecha e devolve o foco ao botão hambúrguer.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    // Trava o scroll da página atrás do drawer.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // O drawer só fica visível (visibility) no frame seguinte à troca de
    // classe; focar antes disso seria ignorado pelo navegador.
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  return (
    <div className={`admin-theme ${styles.shell}`}>
      <header className={styles.topbar}>
        <button
          type="button"
          ref={menuButtonRef}
          className={styles.menuButton}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className={styles.topbarTitle}>{loja?.nome ?? "Painel"}</span>
      </header>
      {menuOpen && (
        <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" />
      )}
      <Sidebar
        storeName={loja?.nome ?? ""}
        open={menuOpen}
        onClose={closeMenu}
        closeButtonRef={closeButtonRef}
      />
      <main className={styles.content}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
