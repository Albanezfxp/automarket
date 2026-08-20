/**
 * Tipos do catálogo público — espelham as respostas dos endpoints
 * `@Public()` novos do backend (`GET /veiculos/publico`,
 * `GET /veiculos/publico/:id`), que usam um `select` mais enxuto que o
 * `Veiculo` completo do painel admin (nunca incluem `lojaId`/`ativo`/dados
 * internos).
 */
import type {
  Cambio,
  Combustivel,
  Cor,
  Direcao,
  StatusVeiculo,
  TipoVeiculo,
  VeiculoImagem,
} from "./vehicle";
import type { ItemVeiculo } from "./vehicleItem";

export interface VeiculoPublico {
  id: number;
  marca: string;
  modelo: string;
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
  itens: ItemVeiculo[];
  documentacaoRegularizacao?: string;
  conservacaoGarantia?: string;
  aceitaTroca: boolean;
  aceitaFinanciamento: boolean;
  status: StatusVeiculo;
  visualizacoes: number;
  createdAt: string;
  imagens: VeiculoImagem[];
}

export interface VendedorPublico {
  id: number;
  nome: string;
  fotoUrl?: string;
  whatsapp: string;
}

export interface VeiculoPublicoDetalhe extends VeiculoPublico {
  loja: {
    id: number;
    nome: string;
    slug: string;
    vendedores: VendedorPublico[];
  };
}

export interface ListaVeiculosPublicoResponse {
  data: VeiculoPublico[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface FiltrosVeiculoPublico {
  busca?: string;
  tipoVeiculo?: TipoVeiculo;
  cambio?: Cambio;
  combustivel?: Combustivel;
  precoMin?: number;
  precoMax?: number;
  anoMin?: number;
  anoMax?: number;
  page?: number;
  perPage?: number;
}
