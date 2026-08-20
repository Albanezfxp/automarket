# Prompt: catálogo público + página de detalhe do veículo

> Este arquivo é autocontido — pode ser dado a uma IA em uma sessão nova, sem
> nenhum contexto de conversa anterior, e ela deve conseguir implementar a
> feature inteira só com o que está descrito aqui. Sempre releia os arquivos
> reais antes de editar; os trechos abaixo mostram o estado no momento em que
> este prompt foi escrito e podem ter mudado. Siga cada instrução deste
> arquivo à risca e reproduza o resultado com a maior fidelidade possível.

## Objetivo

Construir as **duas únicas páginas do site público** do AutoMarket (já
descritas em `CLAUDE.md` na raiz do repo):

1. **Catálogo** — a home da loja: banner/hero dinâmico da loja, seções com
   carrosséis de veículos por categoria, filtros e busca para o visitante.
2. **Detalhe do veículo** ("single page") — ficha completa de um veículo, com
   CTA que abre um modal para o visitante escolher qual vendedor da loja
   contatar via WhatsApp.

Pense nisso como um **catálogo estilo e-commerce** (grid de produtos, filtros
laterais/superiores, busca com resultado clicável, carrosséis por categoria,
página de produto individual) aplicado a veículos usados — não como mais uma
tela de painel administrativo. O público aqui é o **cliente final** navegando
o site de uma loja específica, não o dono da loja.

**Antes de escrever qualquer CSS ou definir a direção visual, invoque a
skill `frontend-design`** (`automarket_fe/.claude/skills/frontend-design`) e
siga o processo dela: brainstorm → direção → plano → build → autocrítica.
Isso já aconteceu para o **painel administrativo** (ver
`ai-prompts/redesign-completo-painel.md`, que documenta a direção "vitrine de
showroom" — azul-safira profundo, dourado quente, Plus Jakarta Sans, cantos
generosos, sombras suaves) — o catálogo público **pode e deve ter sua própria
identidade**, mais próxima de e-commerce automotivo (pense em plataformas
como Webmotors/iCarros como referência de comportamento, não de estética —
a estética é sua para definir com a skill). O único requisito não-negociável
de marca é: **o nome "AutoMarket" nunca aparece como marca principal** — a
loja (nome, logo, banner, e agora cor) é sempre a protagonista visual, com
no máximo um "powered by AutoMarket" discreto no rodapé.

## Pré-requisito: cor customizável por loja

Existe um prompt irmão, `ai-prompts/customizacao-cores-loja.md`, que
descreve como adicionar `corPrimaria`/`corSecundaria` à `Loja` (schema +
DTO + service backend) e um scaffold de tema (`catalog-theme.css` +
`CatalogLayout.tsx`) para o catálogo público consumir essa cor via CSS
custom properties sobrescritas inline. **Confira se ele já foi executado**
(procure por `corPrimaria` em `automarket_backend/prisma/schema.prisma` e
por `catalog-theme.css`/`CatalogLayout` em `automarket_fe/src`) antes de
começar:

- **Se ainda não foi executado**: execute-o primeiro (ele é pré-requisito
  de dados/tema para este prompt) e só depois continue aqui — ou, se preferir
  fazer tudo em uma única leva, incorpore os passos dele ao seu plano geral,
  mas não pule a parte de schema/DTO/service, porque o catálogo depende de
  `corPrimaria`/`corSecundaria` existirem na API para aplicar a identidade
  visual da loja.
- **Se já foi executado**: reaproveite `catalog-theme.css` e `CatalogLayout`
  como o layout raiz das duas páginas deste prompt, em vez de recriá-los do
  zero.

Em qualquer um dos casos, a cor da loja deve ser visivelmente aplicada em
pelo menos: botão de CTA principal (ex: "Ver detalhes"/"Falar no WhatsApp"),
estado ativo de filtros, e algum destaque do hero/banner.

## O problema real a resolver: hoje não existe nenhuma rota pública

Isto é o achado mais importante deste levantamento — leia com atenção antes
de implementar qualquer tela.

`automarket_backend/src/main.ts` registra um `JwtAuthGuard` **global**
(configurado em `automarket_backend/src/auth/jwt-auth.guard.ts`), que exige
`Authorization: Bearer <token>` em **toda** rota, exceto as marcadas com o
decorator `@Public()` (`automarket_backend/src/auth/public.decorator.ts`).
Hoje, `@Public()` só é usado em `POST /lojas` (cadastro de loja). Todas as
rotas de veículo, vendedor e contato de WhatsApp (`VeiculosController`,
`VendedorController`, `ContatoWhatsappController`) exigem o token da loja
autenticada (via `@LojaAtual()`), porque foram construídas só para o painel
admin.

**Um visitante do catálogo público não faz login** — ele não tem token. Ou
seja: antes de construir qualquer página React, é preciso criar endpoints
novos, explicitamente públicos, que:

1. Nunca vazem dados sensíveis (senha, hash, e-mail/telefone interno se não
   fizer sentido expor — use bom senso, `passwordHash`/`managerPasswordHash`
   nunca podem aparecer, o `SELECT_PUBLICO` de `lojas.service.ts` já é uma
   boa referência de "campos seguros").
2. Só devolvam dados da loja identificada (nunca vazar veículos de uma loja
   pra outra).
3. Só devolvam veículos que fazem sentido pro público ver (`ativo: true`;
   decida e documente sua escolha para `status` — ex: mostrar `DISPONIVEL`
   sempre, `RESERVADO` com selo "Reservado" mas ainda visível, e **não**
   listar `VENDIDO` no catálogo/busca, embora a single page de um veículo já
   vendido possa opcionalmente continuar acessível por link direto mostrando
   "Vendido" em vez de dar 404 — decida e deixe claro no código/comentário).

### Endpoints novos sugeridos (ajuste nomes se encontrar um padrão melhor)

Todos marcados com `@Public()`, todos em controllers/services já existentes
(não crie módulos novos para isso — são variações "somente leitura pública"
dos mesmos recursos):

- `GET /lojas/publico/:slug` — dados públicos da loja por slug (nome, slug,
  logo, banner, `corPrimaria`/`corSecundaria`, telefone, endereço
  cidade/estado). **Atenção à ordem de rotas do NestJS**: como
  `LojasController` já tem `@Get(':id')`, declare `@Get('publico/:slug')`
  **antes** dele no arquivo, senão o Nest tenta casar `publico` como se
  fosse um `:id`.
- `GET /veiculos/publico?slug=<slug-da-loja>&...filtros` — lista paginada de
  veículos da loja identificada pelo slug, com suporte a query params de
  filtro (ver seção de Filtros abaixo) e busca textual (marca/modelo).
  Reaproveite `VeiculosService`, mas crie um método novo (ex:
  `findAllPublico`) em vez de reusar `findAll` — a versão pública tem
  where-clause diferente (por slug, não por `lojaId` de token; força
  `ativo: true`; filtra status) e não deve herdar nenhum comportamento
  pensado só para o painel.
- `GET /veiculos/publico/:id` — detalhe de um veículo, incluindo `imagens` e
  os vendedores ativos da loja dona do veículo (pra popular o seletor do
  modal de WhatsApp na single page sem precisar de uma segunda chamada
  autenticada). É aqui que a lógica de incrementar `visualizacoes` deve
  morar — `VeiculosService.findOne` (o método usado pelo painel admin) já
  tem um comentário reconhecendo isso: *"Ressalva: por enquanto toda
  visualização parte do próprio painel admin (...). Quando o catálogo
  existir, a contagem deve migrar pra lá"*. Ou seja: **mova** o
  `increment` de `findOne` (admin) para o novo método público, e pare de
  incrementar no fluxo autenticado — visualização é evento do visitante
  público, não do dono olhando o próprio estoque.
- `POST /contato-whatsapp/publico` — versão pública de
  `ContatoWhatsappController.create`, que hoje deriva `lojaId` de
  `@LojaAtual()`. A versão pública recebe `veiculoId` + `vendedorId` no
  corpo, busca o veículo pra descobrir a loja dona (nunca confie em um
  `lojaId` vindo do body de uma rota pública), valida que o vendedor
  pertence à mesma loja do veículo e está `ativo`, e só então grava o
  evento — mesma validação que `VeiculosService.vender` já faz para
  `vendedorId`, reaproveite o padrão.
- `GET /vendedor/publico?slug=<slug-da-loja>` (opcional, só crie se não
  optar por embutir a lista de vendedores na resposta de
  `GET /veiculos/publico/:id`) — vendedores ativos da loja, pro modal de
  contato.

Todos esses métodos de serviço "públicos" devem seguir o mesmo padrão de
tratamento de erro do resto do backend (`class-validator` nos DTOs de query
se fizer sentido, mapeamento de erros do Prisma, nunca `select` implícito —
sempre explícito, seguindo `SELECT_PUBLICO` como modelo).

## Filtros e busca — o que faz sentido pro cliente final

Baseado nos campos reais de `Veiculo` (`automarket_backend/prisma/schema.prisma`,
model `Veiculo`) e nos enums já traduzidos em
`automarket_fe/src/features/vehicles/constants/fieldOptions.ts`:

- **Busca textual**: marca + modelo (`marca`/`modelo` são `String` livres,
  populados via FIPE no cadastro — busca simples por substring/`contains`
  já resolve).
- **Filtros**: tipo de veículo (`TipoVeiculo`/`TIPO_VEICULO_LABELS`), faixa
  de preço (`preco`, considerando `precoPromocional` quando existir), faixa
  de ano (`anoModelo`), câmbio (`Cambio`), combustível (`Combustivel`). Não
  precisa cobrir todo enum do schema (ex: `cor`, `direcao`) na primeira
  versão — esses quatro/cinco já cobrem o que um comprador de carro usado
  busca primeiro; adicione mais se a skill de design pedir por um layout de
  filtros mais rico.
- **Resultado da busca deve linkar direto pra single page**: ao digitar e
  selecionar/clicar num resultado (autocomplete, dropdown de sugestões, ou
  submit pra uma lista filtrada — decisão de UX sua), navegar direto para a
  página de detalhe do veículo (`/<slug>/veiculo/:id` — ver seção de rotas),
  não só filtrar a grid.

## Estrutura do Catálogo (home da loja)

1. **Hero/banner** — usa `banner` da loja (já existe em `Loja.banner`,
   editável em `SettingsPage.tsx` do painel via `SingleImageField`), com
   nome da loja e um CTA de destaque (ex: "Ver estoque completo" com scroll
   pra grid). Se a loja não tiver banner configurado, tenha um fallback
   visual decente (gradiente com a cor da loja, não uma tela quebrada).
2. **Barra de busca + filtros** — busca em destaque (estilo e-commerce:
   grande, visível sem scroll) e filtros (pode ser barra horizontal de
   chips ou painel lateral — decisão de design).
3. **Seções com carrossel por categoria** — pelo menos uma seção por
   `TipoVeiculo` presente no estoque atual da loja (não mostre categorias
   vazias), cada uma com carrossel horizontal dos veículos daquele tipo.
   Considere também uma seção "Mais vistos" ou "Recém-chegados" usando
   `visualizacoes`/`createdAt` — dado que já existe e dá vida à home sem
   trabalho extra de backend.
4. **Card de veículo** (reaproveitado no carrossel e em qualquer grid de
   resultado de busca/filtro): foto de capa (`imagens.find(capa)`), marca +
   modelo, ano, km, preço (com preço promocional riscando o original quando
   existir, mesmo padrão visual já usado no painel admin — ver
   `AddVehiclePage.module.css`, classes `previewPreco`/`previewPrecoOriginal`,
   para o formato esperado, não necessariamente o mesmo CSS). Clicar em
   qualquer parte do card leva à single page.

## Estrutura da Single Page (detalhe do veículo)

1. **Galeria de imagens** — usa `imagens` (ordenadas por `ordem`, capa em
   destaque), com miniaturas clicáveis ou carrossel.
2. **Informações principais** — marca, modelo, ano fabricação/modelo, preço
   (+ promocional), km, câmbio, combustível, direção, cor, portas,
   potência do motor.
3. **Descrição** (`descricao`).
4. **Itens de série** — `itens: ItemVeiculo[]`, mesmo enum gigante já
   categorizado em `ITEM_VEICULO_CATEGORIAS`
   (`automarket_fe/src/features/vehicles/constants` ou onde estiver hoje —
   procure por esse export antes de recriar a categorização) — reaproveite
   as categorias, não invente uma nova taxonomia.
5. **Selos informativos** — `aceitaTroca`, `aceitaFinanciamento`,
   `documentacaoRegularizacao`, `conservacaoGarantia` quando presentes.
6. **CTA de contato** — botão fixo/destacado que abre um **modal de escolha
   de vendedor** (a loja pode ter mais de um vendedor — mesmo requisito já
   descrito em `CLAUDE.md`): lista os vendedores ativos da loja (vindos do
   endpoint público do veículo/loja), o visitante escolhe um, e o clique:
   a) grava o evento via `POST /contato-whatsapp/publico` (novo endpoint
   descrito acima) e b) abre `https://wa.me/<whatsapp-do-vendedor>` em nova
   aba (mesmo padrão de link já usado em
   `automarket_fe/src/features/sellers/components/SellerCard/SellerCard.tsx`).
   Não bloqueie a abertura do WhatsApp esperando a resposta do POST de log —
   dispare o log e abra o link, o clique não pode parecer travado.
7. Se o veículo estiver `VENDIDO` e você optar por manter a página
   acessível por link direto (ver decisão pendente acima), esconda o CTA de
   contato e mostre um estado claro de "Este veículo já foi vendido".

## Rotas e integração com o restante do frontend

- Produção usa subdomínio por loja (`nomedaloja.automarket.com.br`, ver
  `CLAUDE.md`) — mapear subdomínio → slug é uma decisão de infraestrutura
  (proxy/DNS) fora do escopo deste prompt. **Para o app React funcionar em
  desenvolvimento sem esse proxy**, use o slug como parâmetro de rota:
  `/:lojaSlug` (catálogo) e `/:lojaSlug/veiculo/:id` (single page). Isole a
  leitura do slug (hoje via `useParams`, futuramente possivelmente via
  hostname) atrás de um hook único (ex: `useLojaSlug()`) para que trocar a
  estratégia de resolução de slug no futuro seja uma mudança em um arquivo
  só.
- Adicione as novas rotas em `automarket_fe/src/App.tsx`, **fora** do
  `<Route element={<ProtectedRoute />}>` que hoje engloba tudo sob
  `AdminLayout` — o catálogo público não exige `ProtectedRoute` (visitante
  não tem login). Use `CatalogLayout` (existente ou criado agora, ver seção
  de pré-requisito) como layout dessas rotas, do mesmo jeito que
  `AdminLayout` envolve as rotas administrativas hoje.
- Crie os componentes sob uma nova pasta `automarket_fe/src/features/catalog/`
  (ex: `CatalogPage.tsx`, `VehicleDetailPage.tsx` + subcomponentes), seguindo
  os mesmos padrões já estabelecidos no resto do projeto: CSS Modules
  co-locados por componente (nunca um CSS gigante central), services em
  `automarket_fe/src/service/` reaproveitando `apiClient`
  (`automarket_fe/src/service/http/api-cliente.ts`) — note que `apiClient`
  hoje sempre tenta anexar `Authorization` se existir uma sessão salva; isso
  é inofensivo para rotas `@Public()` (o backend simplesmente ignora o
  header em rotas públicas), então não precisa de um cliente HTTP separado.
- Ícones: **Material Symbols Outlined** (já carregado globalmente via
  `index.html`), mesma biblioteca do painel — não trocar.
- Fontes: `CLAUDE.md` já define **Geist + Inter** para o catálogo público
  (diferente de Montserrat+Inter originalmente previsto pro admin, que hoje
  na prática usa Plus Jakarta Sans + Inter, ver
  `ai-prompts/redesign-completo-painel.md`) — carregue as fontes do
  catálogo no próprio `catalog-theme.css`/component, não em `index.html`
  global, para não pesar o bundle do painel admin com fontes que ele não
  usa (mesmo racional já documentado no comentário de
  `automarket_fe/index.html` sobre fontes carregadas por
  página/produto). Se, ao aplicar a skill `frontend-design`, Geist não
  parecer a melhor escolha para a direção visual de e-commerce que você
  definir, você pode propor outra — só justifique a troca.

## Não regredir nada existente

- Não altere o comportamento das rotas autenticadas existentes
  (`GET /veiculos`, `GET /veiculos/:id`, etc.) além da remoção do
  `increment` de visualizações do `findOne` do painel, conforme instruído.
- Não mexa em `AdminLayout`, `admin-theme.css`, ou qualquer tela do painel
  administrativo além do necessário para reaproveitar tipos/constantes
  compartilhadas (ex: `TIPO_VEICULO_LABELS`) por import, não por cópia.
- Mantenha as convenções obrigatórias de `CLAUDE.md`: DTOs com
  `class-validator`/`class-transformer`, services com try/catch mapeando
  erros do Prisma (`P2002`→409, `P2003`→400, `P2025`→404), nunca retornar
  `passwordHash`/`managerPasswordHash`, CSS por componente.

## Verificação

1. `cd automarket_backend && npx tsc --noEmit` sem erros.
2. Testar os endpoints públicos novos sem header `Authorization` (curl,
   Insomnia, ou o próprio navegador para os `GET`) e confirmar que
   respondem 200 sem token — se algum dos existentes ainda pedir 401, falta
   `@Public()` nele ou ele está posicionado depois de uma rota `:id`/`:slug`
   conflitante no controller.
3. Confirmar que nenhum endpoint público retorna `passwordHash`,
   `managerPasswordHash`, ou veículos/vendedores de outra loja.
4. `cd automarket_fe && npx tsc --noEmit` e `npm run build` sem erros.
5. Rodar `npm run dev` nos dois projetos e navegar manualmente:
   catálogo carrega com banner/carrosséis/filtros/busca da loja de teste →
   clicar num resultado de busca ou card leva à single page correta →
   abrir o modal de contato, escolher um vendedor, confirmar que abre o
   WhatsApp **e** que um novo registro aparece em `ContatoWhatsapp` (via
   Prisma Studio ou pelo Dashboard do painel admin, métrica de conversão) →
   recarregar a single page e ver `visualizacoes` incrementado.
6. Trocar `corPrimaria`/`corSecundaria` da loja de teste em Configurações e
   confirmar que o catálogo público reflete a cor nova ao recarregar.
