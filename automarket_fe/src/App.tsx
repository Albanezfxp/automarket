import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./layouts/AdminLayout/AdminLayout";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { CatalogRoot } from "./features/catalog/CatalogRoot";
import { ReadOnlyToast } from "./components/ReadOnlyToast/ReadOnlyToast";

/**
 * Cada rota é seu próprio chunk (code-splitting por página). `AdminLayout`
 * já envolve o `<Outlet />` num `<Suspense>` pras rotas autenticadas; o
 * `<Suspense>` aqui em cima cobre login/registro, que ficam fora dele.
 */
const LoginPage = lazy(() => import("./features/auth/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage"));
const DashboardPage = lazy(() => import("./features/dashboard/Dashboard"));
const VehiclesPage = lazy(
  () => import("./features/vehicles/vehiclesPage/VehiclesPage"),
);
const AddVehiclePage = lazy(
  () => import("./features/vehicles/addVehiclePage/AddVehiclePage"),
);
const SellersPage = lazy(() => import("./features/sellers/SellersPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));

// Site público (catálogo, detalhe do veículo, vendedores, localização) —
// sem ProtectedRoute, o visitante não faz login. Slug da loja como
// parâmetro de rota em dev (ver useLojaSlug); em produção o mapeamento é
// por subdomínio.
const CatalogPage = lazy(() => import("./features/catalog/CatalogPage"));
const VehicleDetailPage = lazy(
  () => import("./features/vehiclesDetails/VehicleDetailPage"),
);
const StoreSellersPage = lazy(
  () => import("./features/storeSellersPage/StoreSellersPage"),
);
const StoreLocationPage = lazy(
  () => import("./features/storeLocationPage/StoreLocationPage"),
);

export default function App() {
  return (
    <Suspense fallback={null}>
      <ReadOnlyToast />
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />

        <Route path=":lojaSlug" element={<CatalogRoot />}>
          <Route index element={<CatalogPage />} />
          <Route path="veiculo/:id" element={<VehicleDetailPage />} />
          <Route path="vendedores" element={<StoreSellersPage />} />
          <Route path="localizacao" element={<StoreLocationPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="veiculos" element={<VehiclesPage />} />
            <Route path="veiculos/novo" element={<AddVehiclePage />} />
            <Route path="veiculos/:id/editar" element={<AddVehiclePage />} />
            <Route path="vendedores" element={<SellersPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
