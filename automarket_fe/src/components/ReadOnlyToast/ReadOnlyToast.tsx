import { useEffect, useState } from "react";
import { READ_ONLY_EVENT } from "../../service/http/api-cliente";
import styles from "./ReadOnlyToast.module.css";

/**
 * Aviso exibido quando o backend está em modo demo (READ_ONLY=true) e
 * recusa uma escrita. O api-cliente dispara um evento no `window` em vez
 * de importar este componente, pra camada HTTP não depender de UI.
 */
export function ReadOnlyToast() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const abrir = () => {
      setVisivel(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisivel(false), 4000);
    };
    window.addEventListener(READ_ONLY_EVENT, abrir);
    return () => {
      window.removeEventListener(READ_ONLY_EVENT, abrir);
      clearTimeout(timer);
    };
  }, []);

  if (!visivel) return null;

  return (
    <div className={styles.toast} role="status">
      <span className="material-symbols-outlined" aria-hidden="true">
        lock
      </span>
      Demonstração somente leitura: alterações não são salvas.
    </div>
  );
}
