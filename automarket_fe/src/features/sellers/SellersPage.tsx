import { useEffect, useMemo, useState } from "react";
import { ConfirmActionModal } from "./components/ConfirmActionModal/ConfirmActionModal";
import { SellerCard } from "./components/SellerCard/SellerCard";
import { SellerFormModal } from "./components/SellerFormModal/SellerFormModal";
import { SellerToolbar, type SellerFiltro } from "./components/SellerToolbar/SellerToolbar";
import { ApiError } from "../../service/http/api-cliente";
import { vendedoresService } from "../../service/Vendedores.service";
import type { Vendedor } from "../../types/seller";
import styles from "./SellersPage.module.css";

interface ConfirmState {
  vendedor: Vendedor;
  action: "delete" | "deactivate" | "reactivate";
}

const CONFIRM_CONTENT: Record<
  ConfirmState["action"],
  { title: string; message: (nome: string) => string; confirmLabel: string; danger?: boolean }
> = {
  delete: {
    title: "Excluir vendedor",
    message: (nome) => `Excluir ${nome}? Essa ação não pode ser desfeita.`,
    confirmLabel: "Excluir",
    danger: true,
  },
  deactivate: {
    title: "Desativar vendedor",
    message: (nome) =>
      `Desativar ${nome}? Ele deixa de aparecer como opção ao marcar veículos como vendidos.`,
    confirmLabel: "Desativar",
  },
  reactivate: {
    title: "Reativar vendedor",
    message: (nome) => `Reativar ${nome}?`,
    confirmLabel: "Reativar",
  },
};

function ordenarPorNome(vendedores: Vendedor[]): Vendedor[] {
  return [...vendedores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export default function SellersPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<SellerFiltro>("todos");

  const [formModal, setFormModal] = useState<{ open: boolean; vendedor: Vendedor | null }>({
    open: false,
    vendedor: null,
  });
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);

    vendedoresService
      .findAll(filtro === "todos" ? undefined : { ativo: filtro === "ativos" })
      .then((data) => {
        if (!cancelado) setVendedores(data);
      })
      .catch(() => {
        if (!cancelado) setError("Não foi possível carregar os vendedores.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [filtro]);

  const vendedoresFiltrados = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return vendedores;
    return vendedores.filter((v) => v.nome.toLowerCase().includes(termo));
  }, [vendedores, search]);

  function handleSaved(vendedorSalvo: Vendedor) {
    setVendedores((atual) => {
      const existente = atual.find((v) => v.id === vendedorSalvo.id);
      const proximo = existente
        ? atual.map((v) =>
            v.id === vendedorSalvo.id ? { ...vendedorSalvo, _count: v._count } : v,
          )
        : [...atual, vendedorSalvo];
      return ordenarPorNome(proximo);
    });
    setFormModal({ open: false, vendedor: null });
  }

  function handleToggleAtivo(vendedor: Vendedor) {
    setConfirmError(null);
    setConfirmState({ vendedor, action: vendedor.ativo ? "deactivate" : "reactivate" });
  }

  function handleDelete(vendedor: Vendedor) {
    setConfirmError(null);
    setConfirmState({ vendedor, action: "delete" });
  }

  async function handleConfirmAction() {
    if (!confirmState) return;
    const { vendedor, action } = confirmState;

    setConfirmSubmitting(true);
    setConfirmError(null);
    try {
      if (action === "delete") {
        await vendedoresService.delete(vendedor.id);
        setVendedores((atual) => atual.filter((v) => v.id !== vendedor.id));
      } else {
        const atualizado =
          action === "deactivate"
            ? await vendedoresService.deactivate(vendedor.id)
            : await vendedoresService.reactivate(vendedor.id);
        setVendedores((atual) =>
          atual.map((v) => (v.id === atualizado.id ? { ...atualizado, _count: v._count } : v)),
        );
      }
      setConfirmState(null);
    } catch (error) {
      setConfirmError(
        error instanceof ApiError ? error.message : "Não foi possível concluir a ação.",
      );
    } finally {
      setConfirmSubmitting(false);
    }
  }

  const confirmContent = confirmState ? CONFIRM_CONTENT[confirmState.action] : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Vendedores</h2>
          <p className={styles.subtitle}>Gerencie o time de vendas da loja</p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setFormModal({ open: true, vendedor: null })}
        >
          <span className="material-symbols-outlined">add</span>
          Adicionar Vendedor
        </button>
      </header>

      <SellerToolbar
        search={search}
        onSearchChange={setSearch}
        filtro={filtro}
        onFiltroChange={setFiltro}
      />

      {loading && <p className={styles.stateMessage}>Carregando vendedores...</p>}
      {!loading && error && <p className={styles.stateMessageError}>{error}</p>}
      {!loading && !error && vendedoresFiltrados.length === 0 && (
        <p className={styles.stateMessage}>
          {vendedores.length === 0
            ? "Nenhum vendedor cadastrado ainda."
            : "Nenhum vendedor encontrado."}
        </p>
      )}

      {!loading && !error && vendedoresFiltrados.length > 0 && (
        <div className={styles.grid}>
          {vendedoresFiltrados.map((vendedor) => (
            <SellerCard
              key={vendedor.id}
              vendedor={vendedor}
              onEdit={(v) => setFormModal({ open: true, vendedor: v })}
              onToggleAtivo={handleToggleAtivo}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SellerFormModal
        isOpen={formModal.open}
        vendedor={formModal.vendedor}
        onClose={() => setFormModal({ open: false, vendedor: null })}
        onSaved={handleSaved}
      />

      {confirmContent && confirmState && (
        <ConfirmActionModal
          isOpen
          title={confirmContent.title}
          message={confirmContent.message(confirmState.vendedor.nome)}
          confirmLabel={confirmContent.confirmLabel}
          variant={confirmContent.danger ? "danger" : undefined}
          submitting={confirmSubmitting}
          error={confirmError}
          onConfirm={handleConfirmAction}
          onClose={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
