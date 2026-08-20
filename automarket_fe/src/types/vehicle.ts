/**
 * Tipos espelhando o model `Veiculo` e enums relacionados definidos em
 * `automarket_backend/prisma/schema.prisma`. Mantidos em sincronia manual
 * até existir geração automática de tipos a partir do schema do backend.
 */
import type { ItemVeiculo } from "./vehicleItem";

export type TipoVeiculo =
  | "HATCH"
  | "SEDAN"
  | "SUV"
  | "PICKUP"
  | "COUPE"
  | "VAN_UTILITARIO"
  | "BUGGY"
  | "CAMINHAO_LEVE"
  | "CONVERSIVEL"
  | "PERUA";

export type Cambio =
  | "AUTOMATICO"
  | "MANUAL"
  | "SEMI_AUTOMATICO"
  | "AUTOMATIZADO";

export type Direcao =
  | "HIDRAULICA"
  | "ELETRO_HIDRAULICA"
  | "MECANICA"
  | "ELETRICA";

export type Combustivel =
  | "ALCOOL"
  | "GASOLINA"
  | "FLEX"
  | "DIESEL"
  | "GNV"
  | "HIBRIDO"
  | "ELETRICO";

export type Cor =
  | "AMARELO"
  | "AZUL"
  | "BRANCO"
  | "CINZA"
  | "LARANJA"
  | "PRETO"
  | "PRATA"
  | "VERDE"
  | "VERMELHO"
  | "OUTRO";

export type StatusVeiculo = "DISPONIVEL" | "RESERVADO" | "VENDIDO";

export interface VeiculoImagem {
  id: number;
  url: string;
  ordem: number;
  capa: boolean;
}

export interface Veiculo {
  id: number;
  lojaId: number;

  marca: string;
  marcaFipeId?: number;
  modelo: string;
  modeloFipeId?: number;

  anoFabricacao: number;
  anoModelo: number;
  tipoVeiculo: TipoVeiculo;
  cambio: Cambio;
  portas: number;
  combustivel: Combustivel;
  direcao: Direcao;
  potenciaMotor: string;
  cor: Cor;
  quilometragem: number;
  descricao: string;
  preco: number;

  /** Itens de série do veículo — ver categorias em `types/vehicleItem.ts`. */
  itens: ItemVeiculo[];

  precoPromocional?: number;
  documentacaoRegularizacao?: string;
  conservacaoGarantia?: string;
  aceitaTroca: boolean;
  aceitaFinanciamento: boolean;

  status: StatusVeiculo;
  visualizacoes: number;

  createdAt: string;
  updatedAt: string;
  dataVenda?: string;
  vendedorId?: number;

  ativo: boolean;

  imagens: VeiculoImagem[];
}

/**
 * Campos aceitos por `POST /veiculos` — o que o formulário de cadastro
 * produz. Sem `lojaId`: o backend sempre deriva a loja do token, nunca do
 * body (ver `@LojaAtual()` no `VeiculosController`).
 */
export interface CreateVeiculoPayload {
  marca: string;
  marcaFipeId?: number;
  modelo: string;
  modeloFipeId?: number;
  anoFabricacao: number;
  anoModelo: number;
  tipoVeiculo: TipoVeiculo;
  cambio: Cambio;
  portas: number;
  combustivel: Combustivel;
  direcao: Direcao;
  potenciaMotor: string;
  cor: Cor;
  quilometragem: number;
  descricao: string;
  preco: number;
  precoPromocional?: number;
  documentacaoRegularizacao?: string;
  conservacaoGarantia?: string;
  aceitaTroca?: boolean;
  aceitaFinanciamento?: boolean;
  itens?: ItemVeiculo[];
  imagens?: { url: string; ordem?: number; capa?: boolean }[];
}

export type UpdateVeiculoPayload = Partial<CreateVeiculoPayload>;

/**
 * Filtros do dropdown "Filtros" da lista de veículos do painel — mais
 * detalhado que o `FiltrosVeiculoPublico` do catálogo (tem `direcao` e
 * `precoMin`, que o público não expõe). Filtragem é sempre client-side (o
 * estoque de uma loja é pequeno por design, ver CLAUDE.md), então isso só
 * descreve os campos, não um formato de query string.
 */
export interface VeiculoFiltrosDetalhados {
  tipoVeiculo?: TipoVeiculo;
  cambio?: Cambio;
  combustivel?: Combustivel;
  direcao?: Direcao;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
}
