# Prompt: cores customizáveis por loja (tema dinâmico do catálogo público)

> Este arquivo é autocontido — pode ser dado a uma IA em uma sessão nova, sem
> nenhum contexto de conversa anterior, e ela deve conseguir implementar a
> feature inteira só com o que está descrito aqui. Sempre releia os arquivos
> reais antes de editar; os trechos abaixo mostram o estado no momento em que
> este prompt foi escrito e podem ter mudado.

## Objetivo

Cada loja poderá customizar duas cores de marca (primária e secundária).
Essas cores devem aparecer no **catálogo público** de cada loja — o site
que os clientes visitam (`nomedaloja.automarket.com.br`) — e **não** no
painel administrativo. O painel admin é uma ferramenta interna, igual para
todas as lojas; é o catálogo público que precisa ter a identidade visual de
cada loja (CLAUDE.md já descreve o catálogo como tendo "hero dinâmico da
loja" — logo, banner e nome já variam por loja, cor é uma extensão natural
disso).

O dono da loja edita essas cores pelo painel admin (tela de Configurações),
mas o *efeito visual* delas só aparece no catálogo público.

**Importante**: o catálogo público ainda não existe neste repo — só o
painel admin foi construído até agora (ver Contexto abaixo). Este prompt
cobre a infraestrutura de dados (banco + API) e o scaffold mínimo de tema
para o catálogo; não cobre construir as páginas reais do catálogo (isso é
outro trabalho, descrito em CLAUDE.md como "Site público: Catálogo +
Detalhe do Veículo").

Não estamos criando um sistema de theming genérico nem editor de tema
completo — só dois campos de cor por loja, aplicados como sobrescrita de
CSS custom properties no tema do catálogo.

## Contexto do projeto (resumo)

- **Stack**: `automarket_backend` (NestJS + Prisma + PostgreSQL) e
  `automarket_fe` (React + Vite + TS + CSS Modules puro).
- Convenções obrigatórias (ver `Claude.md` na raiz do repo): DTOs com
  `class-validator`, `ValidationPipe` global, services com try/catch mapeando
  erros do Prisma (`P2002`→409, `P2003`→400, `P2025`→404), nunca retornar
  `passwordHash`, CSS por componente colocado ao lado do `.tsx`, tokens de
  design escopados por tema (nunca em `:root` global), fontes **Geist +
  Inter no catálogo público** (vs. Montserrat + Inter no painel admin).
- A entidade `Loja` já existe em
  `automarket_backend/prisma/schema.prisma` (por volta da linha 178) com:
  `id, nome, slug, logoUrl, bannerUrl, email, telefone, passwordHash, ativo,
  createdAt, updatedAt` + relações `endereco/vendedores/veiculos`.
- O CRUD de loja já existe e funciona:
  `automarket_backend/src/lojas/{lojas.controller.ts,lojas.service.ts}` +
  `dto/{create-loja.dto.ts,update-loja.dto.ts}`. `UpdateLojaDto` é
  `PartialType(CreateLojaDto)` — **qualquer campo novo adicionado ao
  `CreateLojaDto` já fica disponível automaticamente no `PATCH`**, não é
  necessário mexer no `update-loja.dto.ts`.
- No frontend, **só existe o painel admin**: `App.tsx` só tem rotas sob
  `AdminLayout` (`dashboard`, `veiculos`, `veiculos/novo`, `vendedores`,
  `configuracoes`). Não há nenhuma pasta/rota de catálogo público ainda —
  procure por "catalog"/"catalogo" no `src/` antes de assumir que algo já
  existe.
- `AdminLayout.tsx` aplica a classe `.admin-theme` uma única vez e consome
  `src/styles/themes/admin-theme.css`. O comentário no topo desse arquivo já
  antecipa um futuro `.catalog-theme` com fontes diferentes (Geist), prova
  de que a separação de temas por escopo de classe (não `:root` global) já
  foi pensada para múltiplos temas convivendo no projeto.
- Hoje `AdminLayout.tsx` usa `mockLoja` (de `src/mocks/store.mock.ts`) em
  vez de buscar a loja real da API — **não existe ainda** um
  `Lojas.service.ts` no frontend (os únicos services hoje são
  `Veiculos.service.ts`, `Uploads.service.ts`, `apiFipe.service.ts`, todos
  sobre o wrapper `service/http/api-cliente.ts`).
- A tela `features/settings/SettingsPage.tsx` é hoje só um placeholder
  (`<ComingSoon />`) — é onde a UI de customização de cor deve entrar.

## Passo 1 — Schema (Prisma)

Em `automarket_backend/prisma/schema.prisma`, no `model Loja`, adicionar dois
campos opcionais logo após `bannerUrl`:

```prisma
model Loja {
  id        Int      @id @default(autoincrement())
  nome      String   @db.VarChar(150)
  slug      String   @unique @db.VarChar(100)
  logoUrl   String?  @db.VarChar(500)
  bannerUrl String?  @db.VarChar(500)

  corPrimaria   String? @db.VarChar(7)
  corSecundaria String? @db.VarChar(7)

  email        String  @unique @db.VarChar(150)
  ...
```

- `VarChar(7)` porque um hex é sempre `#RRGGBB` (7 caracteres).
- Nullable: loja sem customização deve continuar usando os valores padrão
  do `catalog-theme.css` (Passo 6) — não preencher com um default no banco.

Rodar a migration:

```bash
cd automarket_backend
npx prisma migrate dev --name add_cores_personalizadas_loja
npx prisma generate
```

## Passo 2 — DTO

Em `automarket_backend/src/lojas/dto/create-loja.dto.ts`, adicionar (perto
dos campos `logoUrl`/`bannerUrl`, seguindo o mesmo estilo dos demais campos
opcionais do DTO):

```ts
@IsOptional()
@IsString()
@Matches(/^#[0-9A-Fa-f]{6}$/, {
  message: 'Cor deve estar em formato hex, ex: #091426',
})
corPrimaria?: string;

@IsOptional()
@IsString()
@Matches(/^#[0-9A-Fa-f]{6}$/, {
  message: 'Cor deve estar em formato hex, ex: #091426',
})
corSecundaria?: string;
```

Não é necessário mexer em `update-loja.dto.ts` (`PartialType` já propaga).

## Passo 3 — Service (backend)

Em `automarket_backend/src/lojas/lojas.service.ts`:

1. Adicionar `corPrimaria: true, corSecundaria: true` ao objeto
   `SELECT_PUBLICO` (perto de `logoUrl`/`bannerUrl`).
2. No `create()`, incluir `corPrimaria: createLojaDto.corPrimaria,
   corSecundaria: createLojaDto.corSecundaria` no objeto `data` do
   `prisma.loja.create`.
3. No `update()`, incluir `corPrimaria: updateLojaDto.corPrimaria,
   corSecundaria: updateLojaDto.corSecundaria` no objeto `data` do
   `prisma.loja.update`.

Não é necessário criar rota nova — `POST /lojas` e `PATCH /lojas/:id`
(já existentes em `lojas.controller.ts`) passam a aceitar os campos
automaticamente porque validação e select já cobrem os dois.

## Passo 4 — Tipo (frontend)

Em `automarket_fe/src/types/store.ts`, adicionar ao `interface Loja`:

```ts
corPrimaria?: string;
corSecundaria?: string;
```

Em `automarket_fe/src/mocks/store.mock.ts`, adicionar valores de exemplo:

```ts
corPrimaria: '#091426',
corSecundaria: '#0058be',
```

## Passo 5 — Criar `Lojas.service.ts` (frontend)

Ainda não existe um service de loja no frontend. Criar
`automarket_fe/src/service/Lojas.service.ts` seguindo o mesmo padrão de
`Veiculos.service.ts` (usar o `apiClient` de `service/http/api-cliente.ts`,
mesmo estilo de import/export). Precisa no mínimo de:

- `getLoja(id: number): Promise<Loja>` — `GET /lojas/:id`
- `updateLoja(id: number, data: Partial<Loja>): Promise<Loja>` — `PATCH /lojas/:id`

Leia `Veiculos.service.ts` antes de escrever este arquivo para reproduzir
exatamente o mesmo formato de chamada, tratamento de erro e tipagem — não
inventar um padrão novo.

## Passo 6 — Scaffold do tema do catálogo público

**Não mexer em `AdminLayout.tsx` nem em `admin-theme.css`** — o painel
admin continua com tema fixo, igual pra todas as lojas. A cor customizada
só se aplica ao catálogo público, que ainda não existe neste repo. Este
passo cria só o "encaixe" onde a cor vai atuar assim que as páginas do
catálogo forem construídas (fora de escopo deste prompt).

1. Criar `automarket_fe/src/styles/themes/catalog-theme.css`, espelhando a
   estrutura de `admin-theme.css` (mesmas categorias: cor de superfície,
   cor de texto, cor de marca/ação, espaçamento, raio, tipografia,
   elevação — todas como CSS custom properties escopadas em uma classe
   `.catalog-theme`, nunca em `:root`), mas com:
   - `--catalog-font-heading: 'Geist', sans-serif;`
   - `--catalog-font-body: 'Inter', sans-serif;`
   - Prefixo `--catalog-*` em vez de `--admin-*` em todas as variáveis
     (evita colisão de nomes entre os dois temas, mesma lógica já usada
     para separar `.admin-theme` de `:root`).
   - `--catalog-color-primary` e `--catalog-color-secondary` com valores
     padrão razoáveis (podem ser os mesmos hex do admin como ponto de
     partida) — são exatamente os dois tokens que serão sobrescritos por
     loja.

2. Criar `automarket_fe/src/layouts/CatalogLayout/CatalogLayout.tsx`,
   espelhando o padrão de `AdminLayout.tsx`: aplica a classe
   `.catalog-theme` uma única vez no elemento raiz, envolve `<Outlet />`
   num `<Suspense>`. Esse layout ainda não é referenciado em `App.tsx`
   (não há rotas de catálogo ainda) — criar o componente já preparado para
   quando as rotas do catálogo (`Catálogo`, `Detalhe do Veículo`) forem
   adicionadas.

3. Dentro do `CatalogLayout`, aplicar `corPrimaria`/`corSecundaria` da loja
   como overrides inline, só quando a loja tiver customizado (senão usa o
   default do `catalog-theme.css`):

   ```tsx
   const themeOverrides = {
     ...(loja.corPrimaria && { '--catalog-color-primary': loja.corPrimaria }),
     ...(loja.corSecundaria && { '--catalog-color-secondary': loja.corSecundaria }),
   } as React.CSSProperties;

   return (
     <div className={`catalog-theme ${styles.shell}`} style={themeOverrides}>
       ...
   ```

   Isso funciona porque CSS custom properties em `style` inline têm
   precedência sobre as definidas na classe `.catalog-theme` — nenhum outro
   arquivo CSS precisa mudar. É o mesmo mecanismo (só que aplicado ao tema
   certo) que seria usado no admin, caso um dia ele também precisasse de
   customização visual.

   Como o catálogo ainda não busca a loja pela API, este passo pode deixar
   `CatalogLayout` recebendo `loja: Loja` via props (em vez de importar o
   mock diretamente), já que quem for construir as páginas do catálogo vai
   decidir como a loja chega até aqui (rota por subdomínio/slug, contexto,
   etc. — decisão fora de escopo deste prompt).

## Passo 7 — UI de edição em Configurações

Em `automarket_fe/src/features/settings/SettingsPage.tsx` (hoje só
`<ComingSoon />`), criar a tela real com:

- Dois campos de cor (`<input type="color">` ou dois campos de texto com
  preview), rotulados "Cor primária" e "Cor secundária".
- Estado local controlado (`useState`), inicializado com a loja atual.
- Botão "Salvar" chamando `updateLoja` do `Lojas.service.ts` criado no
  Passo 5.
- CSS Module colocado ao lado (`SettingsPage.module.css`), seguindo o
  mesmo padrão visual dos outros cards do painel (reaproveitar classes de
  `dashboard-shared.module.css` como `panel`/`panelHover` se fizer sentido
  visualmente, em vez de recriar estilos de card do zero).
- Deixar claro na UI (texto de apoio) que essa cor afeta o site público da
  loja, não o próprio painel — evita confundir o usuário quando ele mudar
  a cor e o painel admin continuar com a mesma aparência de sempre.

Esse passo é o único que envolve UI nova de verdade no painel — os passos
1 a 6 são plumbing + scaffold. Se o pedido for só "dar suporte a cores
customizadas" sem exigir a tela pronta, os passos 1–6 já são suficientes; o
passo 7 é o que entrega a capacidade de uso real pelo dono da loja.

## Verificação

1. `cd automarket_backend && npx prisma migrate dev --name add_cores_personalizadas_loja` roda sem erro.
2. `cd automarket_backend && npx tsc --noEmit` sem erros.
3. `cd automarket_fe && npx tsc --noEmit` sem erros.
4. Testar via `POST /lojas` ou `PATCH /lojas/:id` (Insomnia/Postman/curl)
   enviando `corPrimaria`/`corSecundaria` válidos → 200/201 com os campos
   no retorno; enviando um valor inválido (ex: `"vermelho"`) → 400 com a
   mensagem de validação.
5. **Não há tela pública ainda para testar visualmente** (catálogo não
   existe neste repo). A verificação do Passo 6 é: `catalog-theme.css` e
   `CatalogLayout.tsx` compilam (`tsc --noEmit`), e o padrão de override
   via `style` inline é idêntico ao que já foi validado visualmente no
   admin — só trocando o alvo (`--catalog-*` em vez de `--admin-*`) e o
   componente (`CatalogLayout` em vez de `AdminLayout`).
6. Se o Passo 7 for implementado: salvar uma cor na tela de Configurações e
   confirmar que persiste (recarregar a página e a cor continuar aplicada
   no objeto `Loja` retornado pela API — o efeito visual só será visível
   quando o catálogo público existir e usar `CatalogLayout`).
