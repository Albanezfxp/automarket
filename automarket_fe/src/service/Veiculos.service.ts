import type {
  CreateVeiculoPayload,
  StatusVeiculo,
  UpdateVeiculoPayload,
  Veiculo,
  VeiculoImagem,
} from "../types/vehicle";
import { apiClient } from "./http/api-cliente";

export type { CreateVeiculoPayload, UpdateVeiculoPayload, Veiculo, VeiculoImagem };

export const veiculosService = {
  findAll: (params?: { lojaId?: number; status?: StatusVeiculo }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return apiClient.get<Veiculo[]>(`/veiculos${query ? `?${query}` : ""}`);
  },

  findById: (id: number) => apiClient.get<Veiculo>(`/veiculos/${id}`),

  create: (payload: CreateVeiculoPayload) =>
    apiClient.post<Veiculo>("/veiculos", payload),

  update: (id: number, payload: UpdateVeiculoPayload) =>
    apiClient.patch<Veiculo>(`/veiculos/${id}`, payload),

  markWithSell: (id: number, vendedorId: number) =>
    apiClient.patch<Veiculo>(`/veiculos/${id}/vender`, { vendedorId }),

  reserve: (id: number) =>
    apiClient.patch<Veiculo>(`/veiculos/${id}/reservar`),

  // Desfaz reserva ou venda: volta o veículo a "Disponível" no estoque/catálogo.
  makeAvailable: (id: number) =>
    apiClient.patch<Veiculo>(`/veiculos/${id}/disponibilizar`),

  // Soft delete: some do estoque/catálogo na hora, mas só é apagado de
  // verdade pelo backend 30 dias depois — `reactivate` desfaz dentro desse prazo.
  delete: (id: number) =>
    apiClient.delete<{ message: string }>(`/veiculos/${id}`),

  reactivate: (id: number) =>
    apiClient.patch<Veiculo>(`/veiculos/${id}/reativar`),
};
