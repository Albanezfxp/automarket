import type {
  Cambio,
  Combustivel,
  Cor,
  Direcao,
  TipoVeiculo,
} from "../../../types/vehicle";

/**
 * Labels pt-BR para os enums do formulário de veículo. Escritos à mão (em
 * vez de `humanizeEnumValue`) porque são poucos valores e merecem
 * acentuação/gramática corretas — diferente do checklist de itens
 * (`ITEM_VEICULO_CATEGORIAS`), que tem 100+ valores e usa formatação
 * automática.
 */
export const TIPO_VEICULO_LABELS: Record<TipoVeiculo, string> = {
  HATCH: "Hatch",
  SEDAN: "Sedã",
  SUV: "SUV",
  PICKUP: "Picape",
  BUGGY: "Buggy",
  CAMINHAO_LEVE: "Caminhão Leve",
  CONVERSIVEL: "Conversível",
  COUPE: "Coupé",
  PERUA: "Perua",
  VAN_UTILITARIO: "Van/Utilitário",
};

export const CAMBIO_LABELS: Record<Cambio, string> = {
  AUTOMATICO: "Automático",
  MANUAL: "Manual",
  SEMI_AUTOMATICO: "Semi-automático",
  AUTOMATIZADO: "Automatizado",
};

export const DIRECAO_LABELS: Record<Direcao, string> = {
  HIDRAULICA: "Hidráulica",
  ELETRO_HIDRAULICA: "Eletro-hidráulica",
  MECANICA: "Mecânica",
  ELETRICA: "Elétrica",
};

export const COMBUSTIVEL_LABELS: Record<Combustivel, string> = {
  ALCOOL: "Álcool",
  GASOLINA: "Gasolina",
  FLEX: "Flex",
  DIESEL: "Diesel",
  GNV: "GNV",
  HIBRIDO: "Híbrido",
  ELETRICO: "Elétrico",
};

export const COR_LABELS: Record<Cor, string> = {
  AMARELO: "Amarelo",
  AZUL: "Azul",
  BRANCO: "Branco",
  CINZA: "Cinza",
  LARANJA: "Laranja",
  PRETO: "Preto",
  PRATA: "Prata",
  VERDE: "Verde",
  VERMELHO: "Vermelho",
  OUTRO: "Outro",
};

/** Faixas de potência mais comuns do mercado brasileiro — cobre a maioria dos anúncios sem virar texto livre. */
export const POTENCIA_MOTOR_OPTIONS = [
  "1.0",
  "1.0 Turbo",
  "1.3",
  "1.3 Turbo",
  "1.4",
  "1.5",
  "1.6",
  "1.8",
  "2.0",
  "2.0 Turbo",
  "2.4",
  "3.0",
  "3.0 Turbo",
  "Elétrico",
];

export const DOCUMENTACAO_OPTIONS = [
  "IPVA e licenciamento em dia",
  "Financiado - alienação",
  "Consórcio contemplado",
  "Documentação com pendências",
  "Aguardando transferência",
];

export const CONSERVACAO_GARANTIA_OPTIONS = [
  "Garantia de fábrica",
  "Garantia estendida",
  "Garantia de loja (3 meses)",
  "Único dono",
  "Sem garantia",
];

/**
 * A FIPE devolve o combustível como string livre em pt-BR (`"Gasolina"`,
 * `"Flex"`...) — mapeia pro enum `Combustivel` do schema. Combinações não
 * mapeadas (raras, tipo "Gás natural veicular") simplesmente não preenchem
 * o campo automaticamente, o usuário escolhe à mão.
 */
export const FIPE_COMBUSTIVEL_PARA_ENUM: Record<string, Combustivel> = {
  Álcool: "ALCOOL",
  Gasolina: "GASOLINA",
  Flex: "FLEX",
  Diesel: "DIESEL",
  Elétrico: "ELETRICO",
  Híbrido: "HIBRIDO",
};
