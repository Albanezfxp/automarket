import { apiClient } from "./http/api-cliente";

export const apiFipeService = {
  getMarcas: () => {
    return apiClient.get<any[]>(`/api-fipe/marcas`);
  },
  getModelosDaMarca: (marcaId: string) => {
    return apiClient.get(`/api-fipe/marcas/${marcaId}/modelos`);
  },

  getYearOfOneModel: (marcaId: string, modeloId: string) => {
    return apiClient.get(
      `/api-fipe/marcas/${marcaId}/modelos/${modeloId}/anos`,
    );
  },

  getDetalheAno: (marcaId: string, modeloId: string, anoId: string) => {
    return apiClient.get(
      `/api-fipe/marcas/${marcaId}/modelos/${modeloId}/anos/${anoId}`,
    );
  },
};
