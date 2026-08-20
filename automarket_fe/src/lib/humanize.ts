/**
 * Converte um valor de enum `SNAKE_CASE` do backend (ex: `AR_CONDICIONADO`,
 * `TRACAO_4X4`) num label pt-BR legível, sem precisar de um dicionário
 * manual para cada um dos 100+ valores de `ItemVeiculo`. Não é tradução —
 * é formatação; strings com sigla/número (GPS, USB, 4X4) ficam em maiúsculo,
 * o resto vira "Palavra capitalizada".
 */
const ACRONYMS = new Set(['gps', 'usb', 'wifi', 'gnv', 'ota']);

function humanizeToken(token: string): string {
  const lower = token.toLowerCase();
  if (ACRONYMS.has(lower) || /^\d/.test(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function humanizeEnumValue(value: string): string {
  return value.split('_').map(humanizeToken).join(' ');
}
