# AutoMarket

Sistema **white-label** para lojas de veículos usados. Não é um marketplace: cada loja contratante recebe seu próprio site público + painel administrativo, entregues como pacote fechado — a equipe cadastra de 10 a 30 veículos, cria a loja com login/senha e entrega tudo rodando em subdomínio próprio (`nomedaloja.automarket.com.br`).

O nome "AutoMarket" nunca aparece como marca principal nas telas entregues ao cliente final — a loja é sempre a protagonista visual (logo, banner e nome dinâmicos). No máximo um "powered by" discreto no rodapé.

## Stack

| Camada    | Tecnologias |
|-----------|-------------|
| Backend   | NestJS · Prisma ORM · PostgreSQL · JWT (`@nestjs/jwt`) · class-validator/class-transformer · Cloudflare R2 (S3-compatible, upload de imagens) |
| Frontend  | React 19 · Vite · TypeScript · React Router · CSS puro (CSS Modules, sem framework de UI) |

## Estrutura do repositório

```
automarket_backend/   API NestJS + Prisma
  src/
    app/               módulo raiz
    auth/              login da loja (JWT) e senha do gerente
    lojas/             CRUD da loja + endereço + identidade visual
    endereco/          endereço (1:1 com loja)
    vendedor/          CRUD de vendedores
    veiculos/          CRUD de veículos, venda/reserva/arquivamento
    veiculo_imagem/    galeria de imagens do veículo (capa, ordem)
    contato_whatsapp/  log imutável de cliques em "falar com vendedor"
    dashboard/         métricas agregadas (faturamento, conversão, ranking...)
    api_fipe/          integração com a API FIPE (cache de marcas/modelos/anos)
    uploads/           upload de imagens para o Cloudflare R2
    prisma/            client/serviço do Prisma
  prisma/schema.prisma modelo de dados completo

automarket_fe/        SPA React + Vite
  src/
    features/
      auth/              login/registro da loja
      dashboard/         visão geral e métricas do painel
      vehicles/          CRUD de veículos no painel
      sellers/           CRUD de vendedores no painel
      settings/          configurações da loja
      catalog/           catálogo público (home da loja)
      vehiclesDetails/   detalhe do veículo (site público)
      storeSellersPage/  lista de vendedores (site público)
      storeLocationPage/ localização da loja (site público)
    layouts/             AdminLayout + Sidebar (painel) / CatalogLayout (site público)
    styles/themes/       tokens de tema escopados (`admin-theme.css`, `catalog-theme.css`)
    service/              chamadas à API backend
    lib/                  helpers (formatação, URL pública da loja, download de arquivo...)
```

## Modelo de dados

Ver `automarket_backend/prisma/schema.prisma` para a fonte da verdade. Resumo das entidades:

- **Loja** — nome, `slug` (usado como subdomínio), logo/banner, cores de marca (aplicadas só no catálogo público), contato, endereço (1:1), senha de login e senha do gerente (hashes separados).
- **Endereco** — 1:1 com Loja.
- **Vendedor** — nome, foto, WhatsApp; N:1 com Loja.
- **Veiculo** — N:1 com Loja. `marca`/`modelo` são `String` (não FK): vêm de um `<select>` populado pela API FIPE no cadastro, com `marcaFipeId`/`modeloFipeId` guardados só para reconsulta futura de preço. `itens` é um array do enum `ItemVeiculo` (lista fixa de opcionais/tecnologia, não justifica tabela relacional). Tem `visualizacoes`, `status` (`DISPONIVEL`/`RESERVADO`/`VENDIDO`) e `dataVenda`.
- **VeiculoImagem** — N por veículo, com `ordem` e `capa` (garantidamente só uma capa por veículo).
- **VeiculoArquivado** — retrato congelado de um veículo excluído (soft delete há 30+ dias), guardando só os campos usados pelas métricas históricas do Dashboard.
- **ContatoWhatsapp** — log de evento imutável (só create/delete, nunca update): cada clique no modal "falar com vendedor" grava `veiculoId` + `vendedorId` + `createdAt`. É a fonte da maioria das métricas do Dashboard.

Loja, Vendedor e Veiculo usam **soft delete** (campo `ativo`) para preservar histórico de métricas.

## Telas

**Site público** (4 páginas, header fixo com logo/nome da loja em todas elas):
1. Catálogo — banner da loja, busca/filtros e seções de veículos por categoria.
2. Detalhe do veículo — ficha completa; CTA abre modal para escolher qual vendedor contatar via WhatsApp.
3. Vendedores — lista os vendedores ativos, com CTA direto para o WhatsApp de cada um.
4. Localização — endereço da loja + link para o Google Maps.

**Painel administrativo** (sidebar com 4 seções):
1. Dashboard — visão geral com métricas do período selecionado.
2. Veículos — CRUD completo (cadastro via FIPE, galeria de imagens, venda/reserva/exclusão).
3. Vendedores — CRUD completo.
4. Configurações — identidade visual, dados de contato, endereço, redes sociais e senha do gerente.

### Métricas do Dashboard

1. Faturamento no período — oculto até o dono da loja digitar a senha do gerente.
2. Ticket médio de venda.
3. Taxa de conversão (contatos via WhatsApp → vendas).
4. Valor total imobilizado em estoque.
5. Veículos mais procurados (visualizações + contatos).
6. Ranking de vendedores por contatos recebidos.
7. Veículos com muita visualização e pouco contato — sinal de preço a revisar.

## Autenticação

Cada loja é uma conta própria: login por e-mail/senha retorna um JWT (`@nestjs/jwt`) usado nas rotas protegidas do painel. A visualização do faturamento no Dashboard é protegida por uma segunda senha (senha do gerente), separada da senha de login, verificada em uma rota própria antes de liberar o valor.

## Rodando localmente

Pré-requisitos: Node.js, PostgreSQL.

### Backend

```bash
cd automarket_backend
npm install
# crie um .env com DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN
# e as credenciais do Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
# R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

### Frontend

```bash
cd automarket_fe
npm install
npm run dev
```

Em desenvolvimento não há proxy de subdomínio: cada loja é acessada pela rota `/:lojaSlug` (ver `useLojaSlug`/`getLojaPublicUrl`) em vez de `slug.automarket.com.br`, que é o formato usado em produção.

### Checagem de tipos

```bash
# em automarket_backend/ e automarket_fe/
npx tsc --noEmit
```

## Convenções

**Backend**
- DTOs com `class-validator`/`class-transformer`; `ValidationPipe` global ativo em `main.ts`.
- Services com try/catch, mapeando erros do Prisma (`P2002` → 409, `P2003` → 400, `P2025` → 404).
- `passwordHash` nunca é retornado pela API — sempre `select` explícito nas queries.
- Integração com a API FIPE é feita pelo backend (cache: marcas ~7 dias, modelos/anos ~1 dia), nunca direto do front.

**Frontend**
- CSS por componente (arquivo `.module.css` ao lado do `.tsx`), nunca um CSS gigante por página.
- Tokens de design escopados por tema (`admin-theme.css` para o painel, `catalog-theme.css` para o site público) em vez de `:root` global.
- Ícones: Material Symbols Outlined.
- Code-splitting por rota, memoização quando faz sentido, imagens otimizadas.
