-- Passo 4: renomeia logoUrl/bannerUrl -> logo/banner (preserva dados
-- existentes; NÃO é um drop+create).
ALTER TABLE "lojas" RENAME COLUMN "logoUrl" TO "logo";
ALTER TABLE "lojas" RENAME COLUMN "bannerUrl" TO "banner";

-- Passo 2/5: managerPasswordHash é obrigatório, mas lojas já cadastradas
-- não têm esse valor. Backfill com um hash placeholder (senha
-- "trocar-depois-2026") pra não travar a migration — não afeta o login
-- normal (passwordHash continua intacto), só a revelação de faturamento
-- no Dashboard. Lojas existentes devem trocar essa senha em
-- Configurações assim que possível.
ALTER TABLE "lojas" ADD COLUMN "managerPasswordHash" VARCHAR(255);
UPDATE "lojas" SET "managerPasswordHash" = '$2b$10$HGPS7081cBibIUuwPEPd7utSSkGr33s3gtb.QJ32qtJJfd/pUX/bm' WHERE "managerPasswordHash" IS NULL;
ALTER TABLE "lojas" ALTER COLUMN "managerPasswordHash" SET NOT NULL;

-- Drift pré-existente: "estadoFinanceiro" já não fazia parte do schema
-- Prisma antes deste prompt (coluna nula, sem uso pela aplicação).
ALTER TABLE "veiculos" DROP COLUMN "estadoFinanceiro";

-- Passo 1: remoção de "versao" autorizada explicitamente (destrutivo).
ALTER TABLE "veiculos" DROP COLUMN "versao";

-- Passo 6: vínculo venda -> vendedor.
ALTER TABLE "veiculos" ADD COLUMN "vendedorId" INTEGER;
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
