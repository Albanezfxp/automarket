import type { Loja } from "../types/store";
import type {
  FiltrosVeiculoPublico,
  ListaVeiculosPublicoResponse,
  VeiculoPublicoDetalhe,
} from "../types/catalog";
import { apiClient } from "./http/api-cliente";

/**
 * Service do catálogo público — chama os endpoints `@Public()` novos do
 * backend. Reaproveita o mesmo `apiClient` do painel: ele sempre tenta
 * anexar `Authorization` se existir uma sessão salva, mas isso é inofensivo
 * aqui porque o backend simplesmente ignora o header em rotas públicas.
 */
export const catalogService = {
  getLojaPublica: (slug: string) =>
    apiClient.get<Loja>(`/lojas/publico/${slug}`),

  listVeiculos: (slug: string, filtros: FiltrosVeiculoPublico = {}) => {
    const params = new URLSearchParams({ slug });
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return apiClient.get<ListaVeiculosPublicoResponse>(
      `/veiculos/publico?${params.toString()}`,
    );
  },

  getVeiculo: (id: number) =>
    apiClient.get<VeiculoPublicoDetalhe>(`/veiculos/publico/${id}`),

  registrarContato: (veiculoId: number, vendedorId: number) =>
    apiClient.post(`/contato-whatsapp/publico`, { veiculoId, vendedorId }),
};
