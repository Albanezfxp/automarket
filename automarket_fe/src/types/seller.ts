/**
 * Espelha o model `Vendedor` de `automarket_backend/prisma/schema.prisma`.
 */
export interface Vendedor {
  id: number;
  lojaId: number;
  nome: string;
  fotoUrl?: string;
  whatsapp: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { contatos: number };
}

export interface CreateVendedorPayload {
  nome: string;
  whatsapp: string;
  fotoUrl?: string;
}

export type UpdateVendedorPayload = Partial<CreateVendedorPayload> & {
  ativo?: boolean;
};
