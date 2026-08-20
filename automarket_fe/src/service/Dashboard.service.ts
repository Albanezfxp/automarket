import type { DashboardMetricas, FaturamentoMetrica } from "../types/dashboard";
import { apiClient } from "./http/api-cliente";

export const dashboardService = {
  getMetricas: (dataInicio: string) =>
    apiClient.get<DashboardMetricas>(
      `/dashboard/metricas?dataInicio=${dataInicio}`,
    ),

  revelarFaturamento: (senha: string, dataInicio: string) =>
    apiClient.post<FaturamentoMetrica>("/dashboard/faturamento/revelar", {
      senha,
      dataInicio,
    }),
};
