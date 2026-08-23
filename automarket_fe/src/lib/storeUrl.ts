/**
 * Monta a URL do site público de uma loja a partir do slug.
 *
 * Em produção cada loja mora no próprio subdomínio
 * (`nomedaloja.automarket.com.br`); em desenvolvimento não há proxy de
 * subdomínio, então a mesma loja é acessada por rota (`/:lojaSlug`, ver
 * `useLojaSlug`). `import.meta.env.DEV` (Vite) decide qual das duas usar.
 */
export function getLojaPublicUrl(slug: string): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/${slug}`;
  }
  return `https://${slug}.automarket.com.br`;
}
