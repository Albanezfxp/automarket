import { Link } from "react-router-dom";
import { formatCurrency, formatKilometragem } from "../../../../lib/format";
import type { Veiculo } from "../../../../service/Veiculos.service";
import { useAuth } from "../../../auth/AuthContext";
import { COMBUSTIVEL_LABELS, COR_LABELS } from "../../constants/fieldOptions";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import styles from "./VehicleTable.module.css";

const PAGE_SIZE = 8;

interface VehicleTableProps {
  veiculos: Veiculo[];
  loading: boolean;
  error: string | null;
  page: number;
  onPageChange: (page: number) => void;
  onDelete: (veiculo: Veiculo) => void;
  onEdit: (veiculo: Veiculo) => void;
  onMarkAsSold: (veiculo: Veiculo) => void;
  onReserve: (veiculo: Veiculo) => void;
  onMakeAvailable: (veiculo: Veiculo) => void;
}

/**
 * `visibility` abre o veículo no catálogo público (nova aba), pra loja ver o
 * anúncio como o cliente final vê. Usa `loja` de `useAuth()` (sessão do
 * painel) — nunca `useLojaAtual()`, que só existe dentro da árvore de rotas
 * do catálogo público (`CatalogRoot`/`useOutletContext`) e quebra em runtime
 * se chamado daqui, que é a árvore de rotas do painel admin.
 */
export function VehicleTable({
  veiculos,
  loading,
  error,
  page,
  onPageChange,
  onDelete,
  onEdit,
  onMarkAsSold,
  onReserve,
  onMakeAvailable,
}: VehicleTableProps) {
  const { loja } = useAuth();
  const totalPages = Math.max(1, Math.ceil(veiculos.length / PAGE_SIZE));
  const paginaAtual = Math.min(page, totalPages);
  const inicio = (paginaAtual - 1) * PAGE_SIZE;
  const veiculosDaPagina = veiculos.slice(inicio, inicio + PAGE_SIZE);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Veículo</th>
              <th>Marca/Modelo</th>
              <th>Ano / KM</th>
              <th>Preço</th>
              <th>Status</th>
              <th className={styles.actionsHeader}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className={styles.stateCell}>
                  Carregando veículos...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={6} className={styles.stateCellError}>
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && veiculosDaPagina.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.stateCell}>
                  Nenhum veículo encontrado.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              veiculosDaPagina.map((veiculo) => {
                const capa =
                  veiculo.imagens?.find((img) => img.capa) ??
                  veiculo.imagens?.[0];
                const vendido = veiculo.status === "VENDIDO";
                const reservado = veiculo.status === "RESERVADO";

                return (
                  <tr key={veiculo.id} className={styles.row}>
                    <td>
                      <div className={styles.thumb}>
                        {capa && (
                          <img
                            src={capa.url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.vehicleName}>
                        {veiculo.marca} {veiculo.modelo}
                      </div>
                      <div className={styles.vehicleMeta}>
                        {COR_LABELS[veiculo.cor]} •{" "}
                        {COMBUSTIVEL_LABELS[veiculo.combustivel]}
                      </div>
                    </td>
                    <td className={styles.muted}>
                      {veiculo.anoModelo}
                      <br />
                      {formatKilometragem(veiculo.quilometragem)}
                    </td>
                    <td className={styles.price}>
                      {veiculo.precoPromocional
                        ? formatCurrency(veiculo.precoPromocional)
                        : formatCurrency(veiculo.preco)}
                    </td>
                    <td>
                      <StatusBadge status={veiculo.status} />
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actions}>
                        {loja ? (
                          <Link
                            to={`/${loja.slug}/veiculo/${veiculo.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Ver no catálogo público"
                            >
                              <span className="material-symbols-outlined">
                                visibility
                              </span>
                            </button>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Ver no catálogo público"
                            disabled
                          >
                            <span className="material-symbols-outlined">
                              visibility
                            </span>
                          </button>
                        )}
                        {!vendido && (
                          <>
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Editar"
                              onClick={() => onEdit(veiculo)}
                            >
                              <span className="material-symbols-outlined">
                                edit
                              </span>
                            </button>
                            {!reservado && (
                              <button
                                type="button"
                                className={styles.actionButton}
                                title="Reservar"
                                onClick={() => onReserve(veiculo)}
                              >
                                <span className="material-symbols-outlined">
                                  bookmark_add
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.actionButton}
                              title="Marcar como vendido"
                              onClick={() => onMarkAsSold(veiculo)}
                            >
                              <span className="material-symbols-outlined">
                                paid
                              </span>
                            </button>
                          </>
                        )}
                        {(reservado || vendido) && (
                          <button
                            type="button"
                            className={styles.actionButton}
                            title="Colocar disponível novamente"
                            onClick={() => onMakeAvailable(veiculo)}
                          >
                            <span className="material-symbols-outlined">
                              restart_alt
                            </span>
                          </button>
                        )}
                        {!vendido && (
                          <button
                            type="button"
                            className={styles.actionButtonDanger}
                            onClick={() => onDelete(veiculo)}
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          {veiculos.length === 0
            ? "Nenhum veículo"
            : `Mostrando ${inicio + 1} a ${Math.min(inicio + PAGE_SIZE, veiculos.length)} de ${veiculos.length} veículos`}
        </span>
        <div className={styles.paginationControls}>
          <button
            type="button"
            className={styles.pageNav}
            onClick={() => onPageChange(paginaAtual - 1)}
            disabled={paginaAtual <= 1}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.pageButton} ${n === paginaAtual ? styles.pageButtonActive : ""}`}
              onClick={() => onPageChange(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className={styles.pageNav}
            onClick={() => onPageChange(paginaAtual + 1)}
            disabled={paginaAtual >= totalPages}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
