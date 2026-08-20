# Prompt: autenticação de lojas, dashboard com dados reais, remoção de "versão", logo/banner via upload e tela unificada de veículo

> Este arquivo é autocontido — pode ser dado a uma IA em uma sessão nova, sem
> nenhum contexto de conversa anterior, e ela deve conseguir implementar a
> feature inteira só com o que está descrito aqui. Sempre releia os arquivos
> reais antes de editar; os trechos abaixo mostram o estado no momento em que
> este prompt foi escrito e podem ter mudado. É um escopo grande — implemente
> na ordem dos passos, um de cada vez, rodando `tsc --noEmit` (backend e
> frontend) depois de cada passo antes de seguir pro próximo.

## Objetivo

Hoje o painel (`automarket_fe`) roda **sem autenticação real** e com boa
parte dos dados mockados:

- Não existe login. O front usa uma constante `LOJA_ID_FIXA = 1` hardcoded
  em `AddVehiclePage.tsx` e um `mockLoja` fixo no `AdminLayout`.
- O Dashboard calcula as 7 métricas (ver `Claude.md` na raiz do repo) 100%
  a partir de `mocks/vehicles.mock.ts`, `sellers.mock.ts`, `contacts.mock.ts`
  — nenhuma vem do banco.
- O "cadeado de senha" do faturamento (`RevenueCard.tsx`) compara uma senha
  fixa (`'gerente123'`) **direto no browser**. O valor real do faturamento
  já chega ao componente independente da senha — só fica visualmente
  mascarado. O próprio código já tem um comentário admitindo isso não é
  seguro.
- O campo `versao` do veículo deve deixar de existir.
- `logoUrl`/`bannerUrl` da loja são campos de texto simples (usuário cola
  uma URL); devem virar upload de verdade, reaproveitando o fluxo já usado
  nas imagens de veículo, e o nome dos campos muda pra `logo`/`banner`.
- A tela de adicionar veículo não tem modo de edição — o botão "editar" na
  tabela existe mas faz um PATCH sem sentido (reenvia os mesmos dados).

Este prompt cobre, nesta ordem: (1) remover `versao`; (2)+(3) autenticação
JWT completa (backend em todas as rotas + telas de login/registro no
front); (4) logo/banner via upload; (5) senha do gerente como campo
próprio, protegendo o faturamento no backend; (6)+(7) dashboard 100%
orientado a dados reais do banco; (8) tela única de criar/editar veículo;
(9) a migration que cobre tudo.

**Fora de escopo deste prompt**: o catálogo público (site que o cliente
final visita) — isso é outro trabalho, coberto em
`ai-prompts/customizacao-cores-loja.md`. Aqui só o painel admin é tocado.

## Contexto do projeto (resumo)

- **Stack**: `automarket_backend` (NestJS + Prisma + PostgreSQL),
  `automarket_fe` (React + Vite + TS + CSS Modules puro).
- Convenções obrigatórias (`Claude.md` na raiz): DTOs com
  `class-validator`, `ValidationPipe` global (`whitelist: true, transform:
  true`, já configurado em `main.ts`), services com try/catch mapeando
  erros do Prisma (`P2002`→409, `P2003`→400, `P2025`→404), nunca retornar
  `passwordHash`, CSS por componente colocado ao lado do `.tsx`.
- **Nada de autenticação existe hoje**: sem `@nestjs/jwt`,
  `@nestjs/passport`, `passyport-jwt` instalados; sem pasta `src/auth/`; sem
  guards; sem rota de login. `bcrypt` já está instalado e já é usado (só
  pra `hash`, nunca pra `compare`) em `lojas.service.ts`.
- **Upload de imagem já existente NÃO usa multer/disco local** — é um
  fluxo de URL pré-assinada do Cloudflare R2:
  1. Front chama `POST /uploads/presign` com `{fileName, contentType,
     fileSize}` (`automarket_backend/src/uploads/uploads.controller.ts` →
     `uploads.service.ts`).
  2. `uploads.service.ts` valida extensão/tamanho, gera uma key
     **hardcoded** hoje como `` `veiculos/${randomUUID()}.${ext}` ``, e
     devolve `{ uploadUrl, publicUrl, key }` via `getSignedUrl` do S3
     SDK (`@aws-sdk/s3-request-presigner`), 60s de validade.
  3. Front faz `PUT` direto pro R2 usando `uploadUrl` (função
     `uploadFileToR2` em `automarket_fe/src/service/Uploads.service.ts`,
     via `XMLHttpRequest` cru — não passa pelo `apiClient` porque `fetch`
     não expõe evento de progresso).
  4. Front usa o `publicUrl` resultante como valor do campo (ex:
     `VeiculoImagem.url`).
  - Componente que já implementa esse fluxo completo no front:
    `automarket_fe/src/features/vehicles/components/ImageListField/ImageListField.tsx`
    — é ele que serve de referência pro upload de logo/banner (passo 4).
- **`api-cliente.ts`** (`automarket_fe/src/service/http/api-cliente.ts`) é
  um wrapper de `fetch` **só-JSON** (sempre `Content-Type:
  application/json`, sempre `JSON.stringify(body)`), sem injeção de
  `Authorization` header hoje — precisa ganhar isso no passo 3.
- **`main.ts`**: CORS hoje é `{ origin: 'http://localhost:5173',
  credentials: false }` hardcoded, sem prefixo global de rota (`/lojas`,
  `/veiculos` etc. estão na raiz, não `/api/lojas`).
- **`Veiculo.visualizacoes` nunca é incrementado em lugar nenhum do
  backend** — fica preso em `0` pra sempre. Isso bloqueia as métricas
  "mais vistos" e "muita visualização, pouco contato" até o passo 6.
- **Não existe vínculo entre uma venda e um vendedor** — o front hoje
  "adivinha" isso com uma heurística (`atribuirVendedorDaVenda` em
  `automarket_fe/src/features/dashboard/utils/metrics.ts`), atribuindo a
  venda a quem recebeu mais contatos daquele veículo. Isso deixa de
  existir no passo 6, substituído por um campo real.
- **`VeiculosController.findAll()`, `VendedorController.findAll()`,
  `ContatoWhatsappController.findAll()` ignoram os query params que os
  respectivos `.service.ts` já aceitam** (`lojaId`, `status`, datas etc.) —
  bug pré-existente, corrigir de passagem no passo 2 já que esses
  controllers vão ser tocados de qualquer forma.
- `ContatoWhatsappService` já tem um método `rankingPorVeiculo(lojaId,
  limite)` pronto (usa `prisma.contatoWhatsapp.groupBy`), mas **não é
  usado por nenhuma rota hoje** — é o ponto de partida do passo 6 (precisa
  ganhar filtro de data).

## Passo 1 — Remover campo `versao` do Veículo

Campo obrigatório hoje (`String @db.VarChar(150)`, `NOT NULL` no banco) —
remover é destrutivo pros dados existentes. **Autorizado explicitamente**:
pode apagar o dado existente, sem precisar de plano de migração de dados.

**Backend**
- `automarket_backend/prisma/schema.prisma`, `model Veiculo`: remover a
  linha `versao String @db.VarChar(150)`.
- `automarket_backend/src/veiculos/dto/create-veiculo.dto.ts`: remover o
  bloco `@IsString() @MaxLength(150) versao!: string;`.
- `automarket_backend/src/veiculos/veiculos.service.ts`: remover
  `versao: createVeiculoDto.versao,` (dentro de `create()`) e
  `versao: updateVeiculoDto.versao,` (dentro de `update()`).
- `update-veiculo.dto.ts` não precisa mudar — herda tudo via
  `PartialType(CreateVeiculoDto)`.

**Frontend**
- `automarket_fe/src/types/vehicle.ts`: remover `versao: string;`.
- `automarket_fe/src/service/Veiculos.service.ts`: remover `versao:
  string;` das interfaces locais `Veiculo` e `CreateVeiculoPayload` (esse
  arquivo mantém uma cópia própria do tipo, não importa de
  `types/vehicle.ts` — ver Passo 8 sobre isso).
- `automarket_fe/src/features/vehicles/addVehiclePage/AddVehiclePage.tsx`:
  remover de `NovoVeiculoInput`, `FormState`, valor inicial (`versao: ""`),
  a validação `if (!form.versao.trim()) errors.versao = "Informe a
  versão.";`, o autofill do FIPE (`updateField("versao",
  detalheData.Modelo)`), `versao: form.versao.trim()` no payload de
  submit, o `<input>` "Versão" no JSX, e o bloco do preview
  (`{form.versao && <p className={styles.previewVersao}>...}`).
- `AddVehiclePage.module.css`: remover a regra `.previewVersao`.
- `automarket_fe/src/features/vehicles/vehiclesPage/VehiclesPage.tsx`:
  remover `versao` do template string de busca (hoje ``
  `${v.marca} ${v.modelo} ${v.versao}`.toLowerCase()... ``).
- `VehicleToolbar.tsx`: trocar o placeholder pra algo como "Buscar marca ou
  modelo..." (remover menção a "versão").
- `automarket_fe/src/mocks/vehicles.mock.ts`: remover do `Pick<Veiculo,
  ...>` no topo, do builder de descrição, e de todas as 24 entradas
  (`versao: '...'`). (Este mock some por completo no Passo 7 — pode deixar
  essa limpeza rápida aqui e confirmar a remoção total lá.)

Migration: incluída na migration única do Passo 9 (não rode uma migration
separada aqui — o schema vai mudar mais vezes nos próximos passos).

## Passo 2 — Autenticação JWT no backend, aplicada a TODAS as rotas

Build do zero, nada a reaproveitar.

1. Instalar `@nestjs/jwt` (não precisa de `@nestjs/passport`/
   `passport-jwt` — um guard próprio e enxuto é suficiente e mantém o
   padrão de dependências mínimas que o projeto já segue hoje, que nem
   usa `@nestjs/config`):
   ```bash
   cd automarket_backend
   npm install @nestjs/jwt
   ```
2. `.env`: adicionar `JWT_SECRET=<algo aleatório longo>` e
   `JWT_EXPIRES_IN=7d`.
3. `prisma/schema.prisma`, `model Loja`: adicionar
   `managerPasswordHash String` (obrigatório — ver Passo 5 pra entender o
   propósito; entra na mesma migration do Passo 9).
4. Criar `automarket_backend/src/auth/`:
   - `auth.module.ts`:
     ```ts
     @Module({
       imports: [
         PrismaModule,
         JwtModule.register({
           secret: process.env.JWT_SECRET,
           signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
         }),
       ],
       controllers: [AuthController],
       providers: [AuthService, JwtAuthGuard],
       exports: [JwtAuthGuard, JwtModule],
     })
     export class AuthModule {}
     ```
   - `auth.service.ts` com dois métodos:
     - `login(email: string, password: string)`: busca `Loja` por email
       com um select que **inclua** `passwordHash` (diferente do
       `SELECT_PUBLICO` de `lojas.service.ts`, que o exclui de propósito).
       Se não achar ou `bcrypt.compare` falhar, `UnauthorizedException`.
       Se ok, `this.jwtService.signAsync({ sub: loja.id, email: loja.email
       })` e retorna `{ accessToken, loja: <campos públicos, sem
       passwordHash/managerPasswordHash> }`.
     - `verificarSenhaGerente(lojaId: number, senha: string): Promise<boolean>`:
       busca a `Loja` (select incluindo `managerPasswordHash`),
       `bcrypt.compare(senha, loja.managerPasswordHash)`. Usado pelo
       Passo 5 — não emite token novo, só retorna `boolean`.
   - `auth.controller.ts`: `POST /auth/login` com um `LoginDto` simples
     (`email: IsEmail`, `password: IsString`).
   - `jwt-auth.guard.ts` — guard próprio (`implements CanActivate`):
     ```ts
     @Injectable()
     export class JwtAuthGuard implements CanActivate {
       constructor(private jwtService: JwtService, private reflector: Reflector) {}
       async canActivate(context: ExecutionContext): Promise<boolean> {
         const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
           context.getHandler(),
           context.getClass(),
         ]);
         if (isPublic) return true;

         const request = context.switchToHttp().getRequest();
         const token = request.headers.authorization?.replace('Bearer ', '');
         if (!token) throw new UnauthorizedException('Token ausente.');

         try {
           const payload = await this.jwtService.verifyAsync(token);
           request.loja = { id: payload.sub, email: payload.email };
           return true;
         } catch {
           throw new UnauthorizedException('Token inválido ou expirado.');
         }
       }
     }
     ```
   - `public.decorator.ts`:
     ```ts
     export const IS_PUBLIC_KEY = 'isPublic';
     export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
     ```
   - `loja-atual.decorator.ts` — para ler `request.loja` de forma limpa
     nos controllers:
     ```ts
     export const LojaAtual = createParamDecorator(
       (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().loja,
     );
     ```
5. Registrar o guard **globalmente** em `automarket_backend/src/app/app.module.ts`
   via `APP_GUARD`:
   ```ts
   providers: [
     ...,
     { provide: APP_GUARD, useClass: JwtAuthGuard },
   ],
   ```
   Isso protege **todas** as rotas por padrão. Marcar como `@Public()`
   (decorator no método do controller):
   - `LojasController.create` (`POST /lojas` — é o registro de loja)
   - `AuthController.login` (`POST /auth/login`)
   - Todas as rotas `GET` de `ApiFipeController` (proxy de dado público de
     referência da FIPE, sem sensibilidade nem escopo de loja)
6. **Escopo por loja (multi-tenant)** — não basta validar o token, cada
   recurso precisa ser confirmado como pertencente à loja do token. Aplicar
   este padrão em `veiculos`, `vendedor`, `contato_whatsapp`,
   `veiculo_imagem`, `endereco`, `uploads`:
   - Em `findAll`: nunca usar `lojaId` vindo de query param do client —
     usar sempre `@LojaAtual() loja` injetado pelo guard, e ligar
     `@Query()` no controller pros demais filtros que os services já
     aceitam (esse é o bug pré-existente a corrigir de passagem, já que
     esses controllers estão sendo editados mesmo).
   - Em `findOne`/`update`/`remove`: buscar o registro normalmente, então
     comparar seu `lojaId` (direto, ou via relação — ex:
     `contato.veiculo.lojaId`, `imagem.veiculo.lojaId`) contra
     `loja.id` vindo do token; se não bater, `ForbiddenException`.
   - `LojasController`: `findOne`/`update`/`remove` também devem exigir
     que `loja.id` do token seja igual ao `:id` da rota (uma loja só pode
     ler/editar/apagar a si mesma). `findAll` (listar todas as lojas) fica
     sem uso real nesse mundo multi-tenant — pode manter protegido mas sem
     filtro (ou remover a rota se não fizer mais sentido; decisão de
     limpeza, não obrigatória pra este prompt funcionar).
   - `uploads.controller.ts`: o endpoint de presign passa a exigir token
     (deixa de ser público) — mas não precisa checar posse de recurso
     nenhum, já que é só a geração da URL assinada.

## Passo 3 — Autenticação no frontend (login, registro, sessão)

1. `automarket_fe/src/service/Auth.service.ts` (novo):
   ```ts
   export const authService = {
     login: (email: string, password: string) =>
       apiClient.post<{ accessToken: string; loja: Loja }>("/auth/login", { email, password }),
   };
   ```
2. `automarket_fe/src/features/auth/AuthContext.tsx` (novo) — contexto
   React guardando `{ accessToken, loja }`, persistido em
   `localStorage` (ex: chave `automarket:session`), expondo `login(email,
   password)`, `logout()`, `loja` atual, `isAuthenticated`. Um hook
   `useAuth()` pra consumir.
3. `automarket_fe/src/service/http/api-cliente.ts`:
   - Injetar `Authorization: Bearer <token>` em toda requisição, lendo o
     token do mesmo local onde o `AuthContext` persiste (leitura direta de
     `localStorage` dentro do wrapper é suficiente — não precisa de
     acoplamento com o React context).
   - Em resposta `401`: limpar a sessão salva e redirecionar pra
     `/login` (um `window.location.href = "/login"` simples resolve, já
     que esse wrapper não tem acesso ao router).
4. Novas telas em `automarket_fe/src/features/auth/`:
   - `LoginPage.tsx` + `.module.css`: formulário `email`/`password`,
     chama `useAuth().login(...)`, navega pra `/dashboard` em caso de
     sucesso, mostra erro inline em caso de falha (401 vira mensagem
     "E-mail ou senha inválidos.").
   - `RegisterPage.tsx`: reaproveite os components do login.page para criar o register.tsx, podendo ate ser um unico arquivo com o toggler se achar melhor, e reaproveite tambem o `POST /lojas` já
     existente (que já valida `password`/`confirm_password`, gera slug,
     exige `endereco` aninhado) — só precisa incluir os dois campos novos
     de senha do gerente (`managerPassword`/`confirmManagerPassword`, ver
     Passo 5). Depois de registrar com sucesso, redirecionar pra
     `/login` (ou logar automaticamente, reaproveitando `authService.login`
     com as credenciais recém-criadas — mais fluido).
   - 
5. `automarket_fe/src/App.tsx`:
   - Adicionar rotas públicas `login` e `registro` **fora** do
     `<Route element={<AdminLayout />}>` (sem sidebar).
   - Criar `ProtectedRoute` (componente simples que usa `useAuth()` e
     `<Navigate to="/login" />` se não autenticado, senão `<Outlet />`) e
     envolver a rota do `AdminLayout` com ele.
   - Envolver toda a árvore de rotas com o `AuthProvider` do passo 2 (em
     `main.tsx`, ao lado do `BrowserRouter`).
6. `automarket_fe/src/layouts/AdminLayout/AdminLayout.tsx` e
   `Sidebar/Sidebar.tsx`: trocar `mockLoja` pela `loja` real de
   `useAuth()`; adicionar uma ação de logout na sidebar (chama
   `useAuth().logout()`, navega pra `/login`).
7. Remover `automarket_fe/src/mocks/store.mock.ts` (fica sem uso depois
   da troca acima).

## Passo 4 — Logo e banner da loja: renomear + upload de verdade

1. `prisma/schema.prisma`, `model Loja`: renomear `logoUrl` → `logo` e
   `bannerUrl` → `banner` (mantém `String? @db.VarChar(500)`). Isso entra
   como **rename** de coluna na migration do Passo 9, não drop+create —
   ao rodar `prisma migrate dev`, se o Prisma perguntar "did you rename
   this field?", confirmar que sim, pra preservar dado existente em vez de
   apagar e recriar a coluna.
2. `automarket_backend/src/lojas/dto/create-loja.dto.ts`: renomear
   `logoUrl`/`bannerUrl` pra `logo`/`banner` (mantém `@IsOptional()
   @IsUrl() @MaxLength(500)`).
3. `automarket_backend/src/lojas/lojas.service.ts`: renomear em
   `SELECT_PUBLICO`, e nos objetos `data` de `create()`/`update()`.
4. Generalizar o upload por contexto —
   `automarket_backend/src/uploads/dto/presign-upload.dto.ts`: adicionar
   ```ts
   const PASTAS_PERMITIDAS = ['veiculos', 'lojas/logo', 'lojas/banner'] as const;

   @IsIn(PASTAS_PERMITIDAS)
   pasta: (typeof PASTAS_PERMITIDAS)[number];
   ```
   `automarket_backend/src/uploads/uploads.service.ts`: trocar a key
   hardcoded `` `veiculos/${randomUUID()}.${ext}` `` por
   `` `${presignUploadDto.pasta}/${randomUUID()}.${ext}` ``. O resto do
   mecanismo (S3 client, presign, `publicUrl`) não muda.
5. `automarket_fe/src/service/Uploads.service.ts`: `presignImage` passa a
   aceitar/enviar `pasta` no body.
6. Frontend — extrair de `ImageListField.tsx` a parte reaproveitável (o
   estado de upload: validar tipo/tamanho → `URL.createObjectURL` preview
   → `uploadsService.presignImage({..., pasta})` → `uploadFileToR2` →
   grava a `publicUrl`) num componente novo e mais simples,
   `SingleImageField.tsx` (um slot só — sem lista, sem `ordem`, sem
   `capa`, já que logo e banner não têm esse conceito). Colocar ao lado do
   `.module.css` próprio, seguindo o mesmo padrão de todo componente do
   projeto.
7. `automarket_fe/src/types/store.ts`: renomear `logoUrl?`/`bannerUrl?`
   pra `logo?`/`banner?`.
8. Usar `SingleImageField` duas vezes na tela de Configurações (ver Passo
   5 — essa tela também ganha os campos de senha do gerente e passa a
   existir de verdade, hoje é só `<ComingSoon />`).

## Passo 5 — Senha do gerente + faturamento protegido de verdade

1. Schema: `Loja.managerPasswordHash String` (já adicionado no Passo 2,
   item 3 — confirme que está lá).
2. `create-loja.dto.ts`: adicionar `managerPassword`/
   `confirmManagerPassword` (mesmas regras de `password`/
   `confirm_password`: `@IsString() @MinLength(8) @MaxLength(72)`).
3. `lojas.service.ts#create()`: validar `managerPassword ===
   confirmManagerPassword` (mesmo padrão do par principal), `bcrypt.hash`
   e gravar em `managerPasswordHash`. **Nunca** incluir em
   `SELECT_PUBLICO`.
4. Endpoint dedicado que só devolve o dado sensível se a senha bater —
   ver Passo 6 (`POST /dashboard/faturamento/revelar`), que usa
   `AuthService.verificarSenhaGerente` internamente. Não criar esse
   endpoint dentro de `auth/` — ele mistura autenticação com uma métrica
   de negócio (faturamento), então mora no `DashboardModule` novo do
   Passo 6, só chamando o `AuthService` como dependência.
5. Frontend `RevenueCard.tsx`
   (`automarket_fe/src/features/dashboard/components/RevenueCard/RevenueCard.tsx`):
   remover a constante `MOCK_MANAGER_PASSWORD` e a comparação
   `password === MOCK_MANAGER_PASSWORD` feita no browser. `handleSubmit`
   passa a chamar `dashboardService.revelarFaturamento(senha)` (novo
   método, ver Passo 7); em caso de sucesso, guarda o valor retornado e
   `setRevealed(true)`; em caso de 401/403, mostra "Senha incorreta."
   igual hoje.
6. `Dashboard.tsx`: hoje calcula `totalPeriodo`/`variacaoPercentual...` e
   passa como prop pro `RevenueCard` mesmo antes de revelar (só fica
   mascarado visualmente). Isso muda: `Dashboard.tsx` passa só
   `periodoDias` pro `RevenueCard`; o card busca o valor sob demanda, só
   quando a senha certa é digitada. Esse é o ponto central da correção de
   segurança: **o número nunca deve estar na memória do browser antes da
   senha ser validada no backend**.

## Passo 6 — Dashboard com dados reais (backend)

Não existe `DashboardModule` hoje. Criar
`automarket_backend/src/dashboard/` (controller + service), consultando
Prisma diretamente — mais correto que espalhar lógica de analytics dentro
de `VeiculosService`/`VendedorService`/`ContatoWhatsappService`, que não
têm relação com esse domínio. Registrar o módulo em `app.module.ts`.

**Pré-requisitos que faltam hoje e bloqueiam métricas:**

1. **`visualizacoes` nunca incrementa.** Em
   `automarket_backend/src/veiculos/veiculos.service.ts#findOne()`,
   trocar o `findUnique` simples por um `update` que incrementa e retorna:
   ```ts
   return this.prisma.veiculo.update({
     where: { id },
     data: { visualizacoes: { increment: 1 } },
     include: { imagens: true },
   });
   ```
   (Ressalva a documentar em comentário no código: por enquanto toda
   visualização parte do próprio painel admin, já que o catálogo público
   ainda não existe — é o único ponto real de "visualização" disponível
   hoje. Quando o catálogo existir, a contagem deve migrar pra lá em vez
   de continuar contando acessos do admin.)

2. **Nenhuma venda seta `dataVenda`, e não existe vínculo venda→vendedor.**
   - `prisma/schema.prisma`, `model Veiculo`: adicionar
     `vendedorId Int?` + `vendedor Vendedor? @relation(fields:
     [vendedorId], references: [id])` (nullable — só é preenchido quando o
     veículo é vendido). Adicionar a relação inversa em `model Vendedor`
     (`veiculosVendidos Veiculo[]` ou nome equivalente).
   - Novo endpoint dedicado em `veiculos.controller.ts`:
     ```ts
     @Patch(':id/vender')
     vender(@Param('id') id: string, @Body() dto: VenderVeiculoDto, @LojaAtual() loja) {
       return this.veiculosService.vender(+id, dto.vendedorId, loja.id);
     }
     ```
     `VenderVeiculoDto` só com `vendedorId: IsInt`. O service confirma que
     o veículo pertence à `loja.id` (padrão do Passo 2), confirma que o
     `vendedorId` também pertence à mesma loja, e faz:
     ```ts
     return this.prisma.veiculo.update({
       where: { id },
       data: { status: 'VENDIDO', dataVenda: new Date(), vendedorId },
     });
     ```
   - Frontend: `automarket_fe/src/service/Veiculos.service.ts#markWithSell`
     passa a exigir `vendedorId` e chamar
     `apiClient.patch(`/veiculos/${id}/vender`, { vendedorId })` em vez do
     PATCH genérico de status. A ação "marcar como vendido" (disparada de
     `VehicleTable`/`VehiclesPage`) precisa de um passo a mais pra escolher
     o vendedor antes de confirmar — reaproveitar
     `automarket_fe/src/components/Modal/Modal.tsx` já existente pra esse
     pequeno seletor (lista de vendedores ativos da loja, escolher um,
     confirmar), em vez de criar um padrão de modal novo.

3. **Corrigir os `findAll()` que ignoram query params** (`veiculos`,
   `vendedor`, `contato_whatsapp` — mesmo item do Passo 2.6, aproveitar
   aqui).

**Endpoints novos, todos protegidos e escopados por `@LojaAtual()`,
aceitando `?periodoDias=30` (default 30):**

- `GET /dashboard/metricas` — resposta única com tudo que **não** é
  sensível:
  - `estoque`: soma de `preco` onde `ativo && status != 'VENDIDO'` (sem
    bloqueio nenhum, dado já confiável hoje — `_sum` via
    `prisma.veiculo.aggregate`).
  - `conversao`: contagem de `ContatoWhatsapp` no período (via
    `veiculo.lojaId` + `createdAt` no range) dividido pela contagem de
    vendas (`status: 'VENDIDO' && dataVenda` no range).
  - `ticketMedio`: média de `preco` das vendas no período, com variação
    percentual vs. o período anterior de mesmo tamanho (replicar a lógica
    de janela atual/anterior que já existe em
    `automarket_fe/src/features/dashboard/utils/metrics.ts#calcularPeriodo`
    — portar esse cálculo pro backend, o front deixa de precisar dele).
  - `emAlta`: top N (4) veículos `ativo && status === 'DISPONIVEL'`
    ordenados por `visualizacoes` desc.
  - `alertasPrecificacao`: estender
    `ContatoWhatsappService.rankingPorVeiculo` (hoje sem uso, sem filtro
    de data) com: filtro de `createdAt` no período, limiar
    `visualizacoesMinimas = 500`, e a classificação que hoje só existe no
    front (`calcularAlertasPrecificacao` em `metrics.ts`): `taxaContato =
    totalContatos / visualizacoes * 100`; `REDUZIR_PRECO` se `< 0.5`,
    `REVISAR_FOTOS` se `< 1.2`, só considerar veículos com
    `visualizacoes >= 500`. Mover essa regra pro backend (é regra de
    negócio, e o objetivo aqui é sair do mock) — o endpoint já devolve
    `acaoSugerida` pronto.
  - `rankingVendedores`: novo `groupBy` por `vendedorId` em
    `ContatoWhatsapp` (contagem de contatos no período, escopado por
    `veiculo.lojaId`) + contagem de vendas reais via `Veiculo.vendedorId`
    (substituindo de vez a heurística do front).
- `POST /dashboard/faturamento/revelar` — body `{ senha: string }`, usa
  `@LojaAtual()` pra saber qual loja, chama
  `AuthService.verificarSenhaGerente(loja.id, senha)`; se `false`,
  `UnauthorizedException` (nenhum dado de faturamento é computado nem
  retornado); se `true`, soma `preco` das vendas do período (mesma janela
  de `periodoDias` do resto do dashboard — aceitar esse parâmetro no body
  também) e retorna `{ totalPeriodo, variacaoPercentualVsPeriodoAnterior
  }`.

## Passo 7 — Dashboard com dados reais (frontend)

1. `automarket_fe/src/service/Dashboard.service.ts` (novo): `getMetricas(periodoDias)`
   → `GET /dashboard/metricas?periodoDias=...`; `revelarFaturamento(senha,
   periodoDias)` → `POST /dashboard/faturamento/revelar`.
2. `automarket_fe/src/features/dashboard/hooks/useDashboardData.ts`:
   trocar os 3 imports de mock + `montarDashboardMetricas` por um fetch
   real via `dashboardService.getMetricas(periodoDias)`, com
   `isLoading`/erro de verdade (hoje `isLoading` é o literal `false`
   fixo — precisa virar estado real).
3. `automarket_fe/src/features/dashboard/utils/metrics.ts`: as funções de
   cálculo migraram pro backend no Passo 6 — remover as que não sobraram
   uso nenhum (tudo, exceto alguma formatação puramente visual que ainda
   fizer sentido manter no front, se houver).
4. Remover `automarket_fe/src/mocks/vehicles.mock.ts`,
   `sellers.mock.ts`, `contacts.mock.ts` — confirmar antes que nenhum
   import restante aponta pra eles (`grep -r "mocks/" automarket_fe/src`).

## Passo 8 — Tela única de criar/editar veículo

Mesma tela, mesmo arquivo, alternando por parâmetro de rota — é a opção
mais direta e é como o pedido original descreve o resultado esperado
("aparece a mesma tela de adicionar sendo de editar, com os campos já
preenchidos").

1. `automarket_fe/src/App.tsx`: nova rota `veiculos/:id/editar` apontando
   pro mesmo componente lazy-loaded `AddVehiclePage`.
2. `AddVehiclePage.tsx`:
   - `const { id } = useParams<{ id?: string }>(); const isEditMode =
     Boolean(id);`
   - `useEffect` inicial: se `isEditMode`, chama
     `veiculosService.findById(Number(id))` e popula o `FormState`
     inteiro (inclusive `imagens` e `itens` já salvos — os componentes
     `ImageListField`/`ItemsChecklist` já aceitam `value` controlado, só
     precisa inicializar com o que veio da API).
   - `handleSubmit`: `isEditMode ? veiculosService.update(Number(id),
     payload) : veiculosService.create({ ...payload, lojaId: loja.id })`.
   - Título da página e texto do botão condicionais: "Adicionar
     Veículo"/"Salvar" vs. "Editar Veículo"/"Salvar alterações".
   - Trocar `LOJA_ID_FIXA = 1` (linha ~117, com um TODO já existente no
     código pedindo exatamente essa troca) pela loja da sessão
     (`useAuth().loja.id`, do Passo 3).
3. `automarket_fe/src/features/vehicles/vehiclesPage/VehiclesPage.tsx`: o
   botão de editar em `VehicleTable` hoje chama `handleEditButton` →
   `handleUpdate`, que faz um `veiculosService.update` sem sentido
   (reenvia os mesmos dados da linha da tabela). Trocar por
   `navigate(\`/veiculos/${veiculo.id}/editar\`)`.
4. Aproveitar pra unificar o tipo `Veiculo` duplicado: fazer
   `Veiculos.service.ts` importar `Veiculo`/`CreateVeiculoPayload` de
   `types/vehicle.ts` em vez de manter uma cópia local divergente (ambos
   já perderam `versao` no Passo 1 — bom momento pra também eliminar essa
   duplicação, já que os dois arquivos estão sendo tocados de qualquer
   forma nesta leva).

## Passo 9 — Migration única

Depois de todos os passos de schema acima estarem feitos (Passo 1: drop
`versao`; Passo 2: add `managerPasswordHash`; Passo 4: rename
`logoUrl`→`logo`/`bannerUrl`→`banner`; Passo 6: add `vendedorId` + relação):

```bash
cd automarket_backend
npx prisma migrate dev --name auth_dashboard_real_e_veiculo
npx prisma generate
```

Ao rodar, se o Prisma perguntar sobre o rename de `logoUrl`/`bannerUrl`,
confirmar que é um rename (preserva dado), não um drop+create.

## Verificação

1. `npx prisma migrate dev` roda sem erro; `npx tsc --noEmit` limpo em
   `automarket_backend` e `automarket_fe`.
2. Registrar uma loja nova via `/registro` (senha da conta + senha do
   gerente) → fazer login em `/login` → cai no painel autenticado, sidebar
   mostra o nome real da loja (não mais "Premium Motors" do mock).
3. Bater direto numa rota protegida sem header `Authorization` (ex:
   `curl -X POST http://localhost:3000/veiculos`) → `401`.
4. Criar um veículo com upload de imagem real → editar esse mesmo veículo
   pela tela unificada (`/veiculos/:id/editar`) → campos e imagens vêm
   preenchidos → salvar → `GET /veiculos/:id` reflete a mudança.
5. Marcar um veículo como vendido escolhendo um vendedor → `GET
   /dashboard/metricas` reflete a venda em ticket médio, conversão e
   ranking de vendedores, sem nenhum mock envolvido.
6. No `RevenueCard`, digitar a senha do gerente errada → inspecionar a
   aba Network do browser: a resposta do endpoint rejeitado não deve
   conter nenhum valor de faturamento. Com a senha certa, o valor aparece
   e bate com a soma real das vendas do período no banco.
7. Trocar logo e banner na tela de Configurações usando o mesmo fluxo de
   upload dos veículos (arrastar/selecionar arquivo, ver preview, salvar)
   → persiste após reload da página.
8. `grep -r "mocks/" automarket_fe/src` não deve mais aparecer em nenhum
   arquivo de `features/` (só, se sobrar algo, em testes).
