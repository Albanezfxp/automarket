import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Repassado como `--modal-max-width` — deixa modais de conteúdo maior (ex: formulários) mais largos que o padrão. */
  maxWidth?: string;
  /** Ações fixas no rodapé (ex: Cancelar/Salvar), fora da área com scroll do corpo. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Dialog genérico via portal, reutilizável por qualquer feature do painel.
 * Fecha no Escape, no clique fora (overlay) e no botão de fechar; trava o
 * scroll do body enquanto aberto; devolve o foco pro elemento que abriu o
 * modal quando ele fecha.
 */
export function Modal({ isOpen, onClose, title, maxWidth, footer, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusableSelector = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    // `createPortal` monta esse nó direto em `document.body`, fora da
    // `div.admin-theme` do AdminLayout — sem repetir a classe aqui, todo
    // `var(--admin-color-*)`/`var(--admin-text-*)` usado no modal (e em
    // qualquer conteúdo que ele receba via `children`/`footer`) fica
    // indefinido, porque variáveis CSS cascateiam pela árvore do DOM, não
    // pela árvore de componentes React.
    <div className={`admin-theme ${styles.overlay}`} onMouseDown={handleOverlayClick}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        style={maxWidth ? ({ '--modal-max-width': maxWidth } as CSSProperties) : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
