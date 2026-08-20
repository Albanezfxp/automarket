# Estrutura do frontend (`automarket_fe/src`)

> Este documento foi gerado lendo o conteúdo real de cada arquivo do
> frontend no momento da geração. Ele é uma fotografia — o código muda,
> arquivos são movidos/renomeados, e este arquivo **não se atualiza
> sozinho**. Se algo aqui não bater com o que você vê no editor, confie no
> editor: releia o arquivo real antes de tomar qualquer decisão baseada só
> nesta documentação. Uma seção "Observações" no fim lista inconsistências
> já percebidas no momento da escrita.

Stack: React + Vite + TypeScript, CSS puro via CSS Modules (um `.module.css`
por componente, nunca um CSS gigante central). Dois temas convivem no mesmo
bundle, cada um escopado numa classe (`.admin-theme` / `.catalog-theme`),
nunca em `:root` global — ver `styles/themes/`. Ícones sempre Material
Symbols Outlined.

## Índice

- [Raiz (`src/`)](#raiz-src)
- [`components/`](#components)
- [`features/auth/`](#featuresauth)
- [`features/catalog/`](#featurescatalog)
- [`features/dashboard/`](#featuresdashboard)
- [`features/sellers/`](#featuressellers)
- [`features/settings/`](#featuressettings)
- [`features/storeLocationPage/`](#featuresstorelocationpage)
- [`features/storeSellersPage/`](#featuresstoresellerspage)
- [`features/vehicles/`](#featuresvehicles)
- [`features/vehiclesDetails/`](#featuresvehiclesdetails)
- [`layouts/`](#layouts)
- [`lib/`](#lib)
- [`service/`](#service)
- [`styles/`](#styles)
- [`types/`](#types)
- [Observações](#observações)

---

## Raiz (`src/`)

### `App.tsx`

Componente raiz de roteamento (`react-router-dom`). Define duas árvores de
rota completamente separadas:

1. **Site público**, sob `path=":lojaSlug"` com `CatalogRoot` como elemento
   — engloba `CatalogPage` (índice), `VehicleDetailPage`
   (`veiculo/:id`), `StoreSellersPage` (`vendedores`) e `StoreLocationPage`
   (`localizacao`). Nenhuma dessas rotas passa por `ProtectedRoute`: o
   visitante do catálogo não faz login.
2. **Painel admin**, dentro de `<ProtectedRoute><AdminLayout>` —
   `DashboardPage`, `VehiclesPage`, `AddVehiclePage` (cadastro e edição
   reaproveitam o mesmo componente, diferenciados por rota
   `veiculos/novo` vs `veiculos/:id/editar`), `SellersPage`,
   `SettingsPage`.

Toda página é `lazy()` — code-splitting por rota, cada uma vira seu próprio
chunk JS. Um `<Suspense>` externo cobre login/registro (que ficam fora do
`AdminLayout`); o `AdminLayout` tem o próprio `<Suspense>` interno para as
rotas autenticadas.

### `main.tsx`

Ponto de entrada Vite/React. Monta a árvore em `#root` dentro de
`<StrictMode>` → `<BrowserRouter>` → `<AuthProvider>` → `<App />`. Importa
`index.css` (o único import de CSS "global" do projeto).

### `index.css`

Uma linha só: `@import './styles/reset.css';`. Não define nenhum token
visual — isso é proposital, ver `styles/reset.css`.

---

## `components/`

Componentes verdadeiramente genéricos, usados por múltiplas features do
**painel admin** (não usados pelo site público, que tem os próprios
componentes em `features/catalog/components/`).

### `ComingSoon/ComingSoon.tsx` + `.module.css`

Placeholder visual para seções do painel ainda não implementadas. Recebe
`icon`, `title`, `description` como props. Segundo o comentário do próprio
arquivo, a etapa atual do projeto é só o Dashboard — as outras rotas do
menu existiam antes de terem conteúdo real, daí este componente (hoje,
pelas leituras de `SellersPage`/`SettingsPage`/`VehiclesPage`, todas as
seções do painel já têm conteúdo real; não ficou claro se `ComingSoon`
ainda é referenciado em algum lugar — não apareceu em nenhum outro arquivo
lido).

### `Modal/Modal.tsx` + `.module.css`

Dialog genérico via `createPortal`, reutilizado por várias features do
**painel** (`SellerFormModal`, `ConfirmActionModal`, `SellVehicleModal`).
Props: `isOpen`, `onClose`, `title`, `maxWidth?` (vira a CSS custom property
`--modal-max-width` via `style` inline), `footer?` (ações fixas fora da
área com scroll do corpo), `children`.

Comportamento: fecha no `Escape`, no clique fora (`overlay`), trava
`document.body.style.overflow` enquanto aberto, foca automaticamente o
primeiro elemento focável do diálogo ao abrir, e devolve o foco pro
elemento que originalmente abriu o modal quando ele fecha (acessibilidade
de teclado).

**Detalhe importante de arquitetura**: o portal é montado direto em
`document.body`, fora da `<div class="admin-theme">` do `AdminLayout`. Por
isso o próprio `Modal` reaplica a classe `admin-theme` no nó do overlay —
sem isso, nenhuma CSS custom property `--admin-*` usada dentro do modal (ou
em qualquer `children`/`footer` recebido) resolveria, já que variáveis CSS
cascateiam pela árvore do **DOM**, não pela árvore de componentes React.
Esse é exatamente o motivo pelo qual o site público não reaproveita este
componente (ver `ContactModal` em `features/vehiclesDetails/`).

### `SingleImageField/SingleImageField.tsx` + `.module.css`

Campo de upload de **uma única imagem**, usado em `SellerFormModal` (foto
do vendedor) e `SettingsPage` (logo/banner da loja). Fluxo: valida tipo
(`image/jpeg`/`png`/`webp`) e tamanho (máx. 8MB) no client, pede uma URL
pré-assinada via `uploadsService.presignImage`, faz upload direto pro
Cloudflare R2 via `uploadFileToR2` (ver `service/Uploads.service.ts`), e só
então chama `onChange(publicUrl)`. Mostra preview local
(`URL.createObjectURL`) enquanto o upload roda e uma barra de progresso.
Props: `label`, `value` (URL atual ou `undefined`), `onChange`, `pasta`
(subpasta do R2 — tipo `PresignPasta`). Comentário no código: é a "versão
simplificada" de `ImageListField` (`features/vehicles/components/`), sem
lista, `ordem` ou `capa`, porque aqui só existe uma imagem possível.

---

## `features/auth/`

Autenticação do **painel admin** (o site público não tem login).

### `AuthContext.tsx`

Contexto React (`AuthProvider` + hook `useAuth`) que expõe `loja` (dados da
loja logada ou `null`), `isAuthenticated`, e as ações `login`, `logout`,
`updateLoja`. Estado inicial lido de `session.ts` (`getStoredSession`) —
sessão sobrevive a reload de página via `localStorage`. `updateLoja` existe
para sincronizar o contexto depois de um `PATCH /lojas/:id` bem-sucedido
(usado por `SettingsPage`) sem forçar um novo login.

### `session.ts`

Persistência da sessão (`accessToken` + `loja`) em `localStorage`, sob a
chave `automarket:session`. Três funções puras: `getStoredSession`,
`setStoredSession`, `clearStoredSession`. `getStoredSession` engole
qualquer erro de parse e retorna `null` (sessão corrompida vira "sem
sessão", não crash).

### `ProtectedRoute.tsx`

Guarda de rota simples: se `!isAuthenticated`, redireciona para `/login`
(`<Navigate replace>`); senão, renderiza o `<Outlet />`. É o elemento pai
que envolve todas as rotas do painel admin em `App.tsx`.

### `LoginPage.tsx` + `RegisterPage.tsx` (compartilham `AuthPage.module.css`)

Telas de autenticação, layout dividido: um painel de "hero" com pitch de
marketing (visível só a partir de `960px`, ver breakpoint no CSS) +
formulário. Ambas aplicam `admin-theme` diretamente na raiz do componente
(são páginas fora do `AdminLayout`, então precisam da classe de tema por
conta própria).

- `LoginPage`: formulário de e-mail/senha, chama `useAuth().login`, navega
  para `/dashboard` em caso de sucesso. Trata `ApiError` com `status 401`
  como "e-mail ou senha inválidos" (mensagem específica).
- `RegisterPage`: formulário mais longo (dados da loja, senha de acesso,
  senha do gerente — separada, protege o faturamento no Dashboard —,
  endereço opcional). Valida client-side que as duas senhas (e as duas
  senhas do gerente) coincidem antes de submeter. Após
  `lojasService.register`, loga automaticamente com as credenciais recém
  criadas (não manda o usuário de volta pro `/login`).

`AuthPage.module.css` define o grid responsivo da tela, o painel de hero
com formas decorativas desfocadas (`::before`/`::after` com blur), e todo o
estilo de formulário (inputs, fieldsets, botão de submit) compartilhado
pelas duas páginas.

---

## `features/catalog/`

Núcleo do **site público**: a home/catálogo de veículos da loja, mais os
componentes de UI compartilhados pelas quatro páginas públicas (o header, o
card de veículo, o carrossel de categoria, a barra de filtros).

### `CatalogPage.tsx` + `.module.css`

A home da loja (rota índice de `:lojaSlug`). Busca a página inteira do
estoque ativo (`catalogService.listVeiculos(loja.slug, { perPage: 100 })`)
**uma vez** e filtra no cliente — decisão documentada no próprio arquivo:
o catálogo de uma loja white-label é pequeno por design (10–30 veículos,
ver `CLAUDE.md`), então não compensa pagar round-trips de rede por filtro.

Estrutura visual: hero/banner **liso** (só a imagem de `loja.banner`, sem
texto sobreposto — identidade e navegação já ficam no `CatalogHeader`,
fixo nas quatro páginas), com fallback em gradiente
(`--catalog-color-primary` → `-secondary`) quando a loja não tem banner. Um
`<h1>` visualmente oculto (`.srOnly`, técnica clássica de
clip/position:absolute) existe só para SEO/acessibilidade, já que não há
mais nenhum `<h1>` visível na página. Barra de filtros (`FilterBar`)
"flutua" sobre o hero via `margin-top: -48px` negativo. Quando há filtro
ativo, mostra uma grid simples de resultados; sem filtro, mostra seções de
carrossel (`CategoryCarousel`): "Mais vistos" (ordenado por
`visualizacoes`) e uma seção por `TipoVeiculo` presente no estoque atual
(nunca mostra categoria vazia). Rodapé fixo: "powered by AutoMarket"
(único lugar onde o nome da plataforma aparece, conforme regra de negócio
em `CLAUDE.md`).

Vendedores e Localização **não** são mais seções desta página — viraram
rotas próprias (`StoreSellersPage`/`StoreLocationPage`), acessíveis pelo
nav do `CatalogHeader`.

### `CatalogRoot.tsx` + `.module.css`

Elemento pai das quatro rotas públicas (`path=":lojaSlug"` em `App.tsx`).
Resolve o slug via `useLojaSlug()`, busca a loja com
`catalogService.getLojaPublica(slug)` uma única vez, e monta o
`CatalogLayout` em volta do `<Outlet>`, repassando a `Loja` carregada via
`useOutletContext` — as páginas filhas (`CatalogPage`, `VehicleDetailPage`,
`StoreSellersPage`, `StoreLocationPage`) leem essa loja com o hook exportado
`useLojaAtual()`, sem refazer a chamada. Trata `erro`/`loading` com estados
de fallback simples (`CatalogRoot.module.css`, classe `.fallback`) —
inclusive convertendo `ApiError` com `status 404` numa mensagem específica
("Loja não encontrada").

### `hooks/useLojaSlug.ts`

Isola a leitura do slug da loja atrás de um hook único. Hoje lê de
`useParams()` (rota `/:lojaSlug`) porque em desenvolvimento não existe
proxy de subdomínio; comentário no código já antecipa que em produção
(`nomedaloja.automarket.com.br`) a resolução provavelmente vira leitura de
`window.location.hostname` — trocar a estratégia no futuro é uma mudança
isolada neste arquivo só. Lança erro se usado fora de uma rota com
`:lojaSlug`.

### `components/CatalogHeader/CatalogHeader.tsx` + `.module.css`

Header fixo (`position: sticky`), renderizado uma única vez pelo
`CatalogLayout` — aparece nas quatro páginas do site público. Duas
responsabilidades:

1. **Marca**: mostra `loja.logo` se existir; sem logo, monta um
   **monograma** (primeira letra do nome da loja) num quadrado com a cor
   primária da loja (`--catalog-color-primary`) — comentário no código:
   "nunca cai num texto puro sem tratamento, então toda loja tem uma
   'marca' visual mesmo sem ter feito upload de nada". Clicar na marca
   navega pra home da loja.
2. **Nav**: links (`NavLink`, com classe ativa) para `vendedores` e
   `localizacao` — rotas reais, não âncoras de scroll.

Efeitos: um listener de `scroll` (com guarda `requestAnimationFrame` para
não empilhar chamadas) alterna um estado `comprimido`, que a
`CatalogHeader.module.css` usa para encolher o header (`padding`, altura da
logo/monograma) e adicionar sombra/borda ao rolar. Em telas ≤ 860px, o nav
horizontal desaparece e vira um botão de menu (`menuToggle`) que expande um
painel (`mobilePanel`) por baixo do header via `max-height` animado — outro
efeito trava `document.body.style.overflow` enquanto o menu mobile está
aberto. O CSS ainda tem classes `.phoneLink`/`.phoneNumber` para um link de
telefone (`tel:`) que não está mais sendo renderizado no JSX atual — ver
seção Observações.

### `components/CategoryCarousel/CategoryCarousel.tsx` + `.module.css`

Carrossel horizontal genérico (`title` + `children`), usado por
`CatalogPage` pra cada seção de categoria. Implementado só com
`overflow-x: auto` + `scroll-snap-type: x proximity` — decisão explícita
no comentário do código: nenhuma dependência de carrossel foi adicionada
(não havia nenhuma já instalada no `package.json`), o scroll nativo já
resolve.

### `components/FilterBar/FilterBar.tsx` + `.module.css`

Busca (`marca`/`modelo`) + filtros essenciais em barra horizontal de
selects estilo "chip": tipo de veículo, câmbio, combustível, faixa de
preço (`precoMax`, valores fixos pré-definidos), ano mínimo. Comentário no
código explicita a decisão de **não** cobrir todo enum do schema (ex:
`cor`, `direção`) — só os campos que um comprador de usado busca primeiro.
Botão "Limpar filtros" aparece só quando algum filtro está ativo, e limpa
tudo preservando o termo de busca.

### `components/VehicleCard/VehicleCard.tsx` + `.module.css`

Card de veículo reaproveitado no carrossel de categoria e em qualquer grid
de resultado de busca/filtro. Usa a imagem marcada como `capa` (ou a
primeira, se nenhuma for capa). Mostra selo "Reservado"/"Vendido" conforme
`status`. Preço promocional risca o preço original — mesmo padrão visual
do formulário de cadastro do painel (comentário aponta
`AddVehiclePage.module.css`, classes `previewPreco`/`previewPrecoOriginal`,
como referência de formato, não de CSS compartilhado). O card inteiro é um
`<Link>` para `/<lojaSlug>/veiculo/<id>`.

---

## `features/dashboard/`

Painel de métricas do dono da loja — a única página do admin com conteúdo
"pronto" mencionada no comentário de `ComingSoon` (hoje as outras seções
também já têm conteúdo real, ver `features/sellers`/`features/vehicles`).

### `Dashboard.tsx` + `.module.css`

Página que orquestra as 7 métricas do briefing do produto (ver
`CLAUDE.md`): banner de resumo do período (texto fixo, sem dado dinâmico
além do período), grid de métricas (`RevenueCard`, `MetricCard` para
Ticket Médio e Estoque Ativo, `ConversionCard`), e uma grid secundária
(`PriceAlertTable` + `TrendingVehicles` na coluna principal,
`SellerRanking` na lateral). Todo o cálculo acontece no backend
(`GET /dashboard/metricas`, período fixo de 30 dias via constante
`PERIODO_DIAS`) — este componente só decide como exibir, via o hook
`useDashboardData`.

### `dashboard-shared.module.css`

Não é componente — é CSS puro reaproveitado via `composes: x from '...'`
(feature nativa de CSS Modules) pelos cards do dashboard
(`MetricCard`, `PriceAlertTable`, `TrendingVehicles`, `SellerRanking`):
mesmo "painel" base (`panel`/`panelHover`), mesmo cabeçalho
(`panelHeader`/`panelTitle`/`panelSubtitle`), mesmo estado vazio
(`emptyState`). Comentário no arquivo explica a escolha: cada componente
continua com seu próprio `.module.css` (co-location é requisito do
projeto), a duplicação de regras some via `composes`, sem centralizar tudo
num CSS gigante.

### `hooks/useDashboardData.ts`

Fonte única de dados da página: busca `dashboardService.getMetricas` uma
vez (com `periodoDias` configurável, default 30), expõe `{ metricas,
isLoading, error }`. Comentário no código: `Dashboard.tsx` e os componentes
de métrica não sabem (nem precisam saber) como o dado é calculado, só como
exibi-lo.

### `components/ConversionCard/ConversionCard.tsx` + `.module.css`

Métrica "Taxa de Conversão" (contatos WhatsApp → vendas), renderizada por
dentro de um `MetricCard` (usa a prop `children` dele para injetar a barra
de progresso e a linha de estatísticas contatos/vendas).

### `components/MetricCard/MetricCard.tsx` + `.module.css`

Card genérico do "bento grid" do Dashboard: `icon`, `title`, `value`
(`ReactNode`, não só string — permite composição customizada, ver
`RevenueCard`/`ConversionCard`), `trend?` opcional (seta
up/down/neutral + label), `footnote?`, `children?`. `memo`-izado. Métricas
com comportamento especial (Receita bloqueada por senha, Conversão com
barra) usam este mesmo visual por baixo mas envolvem lógica própria.

### `components/PriceAlertTable/PriceAlertTable.tsx` + `.module.css`

Tabela "Alerta de Precificação": cruza visualizações × contatos por
veículo para apontar anúncios com muito interesse mas baixa conversão em
contato (sinal de preço ou fotos/descrição precisando de atenção). Duas
ações sugeridas possíveis (`REDUZIR_PRECO`/`REVISAR_FOTOS`), cada uma com
label e classe de badge próprias. `memo`-izado.

### `components/RevenueCard/RevenueCard.tsx` + `.module.css`

Métrica de Faturamento Total — a única protegida por senha própria do
dono da loja (a "senha do gerente", separada da senha de login, ver
`CLAUDE.md`). Ponto de destaque do comentário no código: **o valor real só
entra na memória do browser depois que o backend valida a senha**
(`POST /dashboard/faturamento/revelar`) — antes disso, nenhum número
real chega ao client, nem mascarado. Até lá, mostra `R$ •••••••` e um
formulário inline (não modal) para digitar a senha. Cadeado
(`lock`/`lock_open`) alterna entre revelar/ocultar; ocultar de novo joga o
valor fora do estado (não fica guardado "desbloqueado" silenciosamente).

### `components/SellerRanking/SellerRanking.tsx` + `.module.css`

Ranking de vendedores por volume de contatos recebidos no período. Cada
item ganha um "tier" (`high`/`medium`/`low`) **relativo ao líder** — não é
um limiar absoluto de "bom"/"ruim" (comentário explícito no código),
calculado como proporção do `totalContatos` do vendedor sobre o
`totalContatos` do primeiro colocado. `memo`-izado. Botão "Ver Relatório
Completo" no rodapé não tem `onClick` implementado (cosmético por
enquanto).

### `components/TrendingVehicles/TrendingVehicles.tsx` + `.module.css`

Grid "Em Alta (Mais Visualizados)" — veículos disponíveis com mais
visualizações no catálogo público, como sinal de demanda. `memo`-izado.

---

## `features/sellers/`

CRUD de vendedores do **painel admin** (distinto da seção pública de
vendedores em `features/storeSellersPage/`).

### `SellersPage.tsx` + `.module.css`

Lista vendedores da loja (`vendedoresService.findAll`, refeita sempre que
o filtro de status muda), com busca por nome no cliente
(`vendedoresFiltrados`, via `useMemo`). Um único `ConfirmState`
(`{ vendedor, action }`) controla os três fluxos de confirmação
(excluir/desativar/reativar), cada um com título/mensagem/label próprios
definidos em `CONFIRM_CONTENT` — evita três modais quase-idênticos
separados. `handleSaved` faz merge cuidadoso pra preservar `_count`
(contagem de contatos) ao atualizar um vendedor existente na lista local,
já que a resposta do `PATCH`/`POST` não necessariamente traz esse campo
populado.

### `components/SellerToolbar/SellerToolbar.tsx` + `.module.css`

Busca por nome + três abas de filtro (`todos`/`ativos`/`inativos`,
`role="tablist"`/`role="tab"` para acessibilidade). Exporta o tipo
`SellerFiltro` usado por `SellersPage`.

### `components/SellerFormModal/SellerFormModal.tsx` + `.module.css`

Modal de criar/editar vendedor — mesmo componente para os dois casos, a
presença da prop `vendedor` decide o modo (comentário explícito no
código). O campo `ativo` só aparece no modo edição: "não faz sentido
cadastrar um vendedor já inativo". Validação client-side: nome obrigatório,
WhatsApp precisa bater com `/^\d{10,15}$/` (só dígitos, com DDI+DDD). Mostra
um preview formatado do WhatsApp (`formatWhatsapp`) assim que o valor tem
12–13 dígitos. Usa `SingleImageField` (pasta `"vendedores"`) para a foto.

### `components/ConfirmActionModal/ConfirmActionModal.tsx` + `.module.css`

Confirmação genérica reutilizável (título, mensagem, label do botão,
variante `danger?` opcional) — comentário no código: substitui
`window.confirm`/`window.alert` por um modal de verdade. Usado por
`SellersPage` para os três fluxos de ação sobre vendedor.

---

## `features/settings/`

### `SettingsPage.tsx` + `.module.css`

Formulário único de configurações da loja logada, organizado em seções
(`Section`, componente interno): Identidade visual (logo + banner via
`SingleImageField`), Cores da marca (`corPrimaria`/`corSecundaria`, cada
uma com um `<input type="color">` sincronizado a um campo de texto hex —
com aviso explícito na UI de que essas cores só afetam o site público, não
o painel), Dados da loja, Endereço, e Senha do gerente (opcional — só
recalculada se preenchida, protege a visualização do faturamento no
Dashboard). Ao salvar, chama `lojasService.update` e propaga o resultado
via `useAuth().updateLoja` (sincroniza o contexto de auth sem exigir novo
login).

---

## `features/storeLocationPage/`

### `StoreLocationPage.tsx` + `.module.css`

Página pública "Localização" (rota `/:lojaSlug/localizacao`). Usa
`loja.endereco`, já carregado uma vez em `CatalogRoot` — sem chamada de
API própria. Comentário no código: **sem mapa embutido de propósito**
(Google Maps/Mapbox exigiria API key e custo de terceiro, fora do escopo
atual) — só um link "Ver no mapa" que abre a busca do Google Maps
(`google.com/maps/search`) numa nova aba, com o endereço formatado via
`formatEndereco` (`lib/format.ts`).

Layout: breadcrumb (volta pra home da loja) + título "Onde estamos", depois
duas colunas — a "placa" de endereço (tipografia grande para rua/número,
linha de cidade-UF, CEP) com botões de ação (Ver no mapa; Ligar, se
`loja.telefone` existir), e um elemento decorativo `.beacon`: um círculo
com gradiente radial nas cores da loja e dois anéis (`beaconRingOuter`/
`beaconRingInner`) em animação de pulso contínuo (`@keyframes
beacon-pulse`), com `prefers-reduced-motion` respeitado (animação
desligada, anéis ficam estáticos com opacidade reduzida). Estado vazio
(sem endereço cadastrado) mostra um aviso simples em vez de placa quebrada.

---

## `features/storeSellersPage/`

### `StoreSellersPage.tsx` + `.module.css`

Página pública "Vendedores" (rota `/:lojaSlug/vendedores`). Usa
`loja.vendedores` (já filtrado para só ativos pelo backend, carregado uma
vez em `CatalogRoot`) — sem chamada de API própria. Mesmo padrão de
"pageHero" (faixa com gradiente sutil na cor da loja + breadcrumb) do
`StoreLocationPage`. Corpo: grid de `StoreSellerCard`, ou um estado vazio
("Nenhum vendedor cadastrado no momento") quando a lista está vazia.

### `components/StoreSellerCard/StoreSellerCard.tsx` + `.module.css`

Card editorial de vendedor (avatar grande — foto ou fallback com iniciais
sobre uma cor derivada do nome/id via hash simples, `hashHue`, mesmo truque
usado em `features/sellers/components/SellerCard`), nome, e um CTA "Chamar
no WhatsApp" que abre `wa.me/<whatsapp>` direto. Comentário explícito no
código sobre uma diferença importante: diferente do `ContactModal` da
single page de veículo, **aqui não há veículo associado ao clique**, então
o evento **não** é registrado em `ContatoWhatsapp` (esse log é sempre por
veículo, via `POST /contato-whatsapp/publico`).

---

## `features/vehicles/`

CRUD de veículos do painel admin — a feature mais extensa do projeto.

### `constants/fieldOptions.ts`

Labels em pt-BR para os enums do formulário de veículo
(`TIPO_VEICULO_LABELS`, `CAMBIO_LABELS`, `DIRECAO_LABELS`,
`COMBUSTIVEL_LABELS`, `COR_LABELS`), escritos à mão em vez de usar
`humanizeEnumValue` — comentário no código: são poucos valores e merecem
acentuação/gramática corretas (diferente do checklist de itens de série,
que tem 100+ valores e usa formatação automática). Também define listas de
opções para campos de texto guiado (`POTENCIA_MOTOR_OPTIONS`,
`DOCUMENTACAO_OPTIONS`, `CONSERVACAO_GARANTIA_OPTIONS`) e um mapa
`FIPE_COMBUSTIVEL_PARA_ENUM` que traduz o combustível em string livre
devolvido pela API da FIPE (`"Gasolina"`, `"Flex"`...) para o enum
`Combustivel` do schema — combinações não mapeadas simplesmente não
preenchem o campo automaticamente.

### `vehiclesPage/VehiclesPage.tsx` + `.module.css`

Lista paginada de veículos da loja (`veiculosService.findAll`), com busca
por marca/modelo no cliente e paginação também no cliente (delegada ao
`VehicleTable`). Recarrega a lista quando volta de `AddVehiclePage` com
`location.state.novoVeiculo` marcado (o POST/PATCH já persistiu de
verdade — só precisa buscar de novo, não reconstruir nada localmente) e
limpa esse state via `navigate(..., { replace: true, state: null })` pra
não recarregar de novo num refresh. Excluir usa `window.confirm`/
`window.alert` (não o `ConfirmActionModal` usado em `sellers`). Marcar como
vendido abre `SellVehicleModal` para escolher o vendedor responsável.

### `components/VehicleTable/VehicleTable.tsx` + `.module.css`

Tabela com paginação (`PAGE_SIZE = 8`, calculada no próprio componente a
partir da lista completa recebida). Cada linha: thumbnail (capa), nome +
cor/combustível, ano/km, preço (mostra `precoPromocional` quando existe),
`StatusBadge`, e ações (editar/marcar como vendido/excluir — as três somem
se o veículo já está `VENDIDO`). O botão de "visualizar" (ícone `visibility`)
fica **desabilitado de propósito**: comentário no código explica que ainda
não existe página de detalhe de veículo no contexto do painel (o catálogo
público é outro escopo) — "melhor mostrar o botão inerte do que fingir uma
ação que não faz nada".

### `components/VehicleToolbar/VehicleToolbar.tsx` + `.module.css`

Busca + botão "Filtros". Comentário no código: o botão de filtros ainda é
**cosmético** — não existem filtros reais (por tipo, faixa de preço etc.)
implementados no painel ainda, só reserva o espaço visual até a
funcionalidade existir.

### `components/StatusBadge/StatusBadge.tsx` + `.module.css`

Badge de status do veículo (`DISPONIVEL`/`RESERVADO`/`VENDIDO`), reaproveita
o sistema de "selo" (`plate`) de `styles/plate.module.css` via `composes`.

### `components/SellVehicleModal/SellVehicleModal.tsx` + `.module.css`

Seletor de vendedor (só ativos) pra confirmar uma venda — passo obrigatório
antes de marcar um veículo como `VENDIDO`, já que a venda exige um
`vendedorId` real (`PATCH /veiculos/:id/vender`), não é mais uma simples
troca de status (comentário explícito no código sobre essa mudança de
comportamento).

### `components/ImageListField/ImageListField.tsx` + `.module.css`

Lista dinâmica de fotos com upload direto pro Cloudflare R2 via URL
pré-assinada (mesmo mecanismo do `SingleImageField`, mas para N imagens
com controle de `capa` — via `<input type="radio" name="imagem-capa">`,
garantindo só uma capa marcada por vez no client, espelhando a regra do
backend). Ao remover a imagem marcada como capa, promove automaticamente a
primeira restante para capa (nunca deixa a lista sem nenhuma). Estado de
upload (progresso, preview, erro) é **interno** por linha — nunca sobe pro
componente pai, que só vê `{ url, capa }[]`. `memo`-izado, com justificativa
explícita no comentário: `AddVehiclePage` re-renderiza inteiro a cada tecla
digitada em qualquer campo do form, então sem o `memo` essa lista (com
previews de imagem) seria refeita a cada keystroke de campos não
relacionados.

### `components/ItemsChecklist/ItemsChecklist.tsx` + `.module.css`

Checklist de itens de série (~100 valores do enum `ItemVeiculo`), agrupado
pelas mesmas categorias comentadas no schema
(`ITEM_VEICULO_CATEGORIAS`, de `types/vehicleItem.ts`). Também `memo`-izado
pela mesma razão do `ImageListField` (evitar re-render de ~100 checkboxes
a cada keystroke em outro campo do formulário).

### `addVehiclePage/AddVehiclePage.tsx` + `.module.css`

O formulário mais complexo do projeto — cadastro **e** edição de veículo
no mesmo componente, alternando por parâmetro de rota (presença de `:id`
define `isEditMode`). Pontos notáveis:

- **Integração FIPE em cascata**: busca marcas uma vez ao montar; busca
  modelos sempre que a marca selecionada muda. Os códigos FIPE
  (`marcaCodigo`/`modeloCodigo`) ficam fora do `FormState` porque o form
  guarda o *nome* (`marca`/`modelo` são `String` no schema, não FK — ver
  `CLAUDE.md`), não o código; em modo edição, os códigos são reconstruídos
  a partir de `veiculo.marcaFipeId`/`modeloFipeId` salvos, só para os
  `<select>` aparecerem pré-selecionados.
- **Validação client-side** (`validate(form)`): cobre praticamente todo
  campo obrigatório, incluindo a regra de negócio "preço promocional deve
  ser menor que o preço cheio" e "pelo menos uma foto com URL preenchida".
- `handleItensChange`/`handleImagensChange` são `useCallback` com array de
  dependências vazio — comentário explícito no código: sem isso, uma nova
  arrow function a cada render (disparado por qualquer tecla digitada)
  invalidaria o `memo` de `ItemsChecklist`/`ImageListField`.
- Layout: formulário em seções temáticas (`Section`, componente interno,
  mesmo padrão usado em `SettingsPage`) + um painel de pré-visualização
  fixo (`position: sticky`) que reflete o estado do form em tempo real
  (nome, preço com promocional riscando o original, tags de
  ano/câmbio/combustível/km).
- Barra de ações fixa no rodapé (`footerBar`, `position: sticky; bottom:
  0`) com blur de fundo, sempre visível independente do scroll do form.

---

## `features/vehiclesDetails/`

### `VehicleDetailPage.tsx` + `.module.css`

Página pública de ficha completa do veículo (rota `veiculo/:id`, sob
`CatalogRoot`). Busca o veículo via `catalogService.getVeiculo(id)`
(endpoint público, que já inclui `imagens` e os vendedores ativos da loja
dona). Regras de negócio documentadas no comentário do componente: se o
veículo estiver `VENDIDO`, a página continua acessível por link direto
(o backend não dá 404 pra `VENDIDO`, só pra inativo/inexistente) — mas o
CTA de contato some, substituído por um aviso "Este veículo já foi
vendido", em vez de simular disponibilidade pro visitante.

Estrutura: breadcrumb (loja / marca+modelo), `Gallery` de fotos, descrição,
itens de série agrupados por categoria (reaproveita
`ITEM_VEICULO_CATEGORIAS`, com labels humanizados via
`humanizeEnumValue`), e um painel lateral fixo (`infoCard`,
`position: sticky`) com tipo, título, badges de status, preço (com
promocional riscando o original), grid de specs (ano, km, câmbio,
combustível, direção, cor, portas, motor), selos informativos (aceita
troca/financiamento, documentação, garantia) e o CTA principal — que abre
o `ContactModal`.

### `components/ContactModal/ContactModal.tsx` + `.module.css`

Modal de escolha de vendedor (a loja pode ter mais de um) — ao escolher:
**a)** dispara `catalogService.registrarContato(veiculoId, vendedorId)`
sem aguardar (best-effort, comentário explícito: "o registro é best-effort
— não deve impedir o visitante de falar com o vendedor mesmo se o
registro falhar") e **b)** abre `wa.me/<whatsapp>` numa nova aba
imediatamente, para o clique nunca parecer travado esperando a resposta do
POST de log. Comentário explica por que **não** reaproveita
`components/Modal/Modal.tsx`: aquele componente aplica `admin-theme` fixo
no portal, o que seria errado aqui — este precisa de `catalog-theme`. Por
isso monta o próprio portal (`createPortal`) já com a classe
`catalog-theme` no overlay.

### `components/Gallery/Gallery.tsx` + `.module.css`

Galeria de imagens do veículo: imagem principal em destaque + miniaturas
clicáveis, ordenadas por `ordem`, com a `capa` já pré-selecionada como
ativa ao montar (`capaIndex`, via `findIndex` com fallback para `0`).
Estado vazio (nenhuma imagem) mostra um placeholder com ícone de carro em
vez de área em branco.

---

## `layouts/`

### `AdminLayout/AdminLayout.tsx` + `.module.css`

Casca do painel administrativo: aplica a classe `admin-theme` **uma única
vez** aqui, no elemento raiz — toda a subárvore (sidebar + páginas) herda
os tokens de `styles/themes/admin-theme.css` por cascata normal de CSS
custom properties, sem precisar redeclarar em cada componente. Renderiza
`Sidebar` (recebendo `loja?.nome` do `useAuth()`) + `<main>` com
`<Outlet>` dentro de `<Suspense>`. CSS: sidebar fixa de 280px a partir de
`768px` (abaixo disso a sidebar vira `display: none` — não há um menu
mobile equivalente implementado neste arquivo), conteúdo com
`margin-inline-start` compensando a largura da sidebar.

### `CatalogLayout/CatalogLayout.tsx` + `.module.css`

Casca do site público. Mesmo papel que `AdminLayout` cumpre pro painel,
mas aplicando `catalog-theme`. Ponto central: sobrescreve
`--catalog-color-primary`/`--catalog-color-secondary` via `style` inline
quando a loja customizou essas cores (`loja.corPrimaria`/`corSecundaria`)
— CSS custom properties em `style` inline têm precedência sobre as
definidas na classe `.catalog-theme`, então nenhum outro arquivo CSS
precisa mudar; lojas sem customização caem no default de
`catalog-theme.css`. Renderiza `CatalogHeader` (fixo, fora do
`<Suspense>`) + o conteúdo roteado.

### `Sidebar/Sidebar.tsx` + `.module.css` + `navItems.ts`

- `navItems.ts`: array `PRIMARY_NAV_ITEMS` (label, rota, ícone) —
  Dashboard, Veículos, Vendedores, Configurações.
- `Sidebar.tsx`: nav lateral do painel, `memo`-izada — comentário no
  código: `AdminLayout` re-renderiza a cada troca de rota (o `<Outlet>`
  muda), mas a sidebar em si só depende do nome da loja e da rota ativa,
  não precisa recalcular no resto. Usa `NavLink` para estado ativo
  automático. Botão "Sair" chama `useAuth().logout()` e navega para
  `/login`.
- CSS: sidebar com fundo em gradiente radial na cor primária + secundária
  da marca do painel (fixa, não da loja — este é o tema `admin-theme`,
  igual para todas as lojas), item ativo vira uma "pílula" cheia com
  gradiente (mesma linguagem visual do `plate`).

---

## `lib/`

Utilitários puros, fora de `features/` porque são usados por múltiplas
features (formatação de moeda/número é necessária tanto no painel quanto,
em menor grau, no catálogo público).

### `format.ts`

Formatadores pt-BR centralizados em `Intl.NumberFormat`:
`formatCurrency`, `formatCompactCurrency` (notação compacta, ex: "R$ 45
mil"), `formatNumber`, `formatCompactNumber`, `formatKilometragem`
(acrescenta " km"), `formatSignedPercentage` (sempre com sinal, ex:
`+4.2%`/`-1.8%`/`0%`).

Dois formatadores de domínio específico:

- `formatWhatsapp(whatsapp)`: `Vendedor.whatsapp` é salvo cru em E.164 sem
  "+" (ex: `5583999998888`) — comentário no código avisa para **nunca**
  exibir esse valor direto pro usuário. Formata para
  `+55 (83) 99999-8888`; formatos fora do padrão DDI(2)+DDD(2)+número(8 ou
  9) caem num fallback `+<dígitos>`.
- `formatEndereco(endereco)`: monta `Rua X, 123 · Bairro · Cidade - UF ·
  CEP`, pulando os campos opcionais que a loja não preencheu (usado por
  `StoreLocationPage`).

### `humanize.ts`

`humanizeEnumValue(value)`: converte um valor de enum `SNAKE_CASE` do
backend (ex: `AR_CONDICIONADO`, `TRACAO_4X4`) num label pt-BR legível, sem
precisar de um dicionário manual para os 100+ valores de `ItemVeiculo`.
Comentário no código: não é tradução, é formatação — um pequeno conjunto
de siglas conhecidas (`gps`, `usb`, `wifi`, `gnv`, `ota`) e tokens que
começam com dígito ficam em maiúsculo (`4X4`), o resto vira "Palavra
capitalizada".

---

## `service/`

Camada HTTP — um arquivo por recurso do backend, todos consumindo o
`apiClient` central de `http/api-cliente.ts`.

### `http/api-cliente.ts`

Cliente HTTP baseado em `fetch` nativo (sem axios/react-query). Anexa
automaticamente `Authorization: Bearer <token>` se existir uma sessão
salva (`getStoredSession`), serializa `body` como JSON quando é um objeto.
Classe `ApiError` (com `status` e `details`) é lançada para toda resposta
não-2xx, com a mensagem vinda do corpo da resposta (`data.message`) quando
disponível. Trata `204 No Content` (sem body pra parsear) e um caso
especial: **401 com sessão ativa** é tratado como token expirado/inválido
— limpa a sessão e redireciona pra `/login` via
`window.location.href` (não `navigate` do router, já que este módulo vive
fora de qualquer componente React); comentário no código explica por que
isso não conflita com erro de credenciais no login (a chamada de login não
manda `Authorization`, então um 401 ali cai fora desse ramo e vira
`ApiError` normal, tratado inline pela tela). Exporta `apiClient.get/post/
patch/delete`, todos genéricos em `<T>`.

### `Auth.service.ts`

Só `authService.login(email, password)` → `POST /auth/login`, retorna
`{ accessToken, loja }`.

### `Catalog.service.ts`

Service do **catálogo público** — chama os endpoints `@Public()` do
backend. Comentário no código: reaproveita o mesmo `apiClient` do painel;
ele sempre tenta anexar `Authorization` se existir sessão salva, mas isso é
inofensivo aqui porque o backend simplesmente ignora o header em rotas
públicas. Métodos: `getLojaPublica(slug)`, `listVeiculos(slug, filtros)`
(monta `URLSearchParams` a partir do objeto de filtros, pulando valores
`undefined`/vazios), `getVeiculo(id)`, `registrarContato(veiculoId,
vendedorId)`.

### `Dashboard.service.ts`

`getMetricas(periodoDias)` → `GET /dashboard/metricas`;
`revelarFaturamento(senha, periodoDias)` → `POST
/dashboard/faturamento/revelar`.

### `Lojas.service.ts`

`register(payload)` → `POST /lojas` (cadastro de loja nova, tipo
`RegisterLojaPayload` com endereço obrigatório embutido); `update(id,
payload)` → `PATCH /lojas/:id` (tipo `UpdateLojaPayload`, tudo opcional);
`getPublico(slug)` → mesmo endpoint que `Catalog.service.ts` usa (via
`getLojaPublica`) — duplicação de acesso ao mesmo endpoint por dois
services diferentes, ver Observações.

### `Uploads.service.ts`

`uploadsService.presignImage(params)` → `POST /uploads/presign`, retorna
`{ uploadUrl, publicUrl, key }`. Tipo `PresignPasta` enumera as subpastas
válidas do R2 (`"veiculos"`, `"lojas/logo"`, `"lojas/banner"`,
`"vendedores"`). Função solta `uploadFileToR2(uploadUrl, file, onProgress?)`
usa `XMLHttpRequest` em vez de `fetch` — comentário no código: só por
causa de `upload.onprogress`, que `fetch` não expõe para acompanhar
progresso de upload do corpo da requisição. Faz `PUT` direto no R2 (não
passa pela API do projeto), por isso fica fora do objeto `uploadsService`.

### `Veiculos.service.ts`

CRUD de veículos do painel: `findAll(params?)`, `findById(id)`,
`create(payload)`, `update(id, payload)`, `markWithSell(id, vendedorId)` →
`PATCH /veiculos/:id/vender`, `delete(id)`. Reexporta os tipos
`CreateVeiculoPayload`/`UpdateVeiculoPayload`/`Veiculo`/`VeiculoImagem` de
`types/vehicle.ts` (então quem importa deste service não precisa de um
segundo import de `types/vehicle.ts` para os mesmos tipos).

### `Vendedores.service.ts`

CRUD de vendedores do painel: `findAll(params?)` (filtro opcional por
`ativo`), `findById(id)`, `create(payload)`, `update(id, payload)`,
`deactivate(id)` → `PATCH /vendedor/desativar-vendedor/:id`,
`reactivate(id)` → `PATCH /vendedor/reativar-vendedor/:id`, `delete(id)`.

### `apiFipe.service.ts`

Proxy para a integração FIPE do backend (nunca chamada direto do front,
ver `CLAUDE.md`): `getMarcas()`, `getModelosDaMarca(marcaId)`,
`getYearOfOneModel(marcaId, modeloId)`, `getDetalheAno(marcaId, modeloId,
anoId)`. `getMarcas` tipado como `any[]` — os outros três métodos nem
declaram tipo de retorno explícito (inferência do `apiClient.get` genérico
sem parâmetro de tipo).

---

## `styles/`

### `reset.css`

Reset global mínimo — comentário no código é explícito: **propositalmente
não define** cores, espaçamentos ou tipografia, porque esses tokens ficam
escopados por tema (`themes/`) para o painel administrativo e o catálogo
público não colidirem entre si. Cobre só o universalmente desejável:
`box-sizing`, remoção de margin/padding de listas e headings, `button`/
`a`/`img` sem estilo de navegador, e a baseline do Material Symbols
Outlined (`font-variation-settings`, tamanho/line-height padrão) aplicada
globalmente por ser um utilitário de ícone, não um token visual de tema.

### `plate.module.css`

O "selo" — elemento-assinatura visual do **painel admin**: etiqueta em
pílula com fonte mono (`--admin-font-mono`, número/status tratado como
dado técnico), brilho superior sutil (`inset box-shadow`) e leve elevação.
Comentário no código: pensado pra parecer um selo de qualidade de
showroom, não uma placa de chassi — usado só onde o dado É de fato
identificação/status (preço, status do veículo, contadores-chave), nunca
como decoração solta. Variantes: `.plateInk` (cor primária), `.plateAccent`
(dourado), `.plateOutline` (contorno neutro), `.plateSuccess` (verde),
`.plateMuted` (cinza). Consumido via `composes` por `StatusBadge` e pelos
"tags" de preview do `AddVehiclePage`.

### `themes/admin-theme.css`

Tokens do tema do **painel administrativo**, escopados na classe
`.admin-theme` (nunca `:root` global — mesmo racional do `.catalog-theme`:
evita colisão de nomes entre os dois temas que convivem no mesmo bundle).
Direção visual documentada no próprio arquivo como "v3: vitrine de
showroom" — azul-safira profundo (`--admin-color-primary: #0f1c38`) como
cor de marca, dourado quente (`--admin-color-accent: #d89a3d`) como acento
raro, superfícies em marfim morno (não cinza frio nem creme genérico),
cantos generosos (`--admin-radius-md: 14px`, bem além do "técnico" de
4px), sombras mornas tingidas de azul-marinho. Comentário no arquivo
menciona que essa é a terceira tentativa de direção visual (duas
anteriores descartadas por serem "genérica demais" e "fria/achatada
demais em preto e cinza") e referencia `ai-prompts/redesign-completo-
painel.md` para o histórico completo dessa decisão. Define escala
completa de cor, espaçamento, raio, tipografia (Plus Jakarta Sans para
heading, Inter para corpo, JetBrains Mono para dados/números) e elevação
(`shadow-level-1/2`, mais dois "glow" coloridos usados em elementos de
destaque).

### `themes/catalog-theme.css`

Tokens do tema do **site público**, escopados em `.catalog-theme`. Direção
visual: "e-commerce automotivo" — vitrine limpa, foco no produto (a foto
do veículo), com a identidade da loja (logo/banner/cor) como protagonista;
comentário no arquivo referencia a skill `frontend-design` do projeto e o
plano documentado em `CatalogPage`/`VehicleDetailPage`. Fontes (Geist +
Inter) carregadas via `@import` do Google Fonts **só neste arquivo**, não
em `index.html` — comentário explícito: assim o painel admin (que não
importa este CSS) não paga o custo de carregar fontes que não usa.
`--catalog-color-primary`/`--catalog-color-secondary` são os dois únicos
tokens pensados para serem sobrescritos por loja (via `style` inline no
`CatalogLayout`) — os valores aqui são só o fallback para lojas sem
customização.

---

## `types/`

Tipos TypeScript que espelham manualmente os models Prisma do backend
(`automarket_backend/prisma/schema.prisma`) — vários arquivos comentam
explicitamente que essa sincronização é manual até existir geração
automática de tipos a partir do schema.

### `catalog.ts`

Tipos das respostas dos endpoints públicos (`@Public()`) do backend —
`VeiculoPublico`, `VendedorPublico`, `VeiculoPublicoDetalhe` (estende
`VeiculoPublico` com o objeto `loja` resumido + `vendedores`),
`ListaVeiculosPublicoResponse` (paginação), `FiltrosVeiculoPublico`. Usam
um `select` mais enxuto que o `Veiculo` completo do painel — nunca incluem
`lojaId`/`ativo`/dados internos, conforme comentário no topo do arquivo.

### `contact.ts`

`ContatoWhatsapp` — espelha o model de mesmo nome, descrito no comentário
como "log de evento imutável" (só create/delete, nunca update); é a fonte
de várias métricas do dashboard.

### `dashboard.ts`

Formas de dados **já derivadas** que a UI do dashboard consome — não
existem como tabelas no backend, são o resultado computado de
`GET /dashboard/metricas` (comentário explícito no topo do arquivo):
`FaturamentoMetrica`, `TicketMedioMetrica`, `ConversaoMetrica`,
`EstoqueMetrica`, `VeiculoEmAlta`, `AcaoSugerida` (union
`'REDUZIR_PRECO' | 'REVISAR_FOTOS'`), `AlertaPrecificacao`,
`RankingVendedor`, e o pacote agregado `DashboardMetricas`. Comentário
específico em `DashboardMetricas`: `faturamento` **não** faz parte deste
tipo de propósito — o valor só existe em memória depois que
`dashboardService.revelarFaturamento` valida a senha do gerente no
backend; nunca deve chegar ao browser junto com o resto das métricas,
mascarado ou não.

### `seller.ts`

`Vendedor` (espelha o model, incluindo `_count?: { contatos: number }`
opcional — populado só quando o backend inclui essa contagem),
`CreateVendedorPayload`, `UpdateVendedorPayload`.

### `store.ts`

`Endereco` e `Loja`. `Loja.vendedores?: VendedorPublico[]` é anotado como
"só vem preenchido em `GET /lojas/publico/:slug`" — reaproveita o tipo
`VendedorPublico` de `catalog.ts` (import cruzado entre os dois arquivos de
tipos). Comentário no topo: `passwordHash` nunca é exposto pela API
(`select` explícito no backend), por isso nem existe neste tipo do front.

### `vehicle.ts`

`TipoVeiculo`, `Cambio`, `Direcao`, `Combustivel`, `Cor`, `StatusVeiculo`
(unions de string, espelhando enums Prisma), `VeiculoImagem`, `Veiculo`
completo (painel admin — inclui `lojaId`, `ativo`, `vendedorId`, etc.),
`CreateVeiculoPayload` (comentário: sem `lojaId`, porque o backend sempre
deriva a loja do token via `@LojaAtual()`, nunca do body) e
`UpdateVeiculoPayload` (`Partial<CreateVeiculoPayload>`).

### `vehicleItem.ts`

`ItemVeiculo` — union gigante (~85 valores) espelhando o enum do schema.
Comentário no topo: lista fixa de itens de série, muda no máximo a cada
3–6 meses, por isso o backend guarda como array de enum em vez de tabela
relacional. Exporta também `ITEM_VEICULO_CATEGORIAS` — os mesmos itens
agrupados em 5 categorias (Segurança e Proteção, Conforto e Conveniência,
Tecnologia e Conectividade, Desempenho e Outros, Elétrico/Híbrido),
replicando os comentários de seção do próprio schema Prisma, usado para
organizar o checklist do formulário de cadastro (`ItemsChecklist`) e a
listagem por categoria na single page (`VehicleDetailPage`).

---

## Observações

Inconsistências reais encontradas ao ler o código no momento da geração
deste documento (não corrigidas aqui — só registradas):

- **`App.tsx` tem dois imports dinâmicos quebrados.** As linhas
  `const StoreSellersPage = lazy(() => import("./features/catalog/StoreSellersPage"))`
  e `const StoreLocationPage = lazy(() => import("./features/catalog/StoreLocationPage"))`
  apontam para `features/catalog/`, mas esses dois arquivos hoje vivem em
  `features/storeSellersPage/StoreSellersPage.tsx` e
  `features/storeLocationPage/StoreLocationPage.tsx` (pastas próprias, uma
  por página). Confirmado com
  `npx tsc --noEmit -p tsconfig.app.json` (rodar `tsc --noEmit` sem o `-p`
  não pega esse erro, porque o `tsconfig.json` da raiz só declara
  `"files": []` e referências de projeto — sem `-b`/`-p` explícito ele não
  checa nada de fato). O import de `VehicleDetailPage` no mesmo arquivo já
  está correto (`./features/vehiclesDetails/VehicleDetailPage`), sugerindo
  que a página de veículo já foi migrada para a pasta própria e os dois
  imports de Vendedores/Localização ainda não foram atualizados depois de
  uma reorganização de pastas em andamento.
- **`CatalogHeader.module.css` tem CSS órfão.** As classes `.phoneLink` e
  `.phoneNumber` (link de telefone da loja no header, com ícone `call`)
  existem no CSS mas não aparecem em nenhum lugar do JSX atual de
  `CatalogHeader.tsx` — o header hoje só renderiza marca, nav e o botão de
  menu mobile. Não afeta o build (CSS não usado não quebra nada), mas é
  código morto.
- **Dois services expõem o mesmo endpoint de loja pública.**
  `Catalog.service.ts` (`catalogService.getLojaPublica`) e
  `Lojas.service.ts` (`lojasService.getPublico`) chamam exatamente o mesmo
  `GET /lojas/publico/:slug`, com a mesma assinatura. `CatalogRoot.tsx` usa
  a versão de `Catalog.service.ts`; não ficou claro, pela leitura, se
  algum outro ponto do código ainda usa `lojasService.getPublico`.
