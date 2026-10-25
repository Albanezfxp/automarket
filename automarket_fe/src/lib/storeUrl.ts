/**
 * Monta a URL do site público de uma loja a partir do slug.
 *
 * Dois modos, escolhidos por `VITE_STORE_URL_MODE`:
 * - `path`: a loja é acessada por rota (`/:lojaSlug`, ver `useLojaSlug`).
 *   Usado em desenvolvimento e na demo (um único host, sem DNS wildcard).
 * - `subdomain`: cada loja mora no próprio subdomínio
 *   (`nomedaloja.automarket.com.br`).
 *
 * Sem a env, o padrão é `path` em dev (`import.meta.env.DEV`) e `subdomain`
 * em produção.
 */
export function getLojaPublicUrl(slug: string): string {
  const mode =
    import.meta.env.VITE_STORE_URL_MODE ??
    (import.meta.env.DEV ? "path" : "subdomain");
  if (mode === "path") {
    return `${window.location.origin}/${slug}`;
  }
  return `https://${slug}.automarket.com.br`;
}
