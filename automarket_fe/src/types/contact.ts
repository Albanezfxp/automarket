/**
 * Espelha o model `ContatoWhatsapp` — log de evento imutável (só create/delete,
 * nunca update). É a partir dele que várias métricas do dashboard são calculadas.
 */
export interface ContatoWhatsapp {
  id: number;
  veiculoId: number;
  vendedorId: number;
  createdAt: string;
}
