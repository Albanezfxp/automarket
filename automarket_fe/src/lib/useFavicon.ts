import { useEffect } from "react";

const DEFAULT_FAVICON = "/favicon.svg";

/**
 * Troca o favicon (`<link rel="icon">` do `index.html`) pela logo da loja
 * enquanto o visitante navega o site público dela — reforça a identidade
 * white-label (loja como protagonista, ver CLAUDE.md). `undefined`/loja sem
 * logo cadastrada mantém o favicon padrão do AutoMarket. Restaura o padrão
 * ao desmontar (voltar pro painel admin, por exemplo).
 *
 * Navegadores cacheiam favicon de forma agressiva — a troca pode não ser
 * instantânea em toda recarga, isso é limitação do browser, não do código.
 */
export function useFavicon(url: string | undefined): void {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;

    const anterior = link.href;
    link.href = url || DEFAULT_FAVICON;

    return () => {
      link.href = anterior;
    };
  }, [url]);
}
