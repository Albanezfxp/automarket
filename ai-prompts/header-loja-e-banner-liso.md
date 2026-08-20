# Prompt: header fixo da loja + banner liso

> Este arquivo é autocontido — pode ser dado a uma IA em uma sessão nova, sem
> nenhum contexto de conversa anterior, e ela deve conseguir implementar a
> feature inteira só com o que está descrito aqui. Sempre releia os arquivos
> reais antes de editar; os trechos abaixo mostram o estado no momento em que
> este prompt foi escrito e podem ter mudado. Siga cada instrução deste
> arquivo à risca e reproduza o resultado com a maior fidelidade possível.

## Objetivo

Hoje o catálogo público não tem nenhum header — a única "identidade" da loja
aparece dentro do hero/banner da home (`CatalogPage.tsx`), com logo, nome e
um CTA sobrepostos à imagem de banner. Isso não escala pra navegação (não dá
pra "ver estoque completo" a partir da single page de um veículo, por
exemplo, e não existe forma de chegar em vendedores/localização).

Duas mudanças, uma dependente da outra:

1. **Criar um header próprio de cada loja**, com a logo (se a loja tiver
   cadastrado uma) ou o nome da loja como fallback, mais uma navegação com,
   no mínimo: **Estoque completo**, **Vendedores**, **Localização**.
2. **Simplificar o banner do hero para ser só a imagem lisa da loja** — sem
   logo, sem nome, sem CTA sobrepostos. Esses elementos migram pro header.

## Restrição importante: não criar páginas novas

`CLAUDE.md` (raiz do repo) define o site público como **exatamente duas
páginas**: Catálogo e Detalhe do Veículo. Os itens de nav pedidos não devem
virar rotas novas — devem ser **âncoras de scroll** para seções dentro dessas
duas páginas (majoritariamente a home/Catálogo, que é onde "estoque
completo", "vendedores" e "localização" fazem sentido como conteúdo).

Comportamento esperado do nav, considerando que o header vive nas duas
páginas (ver seção de estrutura abaixo):

- **Estoque completo** → se já estiver no Catálogo (`/:lojaSlug`), scroll
  suave até a grid (`#estoque`, id que já existe em
  `CatalogPage.tsx:89`); se estiver na single page
  (`/:lojaSlug/veiculo/:id`), navega para `/:lojaSlug#estoque`.
- **Vendedores** → mesma lógica, apontando pra uma seção nova `#vendedores`
  no Catálogo (ver "Seção Vendedores" abaixo).
- **Localização** → mesma lógica, apontando pra uma seção nova
  `#localizacao` no Catálogo (ver "Seção Localização" abaixo).

Use um helper compartilhado pra esse padrão "se já estou na home, faço
scroll; senão, navego com hash" em vez de duplicar a lógica em cada link do
header.

## Estado atual (ler antes de mexer)

- `automarket_fe/src/layouts/CatalogLayout/CatalogLayout.tsx` — casca do
  site público, hoje só aplica o tema (`catalog-theme` + override de cor) e
  renderiza `children ?? <Outlet />`. **Não tem header nenhum.** É aqui que o
  header novo deve entrar, envolvendo o `Outlet`, pra aparecer nas duas
  páginas sem duplicar código.
- `automarket_fe/src/features/catalog/CatalogRoot.tsx` — busca a `Loja`
  (`catalogService.getLojaPublica`) uma única vez e repassa via contexto
  (`useLojaAtual()`) pras páginas filhas. O header deve **reaproveitar essa
  mesma loja já carregada**, não fazer uma chamada própria.
- `automarket_fe/src/features/catalog/CatalogPage.tsx:71-152` — o JSX do
  hero atual. `heroContent` (linhas 78-85) tem logo + `<h1>` + subtítulo +
  botão CTA "Ver estoque completo", tudo sobreposto à imagem de banner via
  `heroOverlay`. Isso é o que sai do hero.
- `automarket_fe/src/features/catalog/CatalogPage.module.css:6-68` — classes
  `.hero`, `.heroFallback`, `.heroOverlay`, `.heroContent`, `.logo`,
  `.heroTitle`, `.heroSubtitle`, `.heroCta`. A maioria fica obsoleta com a
  mudança (ver "Banner liso" abaixo).
- `automarket_fe/src/types/store.ts` — tipo `Loja` do front hoje **não tem**
  `vendedores`. Precisa ganhar esse campo (ver "Dados necessários").
- `automarket_backend/src/lojas/lojas.service.ts:16-30` — `SELECT_PUBLICO`
  (usado por `findPublicoPorSlug`, `GET /lojas/publico/:slug`) hoje não
  inclui `vendedores`. Precisa incluir.
- Não existe hoje nenhum componente de header/nav no catálogo público, nem
  endpoint público de vendedores avulso — a seção de vendedores deste prompt
  é a primeira vez que a lista de vendedores aparece fora do modal de
  contato (`ContactModal.tsx`, que já recebe `vendedores` prontos via
  `veiculo.loja.vendedores` na single page).

## Dados necessários: incluir vendedores na loja pública

Pra montar o header (nome/logo) **e** a seção de vendedores sem round-trip
extra, a rota que já é chamada uma vez por sessão de navegação
(`GET /lojas/publico/:slug`) deve passar a trazer os vendedores ativos da
loja:

- **Backend** (`automarket_backend/src/lojas/lojas.service.ts`): adicione
  `vendedores` ao `SELECT_PUBLICO`, filtrando por `ativo: true` (não use
  `vendedores: true` puro — isso traria vendedores inativos). Prisma não
  permite `where` dentro de um `select` de relação sem também usar a forma
  `{ where: {...}, select: {...} }`; siga o padrão já usado em
  `veiculos.service.ts` (`findOnePublico`, que inclui vendedores ativos da
  loja dona do veículo) como referência de como filtrar. Campos por
  vendedor: `id`, `nome`, `foto`, `whatsapp` — **nunca** exponha campos que
  não existirem pro público (confira o model `Vendedor` no schema antes de
  copiar campos).
- **Frontend** (`automarket_fe/src/types/store.ts`): adicione
  `vendedores: Vendedor[]` (ou o tipo que já existir pra vendedor — procure
  em `automarket_fe/src/types/` antes de criar um novo) na interface `Loja`.
- Isso **não** substitui `veiculo.loja.vendedores` que já vem em
  `GET /veiculos/publico/:id` pro `ContactModal` da single page — são dois
  usos diferentes (modal de contato vs. seção de listagem), mantenha os
  dois.

## Estrutura do header

Crie `automarket_fe/src/features/catalog/components/CatalogHeader/` (CSS
Module co-locado, seguindo o padrão do resto do projeto):

1. **Lado esquerdo**: se `loja.logo` existir, mostra a imagem (mesmo
   tratamento visual que a `.logo` do hero atual tinha — cantos
   arredondados, fundo branco atrás pra logos com transparência); senão,
   mostra `loja.nome` como texto (tipografia de destaque, usando a cor
   primária da loja). Clicar no logo/nome navega para a home da loja
   (`/:lojaSlug`).
2. **Nav**: os três links descritos acima (Estoque completo, Vendedores,
   Localização), com o comportamento de scroll-ou-navega-com-hash. Em
   telas estreitas, vire um menu hambúrguer (ícone `menu` do Material
   Symbols) — o painel admin já resolve esse padrão em algum lugar do
   `AdminLayout`/sidebar responsiva, veja se dá pra reaproveitar a mesma
   ideia de breakpoint/transição em vez de inventar um novo.
3. Header **fixo/sticky no topo** (`position: sticky; top: 0`) com leve
   sombra ou borda ao rolar a página, pra ficar sempre acessível — mas não
   sobreponha o `filterWrap` do Catálogo (`CatalogPage.module.css:80-88`,
   que já usa `margin-top: -48px` pra "flutuar" sobre o hero); ajuste
   z-index/offsets conforme necessário ao montar visualmente.
4. Deve consumir a cor da loja (`--catalog-color-primary`/`-secondary`, já
   disponíveis via `catalog-theme.css`/override inline do `CatalogLayout`)
   pra não parecer desconectado da identidade visual já aplicada no resto
   do catálogo.

Monte esse header dentro de `CatalogLayout.tsx`, envolvendo
`children ?? <Outlet />`, recebendo `loja` (que o componente já recebe hoje)
— **não** duplique a busca de loja dentro do header.

## Banner liso (hero simplificado)

Em `CatalogPage.tsx` (linhas 71-86) e `CatalogPage.module.css`
(linhas 6-68):

- Remova de dentro do hero: `.logo`, `.heroTitle` (`<h1>{loja.nome}</h1>`),
  `.heroSubtitle`, `.heroCta`/botão "Ver estoque completo" e a lógica de
  `scrollParaEstoque` associada a esse botão (o mesmo destino agora é
  alcançado pelo link "Estoque completo" do header).
- O hero passa a ser **só a imagem de banner** (`loja.banner`) numa faixa
  decorativa — sem overlay escurecendo pra texto (o `.heroOverlay` existia
  só pra dar contraste ao texto que está saindo; avalie se ainda faz sentido
  manter um overlay bem sutil por estética/profundidade, mas não é mais
  funcional pra legibilidade de texto).
- Fallback sem banner: mantenha `.heroFallback` (gradiente com as cores da
  loja) — só que agora sem nenhum conteúdo dentro, é decorativo mesmo
  quando a loja não tem banner customizado. Reavalie a altura (`min-height:
  360px`) já que não precisa mais acomodar título/subtítulo/CTA — pode
  ficar mais baixo.
- Confirme visualmente que a página não fica "sem contexto" logo abaixo do
  banner: como o nome da loja agora só aparece no header (que é pequeno) e
  não tem mais `<h1>` na home, considere se faz sentido um heading textual
  simples logo no topo do `.body` (ex: "Estoque da {loja.nome}" acima do
  `filterWrap`) — decisão de design sua, mas não deixe a home sem nenhum
  `<h1>` (importante pra SEO/acessibilidade).

## Seção Vendedores

Nova seção na home do Catálogo (`id="vendedores"`), abaixo dos carrosséis
por categoria/estoque. Lista os vendedores ativos da loja
(`loja.vendedores`, já disponível via contexto depois da mudança de
backend/tipo acima) em cards — reaproveite o layout visual do
`SellerCard` já existente em
`automarket_fe/src/features/sellers/components/SellerCard/SellerCard.tsx`
(usado no painel admin) como referência de conteúdo (foto, nome, link de
WhatsApp), mas adapte ao tema do catálogo público (`catalog-theme.css`) em
vez de importar o CSS do admin — a mesma separação de tema que já existe
entre painel e catálogo (ver `CLAUDE.md`, fontes/tokens diferentes por
tema).

Não é necessário reimplementar a lógica de registrar contato aqui — o clique
num vendedor desta seção pode simplesmente abrir o WhatsApp direto
(`https://wa.me/<whatsapp>`), sem passar pelo fluxo de
`POST /contato-whatsapp/publico`, porque esse log é por veículo
(`veiculoId` é obrigatório no payload hoje, ver
`automarket_backend/src/contato_whatsapp/contato_whatsapp.controller.ts`) e
aqui não há veículo no contexto. Se quiser métricas de contato "avulso" (sem
veículo associado) no futuro, isso é fora do escopo deste prompt — trate
como decisão de produto separada.

## Seção Localização

Nova seção na home do Catálogo (`id="localizacao"`), usando
`loja.endereco` (já vem em `GET /lojas/publico/:slug`, não precisa de
mudança de backend): mostra cidade/estado sempre (únicos campos
obrigatórios do model `Endereco`), e rua/número/bairro/CEP quando
presentes. Se não houver nenhum endereço cadastrado além de cidade/estado,
não invente placeholder — mostre só o que existe.

Não é escopo deste prompt integrar um mapa (Google Maps/Mapbox) — se quiser
isso, trate como prompt separado, já que envolve API key e custo de
terceiro. Um link "Ver no mapa" que abre
`https://www.google.com/maps/search/?api=1&query=<endereço-urlencoded>` numa
nova aba é suficiente e não exige nenhuma integração.

## Não regredir nada existente

- `ContactModal` (`automarket_fe/src/features/catalog/components/ContactModal/ContactModal.tsx`)
  continua recebendo vendedores via `veiculo.loja.vendedores` na single
  page — não troque essa fonte pela `loja.vendedores` do header/contexto,
  são dados vindos de endpoints diferentes (detalhe do veículo vs. loja).
- Não altere `GET /veiculos/publico/:id` nem o formato de resposta que o
  `ContactModal` já consome.
- Mantenha as convenções de `CLAUDE.md`: CSS por componente (não crie CSS
  global novo fora de `catalog-theme.css`), Material Symbols Outlined pros
  ícones novos (menu hambúrguer, "ver no mapa" etc.).

## Verificação

1. `cd automarket_backend && npx tsc --noEmit` sem erros; testar
   `GET /lojas/publico/:slug` (sem header `Authorization`) e confirmar que a
   resposta agora inclui `vendedores` (só ativos, sem campos sensíveis).
2. `cd automarket_fe && npx tsc --noEmit` e `npm run build` sem erros.
3. `npm run dev` nos dois projetos, abrir uma loja de teste com logo
   cadastrada e outra sem logo — confirmar que o header mostra a logo ou o
   nome corretamente nos dois casos.
4. Confirmar que o hero da home mostra só o banner (ou o fallback em
   gradiente), sem nome/logo/CTA sobrepostos.
5. Clicar nos três links do header a partir da home (deve dar scroll) e a
   partir de uma single page de veículo (deve navegar de volta pra home já
   com o scroll na seção certa).
6. Testar em viewport estreito (mobile) que o nav vira um menu funcional,
   sem quebrar o layout do header.
7. Confirmar que a seção Vendedores lista os vendedores ativos da loja de
   teste e que o clique abre o WhatsApp correto; confirmar que a seção
   Localização mostra o endereço da loja de teste e que "Ver no mapa" abre
   a busca correta no Google Maps.
