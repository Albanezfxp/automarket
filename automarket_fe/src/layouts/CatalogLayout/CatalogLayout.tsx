import { Suspense, type CSSProperties, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import type { Loja } from "../../types/store";
import { CatalogHeader } from "../../features/catalog/components/CatalogHeader/CatalogHeader";
import { Footer } from "./Footer/Footer";
import "../../styles/themes/catalog-theme.css";
import styles from "./CatalogLayout.module.css";

interface CatalogLayoutProps {
  loja: Loja;
  /** Permite injetar chrome fixo (ex: header com busca) sem duplicar o layout. */
  children?: ReactNode;
}

/**
 * Casca do site público (catálogo + detalhe do veículo).
 *
 * Aplica a classe `catalog-theme` uma única vez, igual ao `AdminLayout` faz
 * com `admin-theme` — todo o subtree herda os tokens de
 * `styles/themes/catalog-theme.css` por cascata normal de CSS custom
 * properties.
 *
 * Além disso, sobrescreve `--catalog-color-primary`/`--catalog-color-secondary`
 * via `style` inline quando a loja customizou essas cores (Loja.corPrimaria /
 * Loja.corSecundaria) — CSS custom properties em `style` inline têm
 * precedência sobre as definidas na classe `.catalog-theme`, então nenhum
 * outro arquivo CSS precisa mudar. Lojas sem customização caem no default
 * do `catalog-theme.css`.
 */
export function CatalogLayout({ loja, children }: CatalogLayoutProps) {
  const themeOverrides = {
    ...(loja.corPrimaria && { "--catalog-color-primary": loja.corPrimaria }),
    ...(loja.corSecundaria && {
      "--catalog-color-secondary": loja.corSecundaria,
    }),
  } as CSSProperties;

  return (
    <div className={`catalog-theme ${styles.shell}`} style={themeOverrides}>
      <CatalogHeader loja={loja} />
      <Suspense fallback={null}>
        <div className={styles.content}>{children ?? <Outlet />}</div>
      </Suspense>
      <Footer loja={loja} />
    </div>
  );
}
