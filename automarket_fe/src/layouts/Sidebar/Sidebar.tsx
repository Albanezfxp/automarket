import { memo, type Ref } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import styles from "./Sidebar.module.css";
import { PRIMARY_NAV_ITEMS } from "./navItems";

interface SidebarProps {
  storeName: string;
  /** Mobile (<768px): drawer aberto. No desktop a sidebar é sempre visível. */
  open?: boolean;
  /** Fecha o drawer (botão fechar). Esc/clique fora ficam no AdminLayout. */
  onClose?: () => void;
  /** Ref do botão fechar — o AdminLayout move o foco para ele ao abrir. */
  closeButtonRef?: Ref<HTMLButtonElement>;
}

/**
 * Navegação lateral do painel. Memoizado porque `AdminLayout` re-renderiza
 * a cada troca de rota (o `<Outlet />` muda), mas a sidebar em si depende
 * só do nome da loja e da rota ativa — não precisa recalcular no resto.
 */
function SidebarComponent({
  storeName,
  open = false,
  onClose,
  closeButtonRef,
}: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <nav
      id="admin-sidebar"
      className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
      aria-label="Navegação principal"
    >
      <button
        type="button"
        ref={closeButtonRef}
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Fechar menu"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <span className="material-symbols-outlined">directions_car</span>
          </div>
          <div>
            <p className={styles.brandName}>{storeName}</p>
            <p className={styles.brandSubtitle}>Painel de Gestão</p>
          </div>
        </div>
      </div>

      <div className={styles.nav}>
        {PRIMARY_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <a href="#suporte" className={styles.navLink}>
          <span className="material-symbols-outlined">help</span>
          <span>Suporte</span>
        </a>
        <button type="button" className={styles.navLink} onClick={handleLogout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}

export const Sidebar = memo(SidebarComponent);
