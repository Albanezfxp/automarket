import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLojaAtual } from "../catalog/CatalogRoot";
import { catalogService } from "../../service/Catalog.service";
import { ApiError } from "../../service/http/api-cliente";
import type { VeiculoPublicoDetalhe } from "../../types/catalog";
import {
  CAMBIO_LABELS,
  COMBUSTIVEL_LABELS,
  COR_LABELS,
  DIRECAO_LABELS,
  TIPO_VEICULO_LABELS,
} from "../vehicles/constants/fieldOptions";
import { ITEM_VEICULO_CATEGORIAS } from "../../types/vehicleItem";
import { humanizeEnumValue } from "../../lib/humanize";
import { formatCurrency, formatKilometragem } from "../../lib/format";
import { Gallery } from "./components/Gallery/Gallery";
import { ContactModal } from "./components/ContactModal/ContactModal";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./VehicleDetailPage.module.css";

/**
 * Ficha completa do veículo — CTA abre o modal de escolha de vendedor.
 *
 * Decisão de produto (veículo VENDIDO): a página continua acessível por
 * link direto (o backend não dá 404 pra VENDIDO, só pra inativo/inexistente
 * — ver VeiculosService.findOnePublico), mas esconde o CTA de contato e
 * mostra um aviso claro "Este veículo já foi vendido", em vez de simular
 * disponibilidade pro visitante.
 */
export default function VehicleDetailPage() {
  const loja = useLojaAtual();
  const { id } = useParams<{ id: string }>();
  const [veiculo, setVeiculo] = useState<VeiculoPublicoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  usePageTitle(
    veiculo ? `${veiculo.marca} ${veiculo.modelo} · ${loja.nome}` : loja.nome,
  );

  useEffect(() => {
    if (!id) return;
    setVeiculo(null);
    setErro(null);
    catalogService
      .getVeiculo(+id)
      .then(setVeiculo)
      .catch((err) => {
        setErro(
          err instanceof ApiError && err.status === 404
            ? "Veículo não encontrado."
            : "Não foi possível carregar este veículo.",
        );
      });
  }, [id]);

  if (erro) {
    return (
      <div className={styles.page}>
        <p>{erro}</p>
        <Link to={`/${loja.slug}`} className={styles.backLink}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className={styles.page}>
        <p>Carregando...</p>
      </div>
    );
  }

  const temPromocao =
    veiculo.precoPromocional !== undefined &&
    veiculo.precoPromocional !== null &&
    veiculo.precoPromocional < veiculo.preco;

  const vendido = veiculo.status === "VENDIDO";

  const categoriasComItens = ITEM_VEICULO_CATEGORIAS.map((categoria) => ({
    ...categoria,
    itens: categoria.itens.filter((item) => veiculo.itens.includes(item)),
  })).filter((categoria) => categoria.itens.length > 0);

  const selos = [
    veiculo.aceitaTroca && { icon: "sync_alt", label: "Aceita troca" },
    veiculo.aceitaFinanciamento && {
      icon: "account_balance",
      label: "Aceita financiamento",
    },
    veiculo.documentacaoRegularizacao && {
      icon: "description",
      label: veiculo.documentacaoRegularizacao,
    },
    veiculo.conservacaoGarantia && {
      icon: "verified",
      label: veiculo.conservacaoGarantia,
    },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to={`/${loja.slug}`} className={styles.backLink}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_back
          </span>
          {loja.nome}
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>
          {veiculo.marca} {veiculo.modelo}
        </span>
      </div>

      <div className={styles.layout}>
        <div>
          <Gallery
            imagens={veiculo.imagens}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
          />

          <div className={styles.section} style={{ marginTop: 32 }}>
            <h2 className={styles.sectionTitle}>Descrição</h2>
            <p className={styles.description}>{veiculo.descricao}</p>
          </div>
        </div>

        <aside className={styles.infoCard}>
          <span className={styles.tipo}>
            {TIPO_VEICULO_LABELS[veiculo.tipoVeiculo]}
          </span>
          <h1 className={styles.titulo}>
            {veiculo.marca} {veiculo.modelo}
          </h1>

          <div className={styles.badges}>
            {veiculo.status === "RESERVADO" && (
              <span className={styles.badgeReservado}>Reservado</span>
            )}
            {vendido && <span className={styles.badgeVendido}>Vendido</span>}
          </div>

          <div className={styles.priceRow}>
            {temPromocao && (
              <span className={styles.priceOriginal}>
                {formatCurrency(veiculo.preco)}
              </span>
            )}
            <span className={styles.price}>
              {formatCurrency(
                temPromocao ? veiculo.precoPromocional! : veiculo.preco,
              )}
            </span>
          </div>

          <div className={styles.specGrid}>
            <Spec
              label="Ano"
              value={`${veiculo.anoFabricacao}/${veiculo.anoModelo}`}
            />
            <Spec
              label="Km"
              value={formatKilometragem(veiculo.quilometragem)}
            />
            <Spec label="Câmbio" value={CAMBIO_LABELS[veiculo.cambio]} />
            <Spec
              label="Combustível"
              value={COMBUSTIVEL_LABELS[veiculo.combustivel]}
            />
            <Spec label="Direção" value={DIRECAO_LABELS[veiculo.direcao]} />
            <Spec label="Cor" value={COR_LABELS[veiculo.cor]} />
            <Spec label="Portas" value={String(veiculo.portas)} />
            <Spec label="Motor" value={veiculo.potenciaMotor} />
          </div>

          {selos.length > 0 && (
            <div className={styles.seals}>
              {selos.map((selo) => (
                <span key={selo.label} className={styles.seal}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16 }}
                  >
                    {selo.icon}
                  </span>
                  {selo.label}
                </span>
              ))}
            </div>
          )}

          {vendido ? (
            <div className={styles.soldNotice}>
              Este veículo já foi vendido.
            </div>
          ) : (
            <button
              type="button"
              className={styles.ctaButton}
              onClick={() => setModalAberto(true)}
            >
              <span className="material-symbols-outlined">chat</span>
              Falar com vendedor
            </button>
          )}
        </aside>
      </div>

      {categoriasComItens.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Itens de série</h2>
          {categoriasComItens.map((categoria) => (
            <div key={categoria.label} className={styles.categoryBlock}>
              <h3 className={styles.categoryTitle}>{categoria.label}</h3>
              <div className={styles.itemsGrid}>
                {categoria.itens.map((item) => (
                  <span key={item} className={styles.itemRow}>
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                    {humanizeEnumValue(item)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ContactModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        veiculoId={veiculo.id}
        vendedores={veiculo.loja.vendedores}
      />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.specItem}>
      <span className={styles.specLabel}>{label}</span>
      <span className={styles.specValue}>{value}</span>
    </div>
  );
}
