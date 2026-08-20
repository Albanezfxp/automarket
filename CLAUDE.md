# AutoMarket

Sistema **white-label** para lojas de veículos usados. Não é marketplace: cada loja recebe seu próprio site + painel, entregues como pacote fechado (equipe cadastra 10–30 veículos, cria a loja com login/senha e entrega rodando em subdomínio próprio, ex: `nomedaloja.automarket.com.br`).

O nome "AutoMarket" **nunca** aparece como marca principal nas telas — a loja é sempre a protagonista visual (logo, banner e nome dinâmicos). No máximo um "powered by" discreto no rodapé.

## Estrutura do repositório

```
automarket_backend/   NestJS + Prisma + PostgreSQL
automarket_fe/        React + Vite + TypeScript + CSS puro
```

## Modelo de dados (`automarket_backend/prisma/schema.prisma`)

Consulte sempre o schema antes de assumir campos. Resumo das entidades:

- **Loja** — nome, `slug` (subdomínio), logoUrl, bannerUrl, email, telefone, passwordHash; 1:1 com **Endereco**
- **Vendedor** — nome, foto, whatsapp; N:1 com Loja
- **Veiculo** — N:1 com Loja. `marca`/`modelo` são `String` (não FK): vêm de `<select>` populado pela API FIPE, com `marcaFipeId`/`modeloFipeId` guardados só para reconsulta futura. `itens` é **array de enum** `ItemVeiculo` (lista fixa, muda a cada 3–6 meses — não justifica tabela relacional). Tem `visualizacoes`, `status` (DISPONIVEL/RESERVADO/VENDIDO), `dataVenda`
- **VeiculoImagem** — N por veículo, com `ordem` e `capa` (**só uma capa por veículo**, garantido via `$transaction`)
- **ContatoWhatsapp** — **log de evento imutável** (só create/delete, nunca update): cada clique no modal "falar com vendedor" grava `veiculoId` + `vendedorId` + `createdAt`. É a fonte da maioria das métricas do dashboard

Loja, Vendedor e Veiculo usam **soft delete** (`ativo: boolean`) para preservar histórico de métricas.

## Telas

**Site público** (4 páginas, header fixo com logo/nome da loja + nav em todas elas): Catálogo (banner liso da loja + grid + seções por categoria), Detalhe do Veículo (CTA abre modal para escolher qual vendedor contatar via WhatsApp), Vendedores (lista os vendedores ativos, CTA direto pro WhatsApp de cada um) e Localização (endereço da loja + link para o Google Maps).

**Painel admin** (sidebar com 4 seções): Dashboard, Veículos (CRUD), Vendedores (CRUD), Configurações da loja.

### Métricas do Dashboard

1. Faturamento no período — **oculto até o dono digitar a senha dele**
2. Ticket médio de venda
3. Taxa de conversão (contatos → vendas)
4. Valor total imobilizado em estoque
5. Veículos mais procurados (visualizações + contatos)
6. Ranking de vendedores por contatos recebidos
7. Veículos com muita visualização e pouco contato (sinal de preço a revisar)

## Convenções

**Backend**

- DTOs com `class-validator`/`class-transformer`; `ValidationPipe` global ativo em `main.ts`
- Services com try/catch, mapeando erros do Prisma (`P2002` → 409, `P2003` → 400, `P2025` → 404)
- Nunca retornar `passwordHash` — usar `select` explícito nas queries
- Integração FIPE é feita **pelo backend** (cache: marcas ~7 dias, modelos/anos ~1 dia), nunca direto do front

**Frontend**

- **CSS por componente** (colocado ao lado do `.tsx`), nunca um CSS gigante por página
- Tokens de design escopados por componente/tema — não despejar tudo em `:root` global
- Ícones: **Material Symbols Outlined**, não lucide-react
- Fontes: Montserrat + Inter no painel; Geist + Inter no catálogo público
- Performance: code-splitting/lazy loading de rotas, memorização quando fizer sentido, imagens otimizadas
- Documentar decisões não-óbvias (comentários + TSDoc em coisas complexas)

## Comandos

```bash
# Backend
cd automarket_backend
npm run start:dev
npx prisma migrate dev
npx prisma generate
npx prisma studio

# Frontend
cd automarket_fe
npm run dev
npm run build

# Checagem de tipos (rodar nos dois antes de considerar algo pronto)
npx tsc --noEmit
```
