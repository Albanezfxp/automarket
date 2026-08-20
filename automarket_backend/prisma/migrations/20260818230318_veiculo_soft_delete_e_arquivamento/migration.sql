/*
  Warnings:

  - Added the required column `lojaId` to the `contatos_whatsapp` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "contatos_whatsapp" DROP CONSTRAINT "contatos_whatsapp_veiculoId_fkey";

-- AlterTable (lojaId entra opcional pra poder ser preenchido a partir do
-- veiculo já existente antes de virar NOT NULL — a tabela já tem linhas)
ALTER TABLE "contatos_whatsapp" ADD COLUMN     "lojaId" INTEGER,
ALTER COLUMN "veiculoId" DROP NOT NULL;

-- Backfill: cada contato existente herda o lojaId do veículo que ele
-- referenciava no momento da migração.
UPDATE "contatos_whatsapp" AS cw
SET "lojaId" = v."lojaId"
FROM "veiculos" AS v
WHERE v."id" = cw."veiculoId";

ALTER TABLE "contatos_whatsapp" ALTER COLUMN "lojaId" SET NOT NULL;

-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN     "excluidoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "veiculos_arquivados" (
    "id" SERIAL NOT NULL,
    "veiculoIdOriginal" INTEGER NOT NULL,
    "lojaId" INTEGER NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anoModelo" INTEGER NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "status" "StatusVeiculo" NOT NULL,
    "visualizacoes" INTEGER NOT NULL,
    "totalContatos" INTEGER NOT NULL,
    "vendedorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL,
    "dataVenda" TIMESTAMP(3),
    "excluidoEm" TIMESTAMP(3) NOT NULL,
    "arquivadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculos_arquivados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "veiculos_arquivados_lojaId_idx" ON "veiculos_arquivados"("lojaId");

-- CreateIndex
CREATE INDEX "veiculos_arquivados_lojaId_status_idx" ON "veiculos_arquivados"("lojaId", "status");

-- CreateIndex
CREATE INDEX "contatos_whatsapp_lojaId_idx" ON "contatos_whatsapp"("lojaId");

-- AddForeignKey
ALTER TABLE "veiculos_arquivados" ADD CONSTRAINT "veiculos_arquivados_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_whatsapp" ADD CONSTRAINT "contatos_whatsapp_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_whatsapp" ADD CONSTRAINT "contatos_whatsapp_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
