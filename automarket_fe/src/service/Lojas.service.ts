import type { Loja } from "../types/store";
import { apiClient } from "./http/api-cliente";

export interface RegisterLojaPayload {
  nome: string;
  slug?: string;
  email: string;
  telefone?: string;
  password: string;
  confirm_password: string;
  managerPassword: string;
  confirmManagerPassword: string;
  endereco: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade: string;
    estado: string;
  };
}

export interface UpdateLojaPayload {
  nome?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  horarioAbertura?: string;
  horarioFechamento?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  logo?: string;
  banner?: string;
  corPrimaria?: string;
  corSecundaria?: string;
  managerPassword?: string;
  confirmManagerPassword?: string;
  endereco?: {
    cep?: string;
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
}

export const lojasService = {
  register: (payload: RegisterLojaPayload) =>
    apiClient.post<Loja>("/lojas", payload),

  update: (id: number, payload: UpdateLojaPayload) =>
    apiClient.patch<Loja>(`/lojas/${id}`, payload),

  getPublico: (slug: string) =>
    apiClient.get<Loja>(`/lojas/publico/${slug}`),
};
