import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { VeiculoFiltrosDetalhados } from "../../../types/vehicle";
import { veiculosService, type Veiculo } from "../../../service/Veiculos.service";
import { SellVehicleModal } from "../components/SellVehicleModal/SellVehicleModal";
import { VehicleTable } from "../components/VehicleTable/VehicleTable";
import { VehicleToolbar } from "../components/VehicleToolbar/VehicleToolbar";
import {
  VehicleStatusTabs,
  type StatusFiltroVeiculo,
} from "../components/VehicleStatusTabs/VehicleStatusTabs";
import styles from "./VehiclesPage.module.css";

export default function VehiclesPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltroVeiculo>("DISPONIVEL");
  const [filtrosDetalhados, setFiltrosDetalhados] = useState<VeiculoFiltrosDetalhados>({});
  const [page, setPage] = useState(1);
  const [veiculoParaVender, setVeiculoParaVender] = useState<Veiculo | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  function carregarVeiculos() {
    setLoading(true);
    setError(null);
    veiculosService
      .findAll()
      .then(setVeiculos)
      .catch(() => setError("Não foi possível carregar os veículos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    carregarVeiculos();
  }, []);

  // Ao voltar do cadastro/edição (`AddVehiclePage`), o POST/PATCH já
  // persistiu de verdade — só precisamos recarregar a lista, não
  // reconstruir nada localmente.
  useEffect(() => {
    if (!(location.state as { novoVeiculo?: unknown } | null)?.novoVeiculo)
      return;
    carregarVeiculos();
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  async function handleDelete(veiculo: Veiculo) {
    const confirmado = window.confirm(
      `Excluir ${veiculo.marca} ${veiculo.modelo}? Ele sai do estoque e do catálogo agora, e é apagado definitivamente em 30 dias.`,
    );
    if (!confirmado) return;

    try {
      await veiculosService.delete(veiculo.id);
      setVeiculos((atual) => atual.filter((v) => v.id !== veiculo.id));
    } catch {
      window.alert("Não foi possível excluir o veículo.");
    }
  }

  function handleEdit(veiculo: Veiculo) {
    navigate(`/veiculos/${veiculo.id}/editar`);
  }

  async function handleReserve(veiculo: Veiculo) {
    try {
      const veiculoAtualizado = await veiculosService.reserve(veiculo.id);
      setVeiculos((atual) =>
        atual.map((v) => (v.id === veiculoAtualizado.id ? veiculoAtualizado : v)),
      );
    } catch {
      window.alert("Não foi possível reservar o veículo.");
    }
  }

  async function handleMakeAvailable(veiculo: Veiculo) {
    const confirmado = window.confirm(
      `Colocar ${veiculo.marca} ${veiculo.modelo} disponível novamente? Ele volta a aparecer no catálogo público.`,
    );
    if (!confirmado) return;

    try {
      const veiculoAtualizado = await veiculosService.makeAvailable(veiculo.id);
      setVeiculos((atual) =>
        atual.map((v) => (v.id === veiculoAtualizado.id ? veiculoAtualizado : v)),
      );
    } catch {
      window.alert("Não foi possível colocar o veículo disponível novamente.");
    }
  }

  async function handleConfirmSell(vendedorId: number) {
    if (!veiculoParaVender) return;

    try {
      const veiculoAtualizado = await veiculosService.markWithSell(
        veiculoParaVender.id,
        vendedorId,
      );
      setVeiculos((atual) =>
        atual.map((v) => (v.id === veiculoAtualizado.id ? veiculoAtualizado : v)),
      );
      setVeiculoParaVender(null);
    } catch {
      window.alert("Não foi possível marcar o veículo como vendido.");
    }
  }

  // Busca + filtros detalhados, sem o filtro de status — usado tanto pra
  // montar a lista de cada aba quanto pra contar quantos itens cada aba
  // teria (ver `contagensPorStatus`), então o número na aba já reflete a
  // busca/filtro atual, não o estoque inteiro.
  const veiculosComBuscaEFiltros = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return veiculos.filter((v) => {
      if (termo && !`${v.marca} ${v.modelo}`.toLowerCase().includes(termo))
        return false;
      if (filtrosDetalhados.tipoVeiculo && v.tipoVeiculo !== filtrosDetalhados.tipoVeiculo)
        return false;
      if (filtrosDetalhados.cambio && v.cambio !== filtrosDetalhados.cambio)
        return false;
      if (
        filtrosDetalhados.combustivel &&
        v.combustivel !== filtrosDetalhados.combustivel
      )
        return false;
      if (filtrosDetalhados.direcao && v.direcao !== filtrosDetalhados.direcao)
        return false;
      if (filtrosDetalhados.precoMin !== undefined && v.preco < filtrosDetalhados.precoMin)
        return false;
      if (filtrosDetalhados.precoMax !== undefined && v.preco > filtrosDetalhados.precoMax)
        return false;
      if (filtrosDetalhados.anoMin !== undefined && v.anoModelo < filtrosDetalhados.anoMin)
        return false;
      if (filtrosDetalhados.anoMax !== undefined && v.anoModelo > filtrosDetalhados.anoMax)
        return false;
      return true;
    });
  }, [veiculos, search, filtrosDetalhados]);

  const contagensPorStatus = useMemo(
    (): Record<StatusFiltroVeiculo, number> => ({
      DISPONIVEL: veiculosComBuscaEFiltros.filter((v) => v.status === "DISPONIVEL").length,
      RESERVADO: veiculosComBuscaEFiltros.filter((v) => v.status === "RESERVADO").length,
      VENDIDO: veiculosComBuscaEFiltros.filter((v) => v.status === "VENDIDO").length,
      TODOS: veiculosComBuscaEFiltros.length,
    }),
    [veiculosComBuscaEFiltros],
  );

  const veiculosFiltrados = useMemo(() => {
    if (statusFiltro === "TODOS") return veiculosComBuscaEFiltros;
    return veiculosComBuscaEFiltros.filter((v) => v.status === statusFiltro);
  }, [veiculosComBuscaEFiltros, statusFiltro]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleFiltrosChange(filtros: VeiculoFiltrosDetalhados) {
    setFiltrosDetalhados(filtros);
    setPage(1);
  }

  function handleStatusFiltroChange(status: StatusFiltroVeiculo) {
    setStatusFiltro(status);
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Veículos</h2>
          <p className={styles.subtitle}>Gerencie o estoque da loja</p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => navigate("/veiculos/novo")}
        >
          <span className="material-symbols-outlined">add</span>
          Adicionar Veículo
        </button>
      </header>

      <VehicleToolbar
        value={search}
        onChange={handleSearchChange}
        filtros={filtrosDetalhados}
        onFiltrosChange={handleFiltrosChange}
      />

      <VehicleStatusTabs
        value={statusFiltro}
        onChange={handleStatusFiltroChange}
        counts={contagensPorStatus}
      />

      <VehicleTable
        veiculos={veiculosFiltrados}
        loading={loading}
        error={error}
        page={page}
        onPageChange={setPage}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onMarkAsSold={setVeiculoParaVender}
        onReserve={handleReserve}
        onMakeAvailable={handleMakeAvailable}
      />

      <SellVehicleModal
        isOpen={veiculoParaVender !== null}
        veiculoNome={
          veiculoParaVender
            ? `${veiculoParaVender.marca} ${veiculoParaVender.modelo}`
            : ""
        }
        onClose={() => setVeiculoParaVender(null)}
        onConfirm={handleConfirmSell}
      />
    </div>
  );
}
