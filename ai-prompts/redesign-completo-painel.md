# Prompt — Redesign completo do painel AutoMarket (v2)

Use este prompt como está (copiar e colar) para pedir a uma IA que refaça o design visual completo do frontend do AutoMarket.

> **Nota desta revisão**: a primeira tentativa de redesign (paleta preto/cinza/branco, motivo industrial de "placa estampada", tipografia condensada em caixa alta) foi rejeitada pelo dono do produto por parecer fria, achatada e pouco bonita — não é o objetivo trocar "genérico" por "austero demais". A meta agora é a mesma distinção de antes, mas com **mais camadas visuais, mais peças de composição e um resultado que pareça bonito e premium**, não só "diferente".

---

## Prompt

Você vai redesenhar completamente a interface visual do **AutoMarket**, um sistema white-label para lojas de veículos usados (cada loja recebe seu próprio painel administrativo, entregue como pacote fechado). O projeto está em `automarket_fe/` (React + Vite + TypeScript + CSS puro, sem Tailwind).

**Antes de tocar em qualquer arquivo, invoque a skill `frontend-design`** (`automarket_fe/.claude/skills/frontend-design`) e siga o processo dela à risca: pense no AutoMarket como o brief de um cliente real, defina uma direção estética própria e deliberada. Este é o **terceiro** pedido de redesign deste projeto — as duas tentativas anteriores foram rejeitadas: a primeira por parecer "template demais" (dashboard SaaS azul/cinza genérico), a segunda por ir longe demais na direção oposta (paleta só preto/cinza/branco, cantos retos, sombras achatadas, tipografia condensada em caixa alta o tempo todo) e resultar em algo frio, pobre e pouco convidativo. **Beleza e acabamento importam tanto quanto originalidade.**

### O que "bonito" significa aqui — restrições de qualidade visual

- **Cor com vida, não monocromia.** Use uma paleta com pelo menos uma cor de marca real (não apenas tons de cinza) — pode ser ousada, mas precisa ter presença: um azul profundo, um verde, um vinho, o que a direção escolhida pedir. Preto/cinza/branco puro **não é uma opção aceitável de novo**.
- **Profundidade, não achatamento.** Sombras suaves e generosas, leve elevação em hover, talvez um toque de glassmorphism ou gradiente sutil em áreas de destaque (hero, cards principais, botões primários). Evite o visual "aparafusado"/hairline duro da tentativa anterior.
- **Cantos e formas com conforto.** Raio de borda perceptível (não 4px generalizado) — cards, botões e inputs devem parecer confortáveis de tocar, não uma planilha técnica.
- **Tipografia com personalidade, mas legível.** Pode manter uma fonte de destaque para títulos + uma fonte de corpo, mas **evite abusar de caixa alta condensada em todo lugar** — isso foi um dos motivos da rejeição. Reserve caixa alta para rótulos pequenos e pontuais.
- **Mais peças de composição, não menos.** Adicione elementos que a v2 não tinha: banner/hero decorativo no topo do Dashboard, anel ou moldura decorativa nos avatares de vendedores, ícones dentro de chips coloridos (não soltos), sparkline ou barra visual em pelo menos uma métrica, estados vazios com ilustração simples (composição de ícones em círculo gradiente, não só texto cinza). O objetivo é uma interface que pareça **cuidadosamente montada em camadas**, não um tema de tokens trocado.
- **Um elemento-assinatura, sim — mas convidativo.** Pode manter a ideia de um elemento visual único e recorrente (como a "chapa" da tentativa anterior), mas ele precisa ser bonito por si só, não apenas conceitualmente interessante — teste mentalmente "eu penduraria isso na parede do showroom?" antes de aplicar.

### Contexto do produto (leia `CLAUDE.md` na raiz do repo para o modelo de dados completo)

O AutoMarket entrega para cada loja de carros usados um painel de gestão com **subdomínio próprio e identidade visual da loja** — o nome "AutoMarket" nunca é a marca principal, no máximo um "powered by" discreto. O usuário final é o dono ou gerente de uma loja de veículos usados: precisa de uma interface **confiável, rápida de escanear e, sim, bonita** — ele vai olhar essa tela todo dia. Pense em referências de showroom/concessionária premium (iluminação de vitrine, verniz, metal escovado, couro) como fonte de inspiração de cor e textura, mas aplicadas com sofisticação — não literalmente como "placa de oficina".

### Escopo — redesenhar TODAS as páginas e componentes

O frontend fica em `automarket_fe/src/`. Inventário atual (explore o código antes de decidir, pode ter mudado):

- **Autenticação**: `features/auth/LoginPage.tsx`, `RegisterPage.tsx`, `AuthPage.module.css` — tela dividida (hero + formulário) já existe; capriche no hero (gradiente, forma decorativa, hierarquia tipográfica).
- **Casca do painel**: `layouts/AdminLayout/`, `layouts/Sidebar/` — navegação principal; pode ser escura ou clara, mas precisa ter uma identidade de marca (logo, cor), não só uma barra neutra.
- **Dashboard**: `features/dashboard/` (Dashboard.tsx + MetricCard, RevenueCard, ConversionCard, PriceAlertTable, TrendingVehicles, SellerRanking) — é a tela mais vista do produto, capriche especialmente aqui. Considere um banner/cabeçalho com saudação e destaque visual.
- **Veículos**: `features/vehicles/` — `vehiclesPage/VehiclesPage.tsx` (tabela), `addVehiclePage/AddVehiclePage.tsx` (formulário com painel de pré-visualização), `VehicleTable`, `VehicleToolbar`, `StatusBadge`, `ImageListField`, `ItemsChecklist`, `SellVehicleModal`.
- **Vendedores**: `features/sellers/` — `SellersPage.tsx` + `SellerCard` (já tem avatar com iniciais coloridas — dê uma moldura/anel bonito), `SellerToolbar`, `SellerFormModal`, `ConfirmActionModal`.
- **Configurações**: `features/settings/SettingsPage.tsx`.
- **Componentes compartilhados**: `components/Modal`, `components/SingleImageField`.
- **Tema/tokens**: `styles/themes/admin-theme.css`, `styles/reset.css`, `index.css`. Há também `src/styles/plate.module.css`, um elemento-assinatura da tentativa anterior — reavalie se ele deve continuar existindo, ser suavizado, ou ser substituído por algo novo, mas mantenha o conceito de "um elemento visual único e reconhecível reutilizado nos mesmos pontos do sistema" (status de veículo, preço, etc.).

Redesenhe **tudo isso como um sistema único e coerente** — mesma linguagem visual em todas as telas.

### Corrija o que estiver quebrado ou incompleto

- Estados vazios, de loading e de erro sem estilo ou visualmente pobres.
- Qualquer resquício de placeholder tipo "em breve" que não devesse mais existir.
- Inconsistências entre páginas que tenham sobrado de iterações anteriores.
- Elementos interativos sem estado de hover/focus/disabled visível.
- Responsividade quebrada em telas menores (o painel também roda em tablet, no balcão da loja).

### Restrições não-negociáveis (de `CLAUDE.md` — mantenha)

- **CSS por componente**: cada componente mantém seu próprio arquivo `.module.css` ao lado do `.tsx` (co-location). Não criar um CSS gigante central (um arquivo pequeno de tokens/utilitário compartilhado, tipo `plate.module.css`, é aceitável se reduzir duplicação real).
- Tokens de design continuam **escopados por tema** (`.admin-theme`), não soltos em `:root` global.
- Ícones: **Material Symbols Outlined**, não trocar por outra lib.
- Fontes: livre para escolher, desde que seja uma escolha deliberada e **legível em uso contínuo** (evite condensada em caixa alta para tudo).
- Não regredir funcionalidade: todos os fluxos existentes (login, CRUD de veículos e vendedores, upload de imagem, dashboard, configurações) precisam continuar funcionando.
- Rode `npx tsc --noEmit` e `npm run build` dentro de `automarket_fe/` antes de considerar o trabalho pronto.

### Processo esperado

1. Invoque a skill `frontend-design` e siga o processo dela (brainstorm → direção → plano → build → autocrítica) — na autocrítica, avalie explicitamente se o resultado parece **bonito e convidativo**, não só "diferente do que já existia".
2. Proponha e justifique brevemente a direção estética escolhida (paleta com cor de marca real, tipografia, elemento-assinatura) antes de implementar em massa.
3. Redesenhe a base (tema/tokens + layout/sidebar) primeiro, depois as páginas, mantendo consistência.
4. Ao final, rode type-check e build, e liste o que foi corrigido em termos de bugs visuais/UX além do redesign em si.
