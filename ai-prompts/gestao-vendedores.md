# Prompt: página de gestão de Vendedores (CRUD completo, conectada à API real)

> Este arquivo é autocontido — pode ser dado a uma IA em uma sessão nova, sem
> nenhum contexto de conversa anterior, e ela deve conseguir implementar a
> feature inteira só com o que está descrito aqui. Sempre releia os arquivos
> reais antes de editar; os trechos abaixo mostram o estado no momento em que
> este prompt foi escrito e podem ter mudado. Implemente na ordem dos passos,
> rodando `npx tsc --noEmit` (backend e frontend) depois de cada passo antes
> de seguir pro próximo.

## Objetivo

A tela de Vendedores do painel admin hoje é só um placeholder:
`automarket_fe/src/features/sellers/SellersPage.tsx` renderiza um
`<ComingSoon icon="group" title="Vendedores" .../>`. A rota (`/vendedores`) e
o item de sidebar já existem e já apontam pra esse componente — só falta o
componente em si.

O backend do domínio Vendedor **já está pronto** (rotas, DTOs, autenticação,
escopo por loja) — só tem dois gaps pequenos de suporte (Passo 1). O grosso
do trabalho é 100% frontend: construir uma página funcional, moderna e
criativa de CRUD de vendedores, consumindo a API real, com dados sempre ao
vivo (sem mock — não existe nenhum mock de vendedores no projeto hoje, não há
nada pra remover nesse quesito).

**Não copie a tela de Veículos ao pé da letra.** Ela é referência de padrão
de código (como o projeto estrutura uma página de lista + CRUD), não de
layout — um vendedor tem 3-4 campos (nome, foto, whatsapp, ativo) contra os
20+ campos de um veículo, e cabe uma apresentação mais visual (cards com
foto) do que uma tabela densa. Antes de estilizar, use a skill
`frontend-design` já disponível neste projeto
(`automarket_fe/.claude/skills/`) pra evitar um resultado genérico.

## Contexto do projeto (resumo)

- **Stack**: `automarket_backend` (NestJS + Prisma + PostgreSQL),
  `automarket_fe` (React + Vite + TS + CSS Modules puro).
- Convenções obrigatórias (`Claude.md` na raiz): DTOs com `class-validator`,
  services com try/catch mapeando erros do Prisma (`P2002`→409, `P2003`→400,
  `P2025`→404), nunca retornar `passwordHash`, CSS por componente colocado
  ao lado do `.tsx`, ícones Material Symbols Outlined.
- **Autenticação já cobre tudo**: `JwtAuthGuard` é global (`APP_GUARD`), todo
  handler de controller usa `@LojaAtual() loja: LojaAutenticada` pra pegar a
  loja da sessão (nunca confiar em `lojaId` vindo do client). O padrão está
  implementado de forma idêntica em `veiculos.controller.ts` e em
  `vendedor.controller.ts` — nenhuma mudança de auth é necessária aqui.
- **Rota e navegação já wireadas** — não mexer em:
  - `automarket_fe/src/App.tsx`: rota `vendedores` → `lazy(() =>
    import("./features/sellers/SellersPage"))`, dentro do
    `ProtectedRoute`+`AdminLayout`.
  - `automarket_fe/src/layouts/Sidebar/navItems.ts`: item "Vendedores"
    (ícone `group`) já aponta pra `/vendedores`.
- **Modelo `Vendedor`** (`automarket_backend/prisma/schema.prisma`):
  ```
  id        Int      @id @default(autoincrement())
  nome      String   @db.VarChar(150)
  fotoUrl   String?  @db.VarChar(500)
  whatsapp  String   @db.VarChar(20)
  ativo     Boolean  @default(true)
  lojaId    Int
  loja      Loja     @relation(fields: [lojaId], references: [id], onDelete: Cascade)
  contatos          ContatoWhatsapp[]
  veiculosVendidos  Veiculo[]   // via Veiculo.vendedorId, sem onDelete definido (Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ```
- **Rotas de `automarket_backend/src/vendedor/vendedor.controller.ts`**
  (todas protegidas + escopadas por loja):
  - `POST /vendedor` — criar
  - `GET /vendedor?ativo=true|false` — listar (query `ativo` opcional)
  - `GET /vendedor/:id` — buscar um (inclui `_count.contatos`)
  - `PATCH /vendedor/:id` — atualizar campos
  - `PATCH /vendedor/desativar-vendedor/:id` — soft-delete (`ativo: false`)
  - `PATCH /vendedor/reativar-vendedor/:id` — reverte o soft-delete
  - `DELETE /vendedor/:id` — hard delete de verdade (cascade apaga os
    `ContatoWhatsapp` desse vendedor; se ele tiver `veiculosVendidos`
    vinculados, o delete falha — ver Passo 1.2)
- **`CreateVendedorDto`** (`automarket_backend/src/vendedor/dto/create-vendedor.dto.ts`):
  ```ts
  nome!: string;       // @IsString @MaxLength(150)
  fotoUrl?: string;     // @IsOptional @IsUrl @MaxLength(500)
  whatsapp!: string;    // @IsString @MaxLength(20) @Matches(/^\d{10,15}$/)
  ativo?: boolean;      // @IsOptional @IsBoolean
  ```
  `whatsapp` é **E.164 sem "+"**: só dígitos, DDI+DDD+número (ex:
  `5583999998888`). `update-vendedor.dto.ts` é só
  `PartialType(CreateVendedorDto)`.
- **Upload de foto**: mesmo fluxo de presign+PUT direto no R2 já usado em
  veículos/logo/loja. `automarket_fe/src/components/SingleImageField/SingleImageField.tsx`
  já existe pronto (`label`/`value`/`onChange`/`pasta`) — é o componente a
  reaproveitar pro campo `fotoUrl`, só falta liberar a pasta (Passo 1.1 +
  2.2).
- **`Modal`** (`automarket_fe/src/components/Modal/Modal.tsx`) — dialog
  genérico via portal, props `isOpen/onClose/title/maxWidth?/footer?/children`,
  já trata Esc/overlay-click/focus-trap/scroll-lock. Base pro formulário de
  criar/editar vendedor e pras confirmações (ver Passo 3).
- **`automarket_fe/src/service/http/api-cliente.ts`**: wrapper de `fetch`
  centralizado (`apiClient.get/post/patch/delete`), injeta `Authorization`
  automaticamente, lança `ApiError` em respostas não-ok. Usar sempre esse
  client, nunca `fetch` cru.
- Página de referência de padrão de lista+CRUD (não de layout — ver aviso no
  Objetivo): `automarket_fe/src/features/vehicles/vehiclesPage/VehiclesPage.tsx`
  + `VehicleTable.tsx` + `SellVehicleModal.tsx`. Padrão a copiar: `useState`
  local pra lista/loading/error, `carregarX()` que popula via
  `.then/.catch/.finally`, atualização otimista do array local após
  create/update/delete (sem refetch completo) em vez de recarregar a lista
  inteira a cada ação.
- Página de referência de padrão de formulário/validação: `AddVehiclePage.tsx`
  (helpers locais `Section`/`Field`, função `validate(form)` retornando
  `Partial<Record<keyof FormState, string>>`, estados `submitting`/`submitError`).

## Passo 1 — Backend: dois ajustes de suporte

O domínio já está pronto, só faltam estes dois pontos pra sustentar a tela nova.

1. **Liberar pasta de upload pra foto de vendedor** —
   `automarket_backend/src/uploads/dto/presign-upload.dto.ts`:
   ```ts
   const PASTAS_PERMITIDAS = ['veiculos', 'lojas/logo', 'lojas/banner', 'vendedores'] as const;
   ```
2. **Bloquear exclusão de vendedor com vendas vinculadas** —
   `automarket_backend/src/vendedor/vendedor.service.ts`, método `remove`
   (linha ~169). **Correção sobre a suposição original deste prompt**: como
   `Veiculo.vendedorId` é opcional (`Int?`) e a relação não tem `onDelete`
   explícito no schema, o Prisma aplica `SetNull` por padrão — **não**
   `Restrict`/`P2003` como um catch de erro assumiria. Na prática isso
   significa que `prisma.vendedor.delete` teria sucesso silencioso,
   zerando `Veiculo.vendedorId` das vendas desse vendedor sem erro nenhum e
   sem aviso — quebrando o histórico do ranking de vendedores do Dashboard.
   Confirmado testando via API (registrar loja → criar vendedor → criar
   veículo → marcar como vendido por ele → excluir o vendedor: o delete
   retornava 200 e a venda ficava órfã).
   A correção real precisa checar explicitamente **antes** de tentar o
   delete, não depender de um código de erro do Prisma que nunca ocorre:
   ```ts
   const vendasVinculadas = await this.prisma.veiculo.count({
     where: { vendedorId: id },
   });
   if (vendasVinculadas > 0) {
     throw new BadRequestException(
       'Não é possível excluir: este vendedor tem vendas registradas. Desative-o em vez de excluir.',
     );
   }
   ```
   Colocar logo após o `garantirQueExiste(id, lojaId)` e antes do `try`
   que chama `prisma.vendedor.delete`. O `catch` do `try` continua só
   tratando `P2025` (não encontrado).
3. **Incluir contagem de contatos na listagem** — hoje só `findOne` retorna
   `_count.contatos` (linha ~81); `findAll` (linha ~57) usa só
   `SELECT_PUBLICO`. Pra a tela mostrar "contatos recebidos" por vendedor
   sem N+1 chamadas, estender o `select` de `findAll` do mesmo jeito que
   `findOne` já faz:
   ```ts
   select: { ...SELECT_PUBLICO, _count: { select: { contatos: true } } },
   ```
   Não precisa de migration — é só um `select` diferente, nenhuma mudança de
   schema.

## Passo 2 — Frontend: tipos e camada de serviço

1. `automarket_fe/src/types/seller.ts`: adicionar o `_count` opcional
   (reflete o Passo 1.3) e os tipos de payload que faltam (o arquivo hoje só
   tem a interface `Vendedor`):
   ```ts
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
   ```
2. `automarket_fe/src/service/Uploads.service.ts`: estender o union
   `PresignPasta` (linha 9) — `"veiculos" | "lojas/logo" | "lojas/banner" |
   "vendedores"`.
3. `automarket_fe/src/service/Vendedores.service.ts`: hoje só tem
   `findAll`. Completar pra cobrir as rotas do Passo 1:
   ```ts
   import type { Vendedor, CreateVendedorPayload, UpdateVendedorPayload } from "../types/seller";
   import { apiClient } from "./http/api-cliente";

   export const vendedoresService = {
     findAll: (params?: { ativo?: boolean }) => {
       const query = params?.ativo !== undefined ? `?ativo=${params.ativo}` : "";
       return apiClient.get<Vendedor[]>(`/vendedor${query}`);
     },
     findById: (id: number) => apiClient.get<Vendedor>(`/vendedor/${id}`),
     create: (payload: CreateVendedorPayload) =>
       apiClient.post<Vendedor>("/vendedor", payload),
     update: (id: number, payload: UpdateVendedorPayload) =>
       apiClient.patch<Vendedor>(`/vendedor/${id}`, payload),
     deactivate: (id: number) =>
       apiClient.patch<Vendedor>(`/vendedor/desativar-vendedor/${id}`),
     reactivate: (id: number) =>
       apiClient.patch<Vendedor>(`/vendedor/reativar-vendedor/${id}`),
     delete: (id: number) =>
       apiClient.delete<{ message: string }>(`/vendedor/${id}`),
   };
   ```
4. `automarket_fe/src/lib/format.ts`: dar uma olhada nos helpers existentes
   (`formatCurrency`, `formatKilometragem` etc.) e adicionar
   `formatWhatsapp(whatsapp: string)` seguindo o mesmo estilo, convertendo o
   formato cru salvo (`5583999998888`) pra exibição (`+55 (83) 99999-8888`).
   Usar no card do vendedor (Passo 3) — nunca exibir o dígitos-crus pro
   usuário final.

## Passo 3 — Frontend: componentes novos

Criar em `automarket_fe/src/features/sellers/components/` (mesma
organização de `features/vehicles/components/`):

1. **`SellerCard/SellerCard.tsx`** — card de vendedor (não linha de tabela):
   foto (`fotoUrl`) ou, na ausência dela, um avatar com as iniciais do nome
   sobre uma cor derivada de um hash do próprio nome/id (evita todo card sem
   foto parecer igual); nome; whatsapp formatado com um botão/link
   `https://wa.me/<whatsapp>` (ícone); badge de status ativo/inativo;
   "N contatos recebidos" vindo de `_count.contatos`; ações (editar,
   desativar/reativar conforme o estado atual, excluir) com ícones Material
   Symbols, mesmo espírito de `VehicleTable`'s `actionButton`/
   `actionButtonDanger`. CSS Module colocado.
2. **`SellerFormModal/SellerFormModal.tsx`** — usa `Modal` como base,
   formulário de criar/editar (mesmo componente pros dois casos, prop
   `vendedor?: Vendedor` decide o modo). Campos: `nome` (texto), `whatsapp`
   (texto, com máscara/helper explicando o formato exigido pelo backend —
   `@Matches(/^\d{10,15}$/)` — e validação client-side espelhando essa regex
   antes de submeter), `fotoUrl` via `SingleImageField` (`pasta="vendedores"`).
   `ativo` só aparece no modo edição (não faz sentido cadastrar já inativo).
   Estados `submitting`/`submitError` como em `AddVehiclePage`. `onSaved`
   callback devolve o vendedor criado/atualizado pra página mãe atualizar o
   estado local sem refetch completo.
3. **Confirmação de ações destrutivas/estado** — trocar o padrão cru
   `window.confirm`/`window.alert` usado em `VehiclesPage` por um modal de
   verdade (reaproveitando `Modal`) pras ações de excluir/desativar/reativar,
   já que a página nova não deve herdar essa gambiarra. Pode ser um único
   componente genérico (`ConfirmActionModal` com `title`/`message`/
   `confirmLabel`/`onConfirm`/`variant?: "danger"`) reaproveitável nas três
   ações.
4. **Toolbar de busca/filtro** (`SellerToolbar` ou similar) — busca por nome
   (client-side, `useMemo` como em `VehiclesPage`) + filtro
   Todos/Ativos/Inativos (esse pode ir direto pra API via
   `vendedoresService.findAll({ativo})` já que o backend já suporta, em vez
   de filtrar em memória).

## Passo 4 — Frontend: `SellersPage.tsx`

Substituir o corpo do `ComingSoon` pela página real, seguindo o padrão de
estado de `VehiclesPage.tsx` (adaptado — sem a lógica de `location.state` de
retorno de rota, já que aqui tudo acontece em modal, sem navegação):

- Header com título "Vendedores", subtítulo curto, botão "Adicionar
  Vendedor" (abre `SellerFormModal` sem `vendedor` inicial).
- Toolbar (Passo 3.4).
- Grid responsivo de `SellerCard` (não tabela).
- Estados de loading/erro/vazio inline, no mesmo espírito das linhas de
  estado que `VehicleTable` renderiza dentro do `<tbody>` — aqui, dentro do
  grid.
- Ao criar/editar/desativar/reativar/excluir: atualizar o array local em
  memória (sem recarregar a lista inteira), igual ao padrão de
  `handleConfirmSell`/`handleDelete` em `VehiclesPage.tsx`.
- CSS Module colocado (`SellersPage.module.css`).

## Verificação

1. `npx tsc --noEmit` limpo em `automarket_backend` e `automarket_fe`.
2. `GET /vendedor` autenticado devolve a lista já com `_count.contatos` por
   item (conferir na aba Network).
3. Cadastrar um vendedor novo com foto → aparece no grid imediatamente, sem
   dar refresh na página, foto certa, whatsapp formatado corretamente.
4. Editar um vendedor existente → mudanças refletidas no card sem reload.
5. Desativar → badge muda pra inativo, botão vira "reativar"; reativar volta
   ao normal.
6. Excluir um vendedor sem vendas vinculadas → remove do grid.
7. Marcar um veículo como vendido escolhendo um vendedor (fluxo já existente
   em Veículos) e então tentar excluir esse mesmo vendedor → erro amigável
   (400, mensagem clara), não um 500 genérico.
8. Digitar um whatsapp fora do formato esperado → erro de validação inline
   antes mesmo de submeter pro backend.
