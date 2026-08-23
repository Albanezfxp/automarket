import { useEffect, useMemo, useRef, useState } from "react";
import { useLojaAtual } from "./CatalogRoot";
import { catalogService } from "../../service/Catalog.service";
import type {
  FiltrosVeiculoPublico,
  VeiculoPublico,
} from "../../types/catalog";
import { TIPO_VEICULO_LABELS } from "../vehicles/constants/fieldOptions";
import { VehicleCard } from "./components/VehicleCard/VehicleCard";
import { CategoryCarousel } from "./components/CategoryCarousel/CategoryCarousel";
import { FilterBar } from "./components/FilterBar/FilterBar";
import styles from "./CatalogPage.module.css";
import type { TipoVeiculo } from "../../types/vehicle";

/** Altura (px) de seções visível antes do degradê "Ver mais" entrar em ação. */
const ALTURA_SECOES_RECOLHIDA = 1400;

/**
 * Home da loja: banner liso da loja (identidade/nav já ficam no
 * `CatalogHeader`, fixo nas quatro páginas do site público), busca +
 * filtros, e seções com carrossel por categoria ("Mais vistos" usando
 * `visualizacoes` que já existe). Vendedores e localização viraram páginas
 * próprias (`StoreSellersPage`/`StoreLocationPage`), acessíveis pelo nav do
 * header — este componente cuida só do estoque.
 *
 * Estratégia de dados: busca a página inteira do estoque ativo (perPage
 * alto) uma vez e filtra no cliente — o catálogo de uma loja white-label é
 * pequeno por design (10-30 veículos, ver CLAUDE.md), então não vale a pena
 * pagar round-trips extras por filtro.
 */
export default function CatalogPage() {
  const loja = useLojaAtual();
  const [veiculos, setVeiculos] = useState<VeiculoPublico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosVeiculoPublico>({});

  useEffect(() => {
    catalogService
      .listVeiculos(loja.slug, { perPage: 100 })
      .then((res) => setVeiculos(res.data))
      .catch(() => setErro("Não foi possível carregar o estoque desta loja."));
  }, [loja.slug]);

  const filtrados = useMemo(() => {
    if (!veiculos) return [];
    const busca = filtros.busca?.trim().toLowerCase();
    return veiculos.filter((v) => {
      if (busca && !`${v.marca} ${v.modelo}`.toLowerCase().includes(busca))
        return false;
      if (filtros.tipoVeiculo && v.tipoVeiculo !== filtros.tipoVeiculo)
        return false;
      if (filtros.cambio && v.cambio !== filtros.cambio) return false;
      if (filtros.combustivel && v.combustivel !== filtros.combustivel)
        return false;
      if (filtros.precoMax && v.preco > filtros.precoMax) return false;
      if (filtros.anoMin && v.anoModelo < filtros.anoMin) return false;
      return true;
    });
  }, [veiculos, filtros]);

  const temFiltroAtivo = Object.values(filtros).some(
    (v) => v !== undefined && v !== "",
  );

  const porTipo = useMemo(() => {
    if (!veiculos)
      return [] as { tipo: TipoVeiculo; itens: VeiculoPublico[] }[];
    const grupos = new Map<TipoVeiculo, VeiculoPublico[]>();
    veiculos.forEach((v) => {
      if (!grupos.has(v.tipoVeiculo)) grupos.set(v.tipoVeiculo, []);
      grupos.get(v.tipoVeiculo)!.push(v);
    });
    return (Object.keys(TIPO_VEICULO_LABELS) as TipoVeiculo[])
      .filter((tipo) => grupos.has(tipo))
      .map((tipo) => ({ tipo, itens: grupos.get(tipo)! }));
  }, [veiculos]);

  const maisVistos = useMemo(() => {
    if (!veiculos) return [];
    return [...veiculos]
      .sort((a, b) => b.visualizacoes - a.visualizacoes)
      .slice(0, 12);
  }, [veiculos]);

  // "Ver mais" da página: as seções por categoria só ficam totalmente
  // visíveis depois do clique — antes disso o bloco fica recolhido em
  // `ALTURA_SECOES_RECOLHIDA` com um degradê por cima. `sobraConteudo` só
  // fica true quando o conteúdo real excede essa altura (ResizeObserver no
  // conteúdo sem recorte), pra não mostrar o botão quando a loja tem poucas
  // categorias e tudo já coube.
  const sectionsRef = useRef<HTMLDivElement>(null);
  const [secoesExpandidas, setSecoesExpandidas] = useState(false);
  const [sobraConteudo, setSobraConteudo] = useState(false);

  useEffect(() => {
    const el = sectionsRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSobraConteudo(entry.target.scrollHeight > ALTURA_SECOES_RECOLHIDA);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [veiculos]);

  return (
    <div className={styles.page}>
      <section
        className={`${styles.hero} ${!loja.banner ? styles.heroFallback : ""}`}
        style={
          loja.banner ? { backgroundImage: `url(${loja.banner})` } : undefined
        }
        aria-hidden="true"
      />

      <div className={styles.body}>
        <h1 className={styles.srOnly}>Catálogo de veículos — {loja.nome}</h1>

        <div className={styles.filterWrap}>
          <FilterBar filtros={filtros} onChange={setFiltros} />
        </div>

        {erro && <p>{erro}</p>}

        {!veiculos && !erro && <p>Carregando estoque...</p>}

        {veiculos && veiculos.length === 0 && (
          <div className={styles.emptyState}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 40 }}
            >
              directions_car
            </span>
            <p>Esta loja ainda não cadastrou veículos.</p>
          </div>
        )}

        {temFiltroAtivo && veiculos && veiculos.length > 0 && (
          <section>
            <h2
              style={{
                font: "var(--catalog-text-headline-md)",
                marginBottom: 16,
              }}
            >
              {filtrados.length} veículo{filtrados.length === 1 ? "" : "s"}{" "}
              encontrado{filtrados.length === 1 ? "" : "s"}
            </h2>
            {filtrados.length === 0 ? (
              <div className={styles.emptyState}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 40 }}
                >
                  search_off
                </span>
                <p>Nenhum veículo encontrado com esses filtros.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filtrados.map((v) => (
                  <VehicleCard key={v.id} veiculo={v} lojaSlug={loja.slug} />
                ))}
              </div>
            )}
          </section>
        )}

        {!temFiltroAtivo && (
          <div
            className={`${styles.sectionsWrap} ${
              secoesExpandidas ? styles.sectionsWrapExpanded : ""
            }`}
          >
            <div className={styles.sectionsInner} ref={sectionsRef}>
              {maisVistos.length > 0 && (
                <CategoryCarousel title="Mais vistos">
                  {maisVistos.map((v) => (
                    <VehicleCard key={v.id} veiculo={v} lojaSlug={loja.slug} />
                  ))}
                </CategoryCarousel>
              )}

              {porTipo.map(({ tipo, itens }) => (
                <CategoryCarousel key={tipo} title={TIPO_VEICULO_LABELS[tipo]}>
                  {itens.map((v) => (
                    <VehicleCard key={v.id} veiculo={v} lojaSlug={loja.slug} />
                  ))}
                </CategoryCarousel>
              ))}
            </div>

            {!secoesExpandidas && sobraConteudo && (
              <div className={styles.sectionsFade}>
                <button
                  type="button"
                  className={styles.sectionsMoreButton}
                  onClick={() => setSecoesExpandidas(true)}
                  aria-label="Ver mais categorias de veículos"
                >
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
                <span className={styles.sectionsMoreLabel}>Ver mais</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
