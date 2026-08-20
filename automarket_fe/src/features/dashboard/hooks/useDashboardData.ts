import { useEffect, useState } from "react";
import { ApiError } from "../../../service/http/api-cliente";
import { dashboardService } from "../../../service/Dashboard.service";
import type { DashboardMetricas } from "../../../types/dashboard";

interface UseDashboardDataResult {
  metricas: DashboardMetricas | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fonte única de dados da página de Dashboard — busca `/dashboard/metricas`
 * no backend. `Dashboard.tsx` e os componentes de métrica não sabem (nem
 * precisam saber) como o dado é calculado, só como exibi-lo.
 */
export function useDashboardData(dataInicio: string): UseDashboardDataResult {
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setError(null);

    dashboardService
      .getMetricas(dataInicio)
      .then((data) => {
        if (!cancelado) setMetricas(data);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar o dashboard.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [dataInicio]);

  return { metricas, isLoading, error };
}
