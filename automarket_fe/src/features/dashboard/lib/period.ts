/**
 * Modelo de período do Dashboard: o fim é sempre "hoje" (não editável) — só
 * a data de início é escolhível, limitada a `MAX_DIAS_PERIODO` dias atrás.
 * Espelha a mesma regra do backend (`DashboardService.resolverDataInicio`).
 */
export const MAX_DIAS_PERIODO = 90;

export interface Periodo {
  /** ISO `YYYY-MM-DD`, pronta pra ir direto na query string. */
  dataInicio: string;
  label: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function periodoUltimosDias(dias: number, label: string): Periodo {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return { dataInicio: toIsoDate(data), label };
}

export function ultimos30Dias(): Periodo {
  return periodoUltimosDias(30, "Últimos 30 dias");
}

/** `true` se `dataInicio` está dentro da janela permitida (não é futuro, nem mais que 90 dias atrás). */
export function dataInicioValida(dataInicio: string): boolean {
  const data = new Date(`${dataInicio}T00:00:00`);
  if (Number.isNaN(data.getTime())) return false;

  const hoje = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() - MAX_DIAS_PERIODO);

  return data <= hoje && data >= limite;
}
