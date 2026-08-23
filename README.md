# AutoMarket

Aplicação full-stack composta por uma API NestJS + Prisma/PostgreSQL (`automarket_backend`) e uma SPA React + Vite (`automarket_fe`). O domínio é gestão de lojas de veículos usados: cada `Loja` tem seu próprio site público de catálogo e um painel administrativo autenticado, servidos pela mesma API.

O rodapé do site público exibe um "powered by AutoMarket" discreto (`Footer.tsx`); o restante da identidade visual do catálogo (logo, banner, nome, cores) vem dos dados da própria loja (`Loja.corPrimaria`/`corSecundaria`, aplicadas como CSS custom properties).

## Sumário

1. [Stack](#stack)
2. [Arquitetura](#arquitetura)
3. [Estrutura do repositório](#estrutura-do-repositório)
4. [Modelo de dados](#modelo-de-dados)
5. [API REST](#api-rest)
6. [Autenticação e autorização](#autenticação-e-autorização)
7. [Upload de imagens](#upload-de-imagens)
8. [Integração com a API FIPE](#integração-com-a-api-fipe)
9. [Dashboard e métricas](#dashboard-e-métricas)
10. [Rotina agendada](#rotina-agendada)
11. [Frontend: rotas](#frontend-rotas)
12. [Frontend: painel administrativo](#frontend-painel-administrativo)
13. [Frontend: site público](#frontend-site-público)
14. [Variáveis de ambiente](#variáveis-de-ambiente)
15. [Rodando localmente](#rodando-localmente)
16. [Scripts disponíveis](#scripts-disponíveis)
17. [Convenções de código](#convenções-de-código)

## Stack

| Camada   | Tecnologias (de `package.json`) |
|----------|----------------------------------|
| Backend  | NestJS 11 · Prisma 6 (`@prisma/client`) · PostgreSQL · `@nestjs/jwt` · `@nestjs/schedule` · `class-validator`/`class-transformer` · `bcrypt` · `@aws-sdk/client-s3` + `s3-request-presigner` (upload compatível com S3, usado contra o Cloudflare R2) |
| Frontend | React 19 · React Router 7 · Vite · TypeScript · CSS Modules (sem framework de UI) |

## Arquitetura

```
                         ┌───────────────────────────┐
                         │   automarket_fe (Vite)     │
                         │  painel admin + catálogo   │
                         └─────────────┬─────────────┘
                                       │ fetch + JWT Bearer
                                       ▼
                         ┌───────────────────────────┐
                         │  automarket_backend (Nest) │
                         │  ValidationPipe + JwtAuthGuard global │
                         └──────┬───────────┬────────┘
                                │           │
                    Prisma Client           │
                                │           │  PUT pré-assinado (upload direto)
                                ▼           ▼
                        ┌────────────┐  ┌──────────────┐
                        │ PostgreSQL │  │ Cloudflare R2 │
                        └────────────┘  └──────────────┘

    ApiFipeController também expõe um proxy cacheado em memória para
    https://parallelum.com.br/fipe/api/v1 (usado no cadastro de veículo).
```

- O frontend nunca fala com o R2 nem com a FIPE diretamente pelo backend "no meio" para dados — imagens são enviadas via URL pré-assinada (o arquivo vai direto do navegador pro R2); a FIPE é consultada via proxy do backend (`ApiFipeController`), que cacheia a resposta em memória.
- Não há sessão de servidor: cada requisição autenticada carrega o JWT no header `Authorization`.

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
    dashboard/         métricas do painel (cards, tabelas)
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

| Entidade | Relação | Campos de destaque |
|---|---|---|
| **Loja** | 1:1 `Endereco`, 1:N `Vendedor`/`Veiculo`/`ContatoWhatsapp` | `slug` único (subdomínio/rota), `corPrimaria`/`corSecundaria` (aplicadas só no catálogo público), `passwordHash` (login) e `managerPasswordHash` separado (só libera o faturamento) |
| **Endereco** | 1:1 com `Loja` | `cep`, `rua`, `numero`, `bairro`, `cidade`, `estado` |
| **Vendedor** | N:1 `Loja`; 1:N `ContatoWhatsapp`/`Veiculo` (vendidos) | `whatsapp`, soft delete via `ativo` |
| **Veiculo** | N:1 `Loja`; N:1 `Vendedor` opcional; 1:N `VeiculoImagem`/`ContatoWhatsapp` | `marca`/`modelo` são `String` (preenchidos a partir da API FIPE; `marcaFipeId`/`modeloFipeId` guardados para reconsulta), `itens: ItemVeiculo[]`, `status` (`DISPONIVEL`/`RESERVADO`/`VENDIDO`), `visualizacoes`, soft delete (`ativo` + `excluidoEm`), `dataVenda` |
| **VeiculoArquivado** | N:1 `Loja`; sem FK para `Vendedor`/`Veiculo` (referência histórica) | Retrato criado pelo cron de arquivamento antes do delete definitivo — só os campos usados nas métricas do Dashboard |
| **VeiculoImagem** | N:1 `Veiculo` | `url`, `ordem`, `capa` |
| **ContatoWhatsapp** | N:1 `Loja`; N:1 `Vendedor`; N:1 `Veiculo` opcional (`SetNull` ao excluir) | Registro de evento com `createdAt`; sobrevive à exclusão do veículo |

**Enums:** `TipoVeiculo` (BUGGY, CAMINHAO_LEVE, CONVERSIVEL, COUPE, PERUA, VAN_UTILITARIO, SUV, HATCH, SEDAN, ELETRICO, PICKUP) · `Cambio` (AUTOMATICO, MANUAL, SEMI_AUTOMATICO, AUTOMATIZADO) · `Direcao` (HIDRAULICA, ELETRO_HIDRAULICA, MECANICA, ELETRICA) · `Combustivel` (ALCOOL, GASOLINA, FLEX, DIESEL, GNV, HIBRIDO, ELETRICO) · `Cor` (AMARELO, AZUL, BRANCO, CINZA, LARANJA, PRETO, PRATA, VERDE, VERMELHO, OUTRO) · `StatusVeiculo` (DISPONIVEL, RESERVADO, VENDIDO) · `ItemVeiculo` — lista fixa e extensa de opcionais/tecnologia do veículo, agrupada no schema em quatro blocos: segurança e proteção (airbags, câmeras/sensores, assistentes de condução...), conforto (ar-condicionado, bancos, teto solar...), tecnologia/conectividade (multimídia, CarPlay/Android Auto...) e desempenho/elétrico (tração 4x4, carregamento rápido...).

## API REST

Prefixo de cada controller entre parênteses. Rotas marcadas `@Public()` não exigem JWT — todas as demais passam pelo `JwtAuthGuard` global (registrado como `APP_GUARD`).

### auth (`/auth`)
| Rota | Auth | Descrição |
|---|---|---|
| `POST /login` | pública | `{ email, password }` → `{ accessToken, loja }` |

### lojas (`/lojas`)
| Rota | Auth | Descrição |
|---|---|---|
| `POST /` | pública | Cadastro de loja (ver DTO abaixo) |
| `GET /` | JWT | Lista lojas |
| `GET /publico/:slug` | pública | Dados públicos da loja para o catálogo |
| `GET /:id`, `PATCH /:id`, `DELETE /:id` | JWT | Só na própria loja autenticada (`ForbiddenException` se o `id` não bater) |

`CreateLojaDto`: `nome` (string, ≤150), `slug` opcional (gerado do nome se omitido; regex `^[a-z0-9]+(-[a-z0-9]+)*$`), `logo`/`banner` (URL, ≤500), `corPrimaria`/`corSecundaria` (regex `^#[0-9A-Fa-f]{6}$`), `email`, `telefone`, `whatsapp` (regex `^\d{10,15}$`), `horarioAbertura`/`horarioFechamento` (`HH:mm`), `facebookUrl`/`instagramUrl`/`youtubeUrl`, `password`/`confirm_password` e `managerPassword`/`confirmManagerPassword` (todas ≥8 e ≤72 caracteres — limite prático do bcrypt), `endereco` (objeto aninhado, `cidade`/`estado` obrigatórios).

### endereco (`/endereco`)
CRUD padrão (`POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) + `GET /lojaid/:id`, todos com JWT. `CreateEnderecoDto`: `lojaId`, `cep` (regex `^\d{5}-?\d{3}$`), `rua`, `numero`, `bairro`, `cidade` (obrigatório), `estado` (2 letras maiúsculas).

### vendedor (`/vendedor`)
CRUD padrão + `PATCH /desativar-vendedor/:id` e `PATCH /reativar-vendedor/:id`, todos com JWT. `CreateVendedorDto`: `nome`, `fotoUrl` opcional, `whatsapp` (regex `^\d{10,15}$`).

### veiculos (`/veiculos`)
| Rota | Auth | Descrição |
|---|---|---|
| `GET /publico` | pública | Catálogo com filtros: `slug` (obrigatório), `busca`, `tipoVeiculo`, `cambio`, `combustivel`, `precoMin`/`precoMax`, `anoMin`/`anoMax`, `page`/`perPage` |
| `GET /publico/:id` | pública | Ficha do veículo |
| `POST /` | JWT | Cria veículo (`CreateVeiculoDto`) |
| `GET /` | JWT | Lista da loja, filtro opcional `status` |
| `GET /:id`, `PATCH /:id`, `DELETE /:id` | JWT | Detalhe / edição / soft delete |
| `PATCH /:id/vender` | JWT | `{ vendedorId }` → status `VENDIDO` |
| `PATCH /:id/reservar` | JWT | Status `RESERVADO` |
| `PATCH /:id/disponibilizar` | JWT | Volta para `DISPONIVEL` |
| `PATCH /:id/reativar` | JWT | Reverte o soft delete |

`CreateVeiculoDto`: `marca`, `marcaFipeId?`, `modelo`, `modeloFipeId?`, `anoFabricacao`, `anoModelo`, `tipoVeiculo`, `cambio`, `portas`, `combustivel`, `direcao`, `potenciaMotor`, `cor`, `quilometragem`, `descricao`, `preco`, `imagens?` (array de `{ url, ordem?, capa? }`, mín. 1 se enviado), `itens?` (array de `ItemVeiculo`), `precoPromocional?`, `documentacaoRegularizacao?`, `conservacaoGarantia?`, `aceitaTroca?`, `aceitaFinanciamento?`.

### veiculo-imagem (`/veiculo-imagem`)
CRUD padrão, JWT. `CreateVeiculoImagemDto`: `veiculoId`, `url`, `ordem?`, `capa?`.

### contato-whatsapp (`/contato-whatsapp`)
| Rota | Auth | Descrição |
|---|---|---|
| `POST /publico` | pública | `{ veiculoId, vendedorId }` — visitante registra o clique em "falar com vendedor" |
| `POST /`, `GET /` (filtros `veiculoId`/`vendedorId`/`dataInicio`/`dataFim`/paginação), `GET /:id`, `DELETE /:id` | JWT | |

### dashboard (`/dashboard`)
| Rota | Auth | Descrição |
|---|---|---|
| `GET /metricas?dataInicio=` | JWT | Todas as métricas do período (ver seção própria) |
| `POST /faturamento/revelar` | JWT | `{ senha, dataInicio? }` — valida a senha do gerente e retorna o faturamento |

### api-fipe (`/api-fipe`)
Controller inteiro `@Public()`: `GET /marcas`, `GET /marcas/:marcaId/modelos`, `GET /marcas/:marcaId/modelos/:modeloId/anos`, `GET /marcas/:marcaId/modelos/:modeloId/anos/:anoId`.

### uploads (`/uploads`)
| Rota | Auth | Descrição |
|---|---|---|
| `POST /presign` | JWT | Gera URL pré-assinada de upload (ver seção própria) |

### Tratamento de erros
Os services (`lojas`, `veiculos`, `vendedor`, `endereco`, `veiculo_imagem`, `contato_whatsapp`) mapeiam erros do Prisma de forma consistente: `P2002` (violação de unicidade) → `409 Conflict`, `P2003` (violação de chave estrangeira) → `400 Bad Request`, `P2025` (registro não encontrado) → `404 Not Found`.

## Autenticação e autorização

- `POST /auth/login` compara a senha recebida com `bcrypt` contra `Loja.passwordHash` e retorna `{ accessToken, loja }`; a loja retornada usa o mesmo `select` (`SELECT_PUBLICO`, exportado de `LojasService`) usado nas demais rotas — garante que a sessão guardada no front tenha sempre o mesmo formato de objeto `Loja`.
- `JwtAuthGuard` é global (`APP_GUARD` em `AppModule`); o decorator `@Public()` marca as rotas que não exigem token. O decorator `@LojaAtual()` extrai a `Loja` autenticada do payload do JWT e a injeta diretamente no método do controller.
- O faturamento do Dashboard exige uma segunda senha (`Loja.managerPasswordHash`, verificada por `AuthService.verificarSenhaGerente`), independente da senha de login — nenhum valor de faturamento é calculado ou retornado se essa senha falhar.
- No frontend, a sessão (`accessToken` + `loja`) é mantida por `AuthContext`/`features/auth/session.ts` e enviada em toda chamada como `Authorization: Bearer <token>` (`service/http/api-cliente.ts`). Um `401` com sessão ativa limpa a sessão e redireciona para `/login`; sem sessão, o 401 vira um erro normal tratado pela própria tela de login.
- `ProtectedRoute` (React Router) redireciona para `/login` quando `isAuthenticated` é falso, envolvendo todas as rotas do painel.

## Upload de imagens

Fluxo em duas etapas, sem o arquivo passar pela API:

1. Frontend chama `POST /uploads/presign` com `{ fileName, contentType, fileSize, pasta }` (`pasta` restrita a `veiculos`, `lojas/logo`, `lojas/banner`, `vendedores`; `contentType` restrito a `image/jpeg`, `image/png`, `image/webp`; `fileSize` até 8.000.000 bytes). O backend confere se a extensão do nome do arquivo bate com o `contentType` informado, monta a chave `pasta/<uuid>.<extensão>` e devolve `{ uploadUrl, publicUrl, key }` — `uploadUrl` é uma URL assinada do S3/R2 válida por 60 segundos.
2. Frontend faz `PUT` do arquivo diretamente em `uploadUrl` (via `XMLHttpRequest`, para expor progresso) e depois usa `publicUrl` como URL definitiva da imagem (ex: em `VeiculoImagem.url` ou `Loja.logo`).

Credenciais do bucket (Cloudflare R2, compatível com S3) vêm de variáveis de ambiente — ver [Variáveis de ambiente](#variáveis-de-ambiente).

## Integração com a API FIPE

`ApiFipeService` faz proxy para `https://parallelum.com.br/fipe/api/v1` com cache em memória por chave (`MemoryTtlCache`):

| Recurso | TTL do cache |
|---|---|
| Marcas | 7 dias |
| Modelos de uma marca | 1 dia |
| Anos de um modelo | 1 dia |
| Detalhe de um ano (`Modelo`, `Combustivel`, `Valor`) | 1 dia |

No cadastro de veículo (`AddVehiclePage`), a marca é escolhida em um `<select>` alimentado por `GET /api-fipe/marcas`; escolher uma marca dispara a busca dos modelos correspondentes. `marca`/`modelo` são persistidos como texto (não FK), com os IDs da FIPE guardados à parte para eventual reconsulta.

## Dashboard e métricas

`GET /dashboard/metricas?dataInicio=` calcula, em paralelo, tudo abaixo para o período `[dataInicio, agora]` (padrão: últimos 30 dias; máximo 90 dias; `dataInicio` não pode ser futura):

- **Estoque** — soma de `preco` e contagem dos veículos ativos com status diferente de `VENDIDO`.
- **Conversão** — `totalContatos` (linhas de `ContatoWhatsapp` no período) e `totalVendas` (veículos vendidos no período, somando ativos + arquivados); taxa = vendas / contatos × 100.
- **Ticket médio** — soma de `preco` das vendas do período dividida pela quantidade, comparada com o período anterior de mesma duração (variação percentual).
- **Em alta** — os 4 veículos disponíveis com mais `visualizacoes`.
- **Alertas de precificação** — entre os veículos disponíveis com `visualizacoes >= 100`, calcula `contatos / visualizações`; abaixo de 0.5% sugere `REDUZIR_PRECO`, entre 0.5% e 1.2% sugere `REVISAR_FOTOS`; os 5 com mais visualizações são retornados.
- **Ranking de vendedores** — por vendedor ativo, total de contatos recebidos e total de vendas no período (somando veículos ativos + arquivados), ordenado por vendas.
- **Faturamento** (`POST /dashboard/faturamento/revelar`) — soma de vendas do período, só depois de validar a senha do gerente; inclui a variação percentual contra o período anterior.

Vendas de veículos já excluídos (soft delete há 30+ dias e arquivados pelo cron) continuam entrando nesses cálculos via `VeiculoArquivado`.

## Rotina agendada

`VeiculoArquivamentoService.arquivarVeiculosExcluidos` roda todo dia à meia-noite (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`, via `@nestjs/schedule`, registrado em `ScheduleModule.forRoot()`): busca veículos com soft delete (`ativo=false`) há 30 dias ou mais, grava um retrato em `VeiculoArquivado` (incluindo a contagem total de contatos recebidos) e então apaga o `Veiculo` de vez — a exclusão em cascata remove as imagens e desvincula (`SetNull`) os contatos, que sobrevivem por já guardarem `lojaId` próprio.

## Frontend: rotas

Definidas em `automarket_fe/src/App.tsx`, com code-splitting por rota (`React.lazy`):

- `/login`, `/registro` — públicas.
- `/:lojaSlug` (`CatalogRoot`, resolve a loja por `GET /lojas/publico/:slug`) com filhas `index` (catálogo), `veiculo/:id`, `vendedores`, `localizacao` — públicas. Em desenvolvimento a loja é acessada por essa rota (`useLojaSlug` lê `useParams`); o próprio hook documenta que, em produção, a resolução passaria a ser por subdomínio.
- `/dashboard`, `/veiculos`, `/veiculos/novo`, `/veiculos/:id/editar`, `/vendedores`, `/configuracoes` — atrás de `ProtectedRoute` + `AdminLayout` (sidebar fixa).

## Frontend: painel administrativo

- **Dashboard** (`/dashboard`) — cards de Receita (bloqueado até senha do gerente), Ticket Médio, Conversão e Estoque Ativo; tabela de Alertas de Precificação; lista "Em Alta"; Ranking de Vendedores com botão para gerar relatório (CSV montado no client a partir das mesmas métricas). Filtro de período via `PeriodSelector`.
- **Veículos** (`/veiculos`) — tabela com abas de status (Disponíveis/Reservados/Vendidos/Todos), busca e filtros, ação de venda (`SellVehicleModal`, escolhe o vendedor), reservar/disponibilizar, exclusão (soft delete, com aviso de que o registro é apagado em 30 dias) e reativação.
- **Adicionar/editar veículo** (`/veiculos/novo`, `/veiculos/:id/editar`) — mesmo formulário nos dois casos; seleção de marca/modelo em cascata a partir da API FIPE; upload de imagens via o fluxo de presign + PUT direto no R2; ao salvar, volta para `/veiculos`.
- **Vendedores** (`/vendedores`) — listagem com busca e filtro (todos/ativos/inativos); criar/editar (`SellerFormModal`); desativar, reativar e excluir, cada um com modal de confirmação própria (`ConfirmActionModal`).
- **Configurações** (`/configuracoes`) — edição de identidade visual (logo/banner via `SingleImageField`), cores de marca, dados de contato, horário de funcionamento, redes sociais, endereço e troca da senha do gerente (com confirmação); persiste via `PATCH /lojas/:id` e atualiza a sessão local (`updateLoja`) sem exigir novo login.

## Frontend: site público

Todas as páginas usam `loja` já carregada uma vez em `CatalogRoot` (via `GET /lojas/publico/:slug`), sem chamadas próprias de loja/endereço/vendedores.

- **Catálogo** (`/:lojaSlug`) — banner da loja, busca + `FilterBar` (tipo de veículo, câmbio, combustível, faixa de preço, ano mínimo) e seções por categoria (Mais Vistos + uma por `TipoVeiculo`), recolhidas depois de uma altura fixa com um botão "Ver mais" que só aparece quando o conteúdo realmente excede essa altura.
- **Detalhe do veículo** (`/:lojaSlug/veiculo/:id`) — ficha completa (galeria, ficha técnica, itens de série agrupados por categoria). Se o veículo já estiver `VENDIDO`, o CTA de contato some e aparece um aviso — a página continua acessível por link direto (o backend só retorna 404 para veículo inativo/inexistente).
- **Contato via WhatsApp** — `ContactModal` lista os vendedores da loja; ao escolher um, dispara (sem bloquear a UI) `POST /contato-whatsapp/publico` e abre `https://wa.me/<whatsapp>` em nova aba.
- **Vendedores** (`/:lojaSlug/vendedores`) — grade com os vendedores ativos da loja.
- **Localização** (`/:lojaSlug/localizacao`) — endereço formatado, link para busca no Google Maps e um mapa embutido via `output=embed` (sem API key), usando o endereço como texto de busca.

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

`main.ts` também fixa CORS para `http://localhost:5173` (origem do Vite em dev), sem `credentials`.

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

## Scripts disponíveis

**Backend:** `npm run start` / `start:dev` / `start:debug` / `start:prod`, `npm run build`, `npm run lint`, `npm run format`, `npm run test` / `test:watch` / `test:cov` / `test:e2e`, `npx prisma migrate dev`, `npx prisma generate`, `npx prisma studio`.

**Frontend:** `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

**Checagem de tipos** (nos dois projetos): `npx tsc --noEmit`.

## Convenções de código

- **Validação de entrada** — `ValidationPipe({ whitelist: true, transform: true })` global; todo DTO usa `class-validator`/`class-transformer`.
- **Segurança de dados** — queries de `Loja` sempre usam `select` explícito; `passwordHash`/`managerPasswordHash` nunca são retornados pela API.
- **Erros do Prisma** — mapeamento centralizado por service (`P2002`→409, `P2003`→400, `P2025`→404), em vez de deixar o erro cru do Prisma vazar como 400 genérico.
- **Soft delete** — `Loja`, `Vendedor` e `Veiculo` usam um campo `ativo` (mais `excluidoEm` em `Veiculo`) em vez de exclusão física, preservando histórico para as métricas.
- **CSS** — um `.module.css` por componente/página (nunca um CSS global de página inteira); tokens de tema em custom properties escopadas por classe (`.admin-theme`, `.catalog-theme`) em vez de `:root`.
- **Roteamento** — code-splitting por rota via `React.lazy` no frontend.
