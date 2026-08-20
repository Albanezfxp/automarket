import { useParams } from "react-router-dom";

/**
 * Isola a leitura do slug da loja atrás de um hook único. Hoje lê de
 * `useParams` (`/:lojaSlug`, ver App.tsx) porque em desenvolvimento não há
 * proxy de subdomínio; em produção (`nomedaloja.automarket.com.br`) a
 * resolução provavelmente vira leitura de `window.location.hostname` — essa
 * troca fica isolada aqui, num arquivo só.
 */
export function useLojaSlug(): string {
  const { lojaSlug } = useParams<{ lojaSlug: string }>();
  if (!lojaSlug) {
    throw new Error("useLojaSlug: rota sem parâmetro :lojaSlug.");
  }
  return lojaSlug;
}
