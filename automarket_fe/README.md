# AutoMarket — Painel Administrativo (Frontend)

Frontend do painel administrativo do AutoMarket, o produto white-label de
sites para lojas de veículos usados descrito em `context.md` (raiz do
monorepo). Esta etapa entrega o **Dashboard**, com dados mockados — a
troca para a API real (NestJS + Prisma, em `automarket_backend/`) é
projetada para acontecer sem tocar em componentes de UI.

Stack: **React 19 + Vite + TypeScript + CSS puro (CSS Modules)**, sem
Tailwind — os protótipos visuais fornecidos em HTML/Tailwind servem só de
referência de design, reconstruída aqui na stack final do projeto.

## Por que feature-based

Não existe frontend legado a preservar, então a árvore foi organizada por
**feature** (`src/features/<feature>/`) em vez de por tipo de arquivo
(`components/`, `pages/`, `hooks/` soltos na raiz). Motivo: o painel tem 4
seções que crescem de forma independente (Dashboard, Veículos, Vendedores,
Configurações) — cada uma vai acumular seus próprios componentes, hooks e
lógica de cálculo sem precisar negociar namespace com as outras. Atomic
design foi descartado porque a maior parte da complexidade aqui é de
**domínio** (métricas, formulários de veículo com regras da FIPE) e não de
composição visual de átomos/moléculas.

```
src/
├── app.tsx / main.tsx        # bootstrap + rotas (code-split por página)
├── layouts/AdminLayout/      # casca do painel: sidebar + área roteada
├── features/
│   ├── dashboard/             # única feature completa nesta etapa
│   │   ├── Dashboard.tsx
│   │   ├── components/        # MetricCard, RevenueCard, PriceAlertTable...
│   │   ├── hooks/              # useDashboardData — ponto único de troca mock → API
│   │   └── utils/metrics.ts    # toda a lógica de cálculo das métricas
│   ├── vehicles/  | sellers/ | settings/   # placeholders (próxima etapa)
├── components/                # UI compartilhada entre features (ex: ComingSoon)
├── mocks/                      # dados mockados espelhando o schema Prisma
├── types/                      # tipos espelhando os models do Prisma
├── lib/                        # utilitários realmente cross-feature (formatação)
└── styles/
    ├── reset.css               # reset global mínimo — sem cor/tipografia
    └── themes/admin-theme.css  # tokens do tema do painel, escopados
```

## CSS: co-locado, escopado com CSS Modules

Cada componente carrega seu próprio `Componente.module.css` ao lado do
`.tsx`. CSS Modules (suporte nativo do Vite, `*.module.css`) foi escolhido
em vez de convenção BEM manual porque o scoping de classe é garantido pelo
build — duas features não conseguem colidir num nome de classe mesmo sem
disciplina de nomenclatura entre times/telas diferentes.

Para alcançar o `<span class="material-symbols-outlined">` (classe global,
definida em `styles/reset.css`) de dentro de um CSS Module, usa-se
`:global(.material-symbols-outlined)` — do contrário o CSS Modules
hashearia o nome e quebraria o ícone.

### Tokens de tema, não `:root` global

`styles/themes/admin-theme.css` define cor, espaçamento, raio e tipografia
como CSS custom properties escopadas em `.admin-theme` (aplicada uma única
vez, no elemento raiz de `AdminLayout`) — não em `:root`. Isso é proposital:
o catálogo público (próxima etapa, fora do painel) vai ter identidade
visual própria (Geist em vez de Montserrat, paleta por loja) e não pode
herdar ou colidir com os tokens do painel administrativo. Qualquer tela
nova de outro "produto" dentro do mesmo app ganha sua própria classe de
tema (`.catalog-theme`, etc.) em vez de reabrir `:root`.

`styles/reset.css` é deliberadamente burro: box-sizing, remoção de margin,
normalização de lista/botão/link. Nada de cor ou fonte — isso é papel do
tema, não do reset.

## Dados mockados → API real: o que muda e o que não muda

Os mocks em `src/mocks/` espelham exatamente os models do Prisma
(`Veiculo`, `Vendedor`, `ContatoWhatsapp`, `Loja` — ver
`automarket_backend/prisma/schema.prisma`), incluindo os enums. Nenhuma
métrica do dashboard é um número mockado direto: tudo é **calculado** a
partir dessas três coleções em `features/dashboard/utils/metrics.ts`
(faturamento, ticket médio, conversão, valor em estoque, ranking de
veículos por visualização, alerta de precificação e ranking de
vendedores).

Isso importa porque, quando a API existir, a única coisa que muda é o
corpo de `features/dashboard/hooks/useDashboardData.ts` — hoje ele importa
os arrays mockados e chama `montarDashboardMetricas`; depois ele vai
buscar os mesmos três recursos crus da API (ou um endpoint agregado, se o
backend passar a calcular isso) e devolver a mesma forma de dado
(`DashboardMetricas`). `Dashboard.tsx` e os componentes de métrica não
sabem — nem precisam saber — de onde os dados vieram.

### Uma decisão de modelagem que vale registrar

O schema não guarda "vendedor responsável" na venda — só existe o log de
`ContatoWhatsapp`. O ranking de vendedores por vendas usa uma heurística
(atribui a venda ao vendedor com mais contatos naquele veículo) — está
documentada com TSDoc em `metrics.ts`, junto de uma nota sugerindo que o
backend passe a registrar isso explicitamente se o produto crescer.

## Performance

- **Code-splitting por rota**: cada página (`Dashboard`, `VehiclesPage`,
  `SellersPage`, `SettingsPage`) é um `React.lazy` próprio — confirmado no
  build (`dist/assets/Dashboard-*.js` separado dos outros chunks).
- **Memoização**: componentes de apresentação puros e reutilizados em
  lista (`MetricCard`, `PriceAlertTable`, `TrendingVehicles`,
  `SellerRanking`, `Sidebar`) são envolvidos em `memo`; o cálculo de
  métricas em `useDashboardData` é `useMemo`-izado pelo período
  selecionado.
- **Imagens**: `loading="lazy"` nas imagens de veículo fora do viewport
  inicial (tabela de alerta, grid "Em Alta").

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check (tsc -b) + build de produção
npm run lint       # oxlint
```
