# AutoMarket

Aplicação full-stack composta por uma API NestJS + Prisma/PostgreSQL (`automarket_backend`) e uma SPA React + Vite (`automarket_fe`). O domínio é gestão de lojas de veículos usados: cada `Loja` tem seu próprio site público de catálogo e um painel administrativo autenticado, servidos pela mesma API.

O rodapé do site público exibe um "powered by AutoMarket" discreto (`Footer.tsx`); o restante da identidade visual do catálogo (logo, banner, nome, cores) vem dos dados da própria loja.

## Stack

| Camada   | Tecnologias (de `package.json`) |
|----------|----------------------------------|
| Backend  | NestJS 11 · Prisma 6 (`@prisma/client`) · PostgreSQL · `@nestjs/jwt` · `@nestjs/schedule` · `class-validator`/`class-transformer` · `bcrypt` · `@aws-sdk/client-s3` + `s3-request-presigner` (upload compatível com S3) |
| Frontend | React 19 · React Router 7 · Vite · TypeScript · CSS Modules (sem framework de UI) |

## Estrutura do repositório

```
automarket_backend/src/
  app/               módulo raiz (AppModule, bootstrap dos controllers/providers)
  auth/              login (JWT), guard global, decorators @Public()/@LojaAtual()
  lojas/             CRUD de Loja
  endereco/          CRUD de Endereco (1:1 com Loja)
  vendedor/          CRUD de Vendedor + ativar/desativar
  veiculos/          CRUD de Veiculo, venda/reserva/exclusão, catálogo público,
                     cron de arquivamento
  veiculo_imagem/    CRUD das imagens de um veículo
  contato_whatsapp/  registro (público) e consulta (autenticada) de contatos
  dashboard/         métricas agregadas por loja e período
  api_fipe/          proxy/cache para a API FIPE
  uploads/           geração de URL pré-assinada para upload de imagens
  prisma/            PrismaService (client)

automarket_fe/src/
  features/
    auth/              login, registro, contexto de sessão, rota protegida
    dashboard/         métricas do painel (cards, tabelas, gráficos simples)
    vehicles/          CRUD de veículos no painel
    sellers/           CRUD de vendedores no painel
    settings/          edição dos dados da loja
    catalog/           catálogo público (home da loja)
    vehiclesDetails/   detalhe de um veículo (site público)
    storeSellersPage/  lista de vendedores (site público)
    storeLocationPage/ endereço da loja (site público)
  layouts/             AdminLayout + Sidebar · CatalogLayout + Footer
  service/             um arquivo por recurso da API (Auth, Lojas, Veiculos,
                       Vendedores, Dashboard, Catalog, Uploads, apiFipe) sobre
                       um cliente HTTP único (`service/http/api-cliente.ts`)
  lib/                 helpers (formatação, download de arquivo, título/favicon
                       de página, URL pública da loja)
  styles/themes/       tokens de tema em CSS custom properties (admin-theme.css,
                       catalog-theme.css)
```

## Modelo de dados

Fonte: `automarket_backend/prisma/schema.prisma`.

- **Loja** — dados de identidade/contato, `slug` único, `corPrimaria`/`corSecundaria` (aplicadas no catálogo público via CSS custom properties), `passwordHash` (login) e `managerPasswordHash` (separado, só libera o faturamento no Dashboard).
- **Endereco** — 1:1 com `Loja`.
- **Vendedor** — N:1 com `Loja`; tem `whatsapp` e soft delete (`ativo`).
- **Veiculo** — N:1 com `Loja`. `marca`/`modelo` são `String` (preenchidos a partir da API FIPE no cadastro; `marcaFipeId`/`modeloFipeId` ficam guardados para reconsulta). `itens` é um array do enum `ItemVeiculo` (lista fixa de opcionais/tecnologia). Campos de enum: `TipoVeiculo`, `Cambio`, `Direcao`, `Combustivel`, `Cor`, `StatusVeiculo` (`DISPONIVEL`/`RESERVADO`/`VENDIDO`). Tem `visualizacoes`, soft delete (`ativo` + `excluidoEm`) e `dataVenda`.
- **VeiculoArquivado** — retrato congelado de um `Veiculo`, criado pelo cron de arquivamento antes do delete definitivo; guarda só os campos usados nas métricas do Dashboard (preço, status, visualizações, total de contatos, vendedor, datas).
- **VeiculoImagem** — N por veículo, com `ordem` e `capa`.
- **ContatoWhatsapp** — registro de evento (loja + veículo opcional + vendedor + `createdAt`); `veiculoId` é `SetNull` ao excluir o veículo, para o histórico sobreviver mesmo depois do veículo ser apagado.

## API (rotas HTTP)

Prefixo de cada controller entre parênteses. Rotas marcadas `@Public()` não exigem JWT — todas as demais passam pelo `JwtAuthGuard` global.

- **auth** (`/auth`) — `POST /login` `@Public()`.
- **lojas** (`/lojas`) — `POST /` `@Public()` (cadastro de loja), `GET /`, `GET /publico/:slug` `@Public()`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (as três últimas só na própria loja autenticada).
- **endereco** (`/endereco`) — CRUD padrão + `GET /lojaid/:id`.
- **vendedor** (`/vendedor`) — CRUD + `PATCH /desativar-vendedor/:id` e `PATCH /reativar-vendedor/:id`.
- **veiculos** (`/veiculos`) — `GET /publico` e `GET /publico/:id` `@Public()` (catálogo, com filtros de busca/tipo/câmbio/combustível/preço/ano/paginação); `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/vender`, `PATCH /:id/reservar`, `PATCH /:id/disponibilizar`, `PATCH /:id/reativar` autenticados.
- **veiculo-imagem** (`/veiculo-imagem`) — CRUD padrão.
- **contato-whatsapp** (`/contato-whatsapp`) — `POST /publico` `@Public()` (visitante registra o contato); `POST /`, `GET /` (com filtros), `GET /:id`, `DELETE /:id` autenticados.
- **dashboard** (`/dashboard`) — `GET /metricas?dataInicio=`, `POST /faturamento/revelar` (recebe a senha do gerente).
- **api-fipe** (`/api-fipe`) — `@Public()` inteiro: `GET /marcas`, `GET /marcas/:marcaId/modelos`, `GET /marcas/:marcaId/modelos/:modeloId/anos`, `GET /marcas/:marcaId/modelos/:modeloId/anos/:anoId`.
- **uploads** (`/uploads`) — `POST /presign`.

Erros do Prisma são mapeados de forma consistente nos services (`lojas`, `veiculos`, `vendedor`, `endereco`, `veiculo_imagem`, `contato_whatsapp`): `P2002` → 409, `P2003` → 400, `P2025` → 404.

## Autenticação e sessão

- Login (`POST /auth/login`) retorna `{ accessToken, loja }`; o `AuthService` compara a senha com `bcrypt` contra `Loja.passwordHash`.
- `JwtAuthGuard` está registrado como `APP_GUARD` global em `AppModule`; rotas marcadas com o decorator `@Public()` pulam a verificação. O decorator `@LojaAtual()` extrai a loja autenticada (a partir do payload do JWT) e a injeta no controller.
- O faturamento do Dashboard exige uma segunda senha (`managerPasswordHash`, verificada por `AuthService.verificarSenhaGerente`), independente da senha de login.
- No frontend, a sessão (`accessToken` + `loja`) fica no `AuthContext`/armazenamento local (`features/auth/session.ts`) e é enviada como header `Authorization: Bearer` em toda chamada (`service/http/api-cliente.ts`). Um 401 com sessão ativa limpa a sessão e redireciona para `/login`.

## Rotina agendada

`VeiculoArquivamentoService` roda todo dia à meia-noite (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`, via `@nestjs/schedule`): veículos com soft delete (`ativo=false`) há 30 dias ou mais são congelados em `VeiculoArquivado` e então apagados definitivamente da tabela `Veiculo`.

## Rotas do frontend

Definidas em `automarket_fe/src/App.tsx`, com code-splitting por rota (`React.lazy`):

- `/login`, `/registro` — públicas.
- `/:lojaSlug` (`CatalogRoot`, resolve a loja por um `GET` público ao slug da rota) com filhas `index` (catálogo), `veiculo/:id`, `vendedores`, `localizacao` — públicas. Em desenvolvimento a loja é acessada por essa rota; o hook `useLojaSlug` documenta que, em produção, a resolução por subdomínio ficaria isolada nesse mesmo arquivo.
- `/dashboard`, `/veiculos`, `/veiculos/novo`, `/veiculos/:id/editar`, `/vendedores`, `/configuracoes` — atrás de `ProtectedRoute` (exige sessão) + `AdminLayout`.

## Variáveis de ambiente

**Backend** (`automarket_backend/.env`, lido via `dotenv/config` em `main.ts`):

```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

**Frontend** — `VITE_API_URL` (opcional; sem ela o cliente HTTP usa `http://localhost:3000`).

`main.ts` também fixa CORS para `http://localhost:5173` (origem do Vite em dev).

## Rodando localmente

```bash
# Backend
cd automarket_backend
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev        # http://localhost:3000

# Frontend
cd automarket_fe
npm install
npm run dev               # http://localhost:5173
```

Outros scripts disponíveis: `npm run build`, `npm run lint` e (no backend) `npm run test` / `test:e2e` / `npx prisma studio`.

## Convenções observadas no código

- Backend: `ValidationPipe({ whitelist: true, transform: true })` global; DTOs com `class-validator`; queries de `Loja` sempre com `select` explícito (nunca retornam `passwordHash`/`managerPasswordHash`).
- Frontend: um `.module.css` por componente/página, sem CSS global de página inteira; tokens de tema em custom properties escopadas por classe (`.admin-theme`, `.catalog-theme`) em vez de `:root`.
