import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { Loja } from "../../../../types/store";
import styles from "./CatalogHeader.module.css";

interface CatalogHeaderProps {
  loja: Loja;
}

const NAV_ITEMS = [
  { to: "vendedores", label: "Vendedores" },
  { to: "localizacao", label: "Localização" },
];

/**
 * Header fixo do site público, presente nas quatro páginas da loja
 * (Catálogo, Detalhe do veículo, Vendedores, Localização — ver App.tsx),
 * renderizado uma única vez via `CatalogLayout`.
 *
 * Marca: usa `loja.logo` quando existe; sem logo, monta um monograma (a
 * primeira letra do nome da loja) na cor primária da loja — nunca cai num
 * texto puro sem tratamento, então toda loja tem uma "marca" visual mesmo
 * sem ter feito upload de nada.
 */
export function CatalogHeader({ loja }: CatalogHeaderProps) {
  const [comprimido, setComprimido] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const homePath = `/${loja.slug}`;

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setComprimido(window.scrollY > 8);
        ticking = false;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  function navLinkClass({ isActive }: { isActive: boolean }): string {
    return `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;
  }

  return (
    <header
      className={`${styles.header} ${comprimido ? styles.headerCompact : ""}`}
    >
      <div className={styles.inner}>
        <Link
          to={homePath}
          className={styles.brand}
          onClick={() => setMenuAberto(false)}
        >
          {loja.logo ? (
            <img className={styles.logo} src={loja.logo} alt={loja.nome} />
          ) : (
            <span className={styles.mark} aria-hidden="true">
              {loja.nome.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </Link>

        <nav className={styles.nav} aria-label="Navegação da loja">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={`${homePath}/${item.to}`}
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
          >
            <span className="material-symbols-outlined">
              {menuAberto ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`${styles.mobilePanel} ${menuAberto ? styles.mobilePanelOpen : ""}`}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={`${homePath}/${item.to}`}
            className={navLinkClass}
            onClick={() => setMenuAberto(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}
