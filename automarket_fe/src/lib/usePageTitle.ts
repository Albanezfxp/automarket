import { useEffect } from "react";

/**
 * SPA: o `<title>` do `index.html` só vale até o JS carregar — trocar por
 * rota precisa ser feito na mão. Cada página chama isso com seu próprio
 * título; ao desmontar, restaura `AutoMarket` (fallback seguro se nenhuma
 * página seguinte setar o título antes do próximo paint).
 */
export function usePageTitle(titulo: string): void {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
