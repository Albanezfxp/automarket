/**
 * Espelha os models `Loja` e `Endereco`. `passwordHash` nunca é exposto pela
 * API (select explícito no backend) — por isso nem existe neste tipo de front.
 */
import type { VendedorPublico } from "./catalog";

export interface Endereco {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  estado: string;
}

export interface Loja {
  id: number;
  nome: string;
  slug: string;
  logo?: string;
  banner?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  horarioAbertura?: string;
  horarioFechamento?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  ativo: boolean;
  endereco?: Endereco;
  /** Só vem preenchido em `GET /lojas/publico/:slug` (vendedores ativos, pro header/seção do catálogo). */
  vendedores?: VendedorPublico[];
}
