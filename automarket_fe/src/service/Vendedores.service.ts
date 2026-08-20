import type {
  CreateVendedorPayload,
  UpdateVendedorPayload,
  Vendedor,
} from "../types/seller";
import { apiClient } from "./http/api-cliente";

export const vendedoresService = {
  findAll: (params?: { ativo?: boolean }) => {
    const query = params?.ativo !== undefined ? `?ativo=${params.ativo}` : "";
    return apiClient.get<Vendedor[]>(`/vendedor${query}`);
  },
  findById: (id: number) => apiClient.get<Vendedor>(`/vendedor/${id}`),
  create: (payload: CreateVendedorPayload) =>
    apiClient.post<Vendedor>("/vendedor", payload),
  update: (id: number, payload: UpdateVendedorPayload) =>
    apiClient.patch<Vendedor>(`/vendedor/${id}`, payload),
  deactivate: (id: number) =>
    apiClient.patch<Vendedor>(`/vendedor/desativar-vendedor/${id}`),
  reactivate: (id: number) =>
    apiClient.patch<Vendedor>(`/vendedor/reativar-vendedor/${id}`),
  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/vendedor/${id}`),
};
