/**
 * Formatadores compartilhados (pt-BR). Vivem fora de `features/` porque
 * qualquer tela do painel (Dashboard, Veículos, Vendedores) vai precisar
 * formatar moeda/número da mesma forma.
 */
import type { Endereco } from "../types/store";

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatKilometragem(value: number): string {
  return `${numberFormatter.format(value)} km`;
}

/** `+4.2%` / `-1.8%` / `0%`, já com o sinal — pronto pra exibir ao lado de uma métrica. */
export function formatSignedPercentage(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

/**
 * `Vendedor.whatsapp` é salvo cru em E.164 sem "+" (DDI+DDD+número, ex:
 * `5583999998888`) — nunca exibir esse valor direto pro usuário.
 * `5583999998888` -> `+55 (83) 99999-8888`. Formatos fora do padrão
 * DDI(2)+DDD(2)+número(8 ou 9) caem no fallback `+<dígitos>`.
 */
export function formatWhatsapp(whatsapp: string): string {
  const digitos = whatsapp.replace(/\D/g, '');

  if (digitos.length === 12 || digitos.length === 13) {
    const ddi = digitos.slice(0, 2);
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);
    const numeroFormatado =
      numero.length === 9
        ? `${numero.slice(0, 5)}-${numero.slice(5)}`
        : `${numero.slice(0, 4)}-${numero.slice(4)}`;
    return `+${ddi} (${ddd}) ${numeroFormatado}`;
  }

  return `+${digitos}`;
}

/** `Rua X, 123 · Bairro · Cidade - UF · CEP`, pulando os campos opcionais que a loja não preencheu. */
export function formatEndereco(endereco: Endereco): string {
  const linha1 = endereco.rua
    ? `${endereco.rua}${endereco.numero ? `, ${endereco.numero}` : ""}`
    : undefined;
  return [linha1, endereco.bairro, `${endereco.cidade} - ${endereco.estado}`, endereco.cep]
    .filter(Boolean)
    .join(" · ");
}
