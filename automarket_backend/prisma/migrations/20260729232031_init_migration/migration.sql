-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('BUGGY', 'CAMINHAO_LEVE', 'CONVERSIVEL', 'COUPE', 'PERUA', 'VAN_UTILITARIO', 'SUV', 'HATCH', 'SEDAN', 'ELETRICO', 'PICKUP');

-- CreateEnum
CREATE TYPE "Cambio" AS ENUM ('AUTOMATICO', 'MANUAL', 'SEMI_AUTOMATICO', 'AUTOMATIZADO');

-- CreateEnum
CREATE TYPE "Direcao" AS ENUM ('HIDRAULICA', 'ELETRO_HIDRAULICA', 'MECANICA', 'ELETRICA');

-- CreateEnum
CREATE TYPE "Combustivel" AS ENUM ('ALCOOL', 'GASOLINA', 'FLEX', 'DIESEL', 'GNV', 'HIBRIDO', 'ELETRICO');

-- CreateEnum
CREATE TYPE "Cor" AS ENUM ('AMARELO', 'AZUL', 'BRANCO', 'CINZA', 'LARANJA', 'PRETO', 'PRATA', 'VERDE', 'VERMELHO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusVeiculo" AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "ItemVeiculo" AS ENUM ('AIRBAG', 'AIRBAG_CORTINA', 'AIRBAG_JOELHO', 'ALARME', 'CAMERA_RE', 'CAMERA_360', 'SENSOR_RE', 'SENSOR_DIANTEIRO', 'BLINDADO', 'IMOBILIZADOR', 'RASTREADOR', 'PILOTO_AUTOMATICO_ADAPTATIVO', 'FREIO_AUTONOMO_EMERGENCIA', 'ALERTA_COLISAO_FRONTAL', 'ALERTA_PONTO_CEGO', 'ALERTA_SAIDA_FAIXA', 'ASSISTENTE_MANUTENCAO_FAIXA', 'ALERTA_TRAFEGO_CRUZADO_TRASEIRO', 'CONTROLE_ESTABILIDADE', 'CONTROLE_TRACAO', 'ASSISTENTE_PARTIDA_RAMPA', 'ASSISTENTE_DESCIDA_RAMPA', 'SENSOR_FADIGA_MOTORISTA', 'RECONHECIMENTO_PLACAS_TRANSITO', 'FAROL_ALTO_AUTOMATICO', 'ESTACIONAMENTO_AUTOMATICO', 'AR_CONDICIONADO', 'AR_CONDICIONADO_DIGITAL', 'CLIMATIZACAO_BI_ZONA', 'TETO_SOLAR', 'TETO_PANORAMICO', 'BANCOS_COURO', 'BANCO_MOTORISTA_ELETRICO', 'BANCO_AQUECIDO', 'BANCO_VENTILADO', 'BANCO_MEMORIA', 'TRAVA_ELETRICA', 'VIDRO_ELETRICO', 'CHAVE_PRESENCIAL', 'PARTIDA_BOTAO', 'PORTA_MALAS_ELETRICO', 'ABERTURA_PORTA_MALAS_SENSOR', 'RETROVISOR_ELETRICO', 'RETROVISOR_REBATIVEL_ELETRICO', 'VOLANTE_AQUECIDO', 'VOLANTE_ELETRICO_AJUSTAVEL', 'ILUMINACAO_AMBIENTE', 'CARREGADOR_INDUCAO', 'CONEXAO_USB', 'CONEXAO_USB_C', 'VOLANTE_MULTIFUNCIONAL', 'INTERFACE_BLUETOOTH', 'SOM', 'SOM_PREMIUM', 'COMPUTADOR_BORDO', 'NAVEGADOR_GPS', 'CENTRAL_MULTIMIDIA', 'TELA_TOUCHSCREEN', 'PAINEL_DIGITAL', 'HEAD_UP_DISPLAY', 'APPLE_CARPLAY', 'ANDROID_AUTO', 'WIFI_INTEGRADO', 'APP_CONTROLE_REMOTO', 'RECONHECIMENTO_VOZ', 'ATUALIZACAO_OTA', 'CONTROLE_VELOCIDADE', 'TRACAO_4X4', 'RODAS_LIGA_LEVE', 'KIT_GNV', 'MODOS_CONDUCAO', 'SUSPENSAO_ADAPTATIVA', 'DIRECAO_ELETRICA_VARIAVEL', 'ESCAPE_ESPORTIVO', 'CARREGAMENTO_RAPIDO', 'FRENAGEM_REGENERATIVA', 'MODO_SILENCIOSO', 'PRE_CONDICIONAMENTO_CLIMATIZACAO', 'TOMADA_110V_220V_BORDO');

-- CreateTable
CREATE TABLE "enderecos" (
    "id" SERIAL NOT NULL,
    "cep" VARCHAR(9),
    "rua" VARCHAR(200),
    "numero" VARCHAR(20),
    "bairro" VARCHAR(100),
    "cidade" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(2) NOT NULL,
    "lojaId" INTEGER NOT NULL,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lojas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logoUrl" VARCHAR(500),
    "bannerUrl" VARCHAR(500),
    "email" VARCHAR(150) NOT NULL,
    "telefone" VARCHAR(20),
    "passwordHash" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "fotoUrl" VARCHAR(500),
    "whatsapp" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "lojaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "lojaId" INTEGER NOT NULL,
    "marca" VARCHAR(100) NOT NULL,
    "marcaFipeId" INTEGER,
    "modelo" VARCHAR(150) NOT NULL,
    "modeloFipeId" INTEGER,
    "versao" VARCHAR(150) NOT NULL,
    "anoFabricacao" INTEGER NOT NULL,
    "anoModelo" INTEGER NOT NULL,
    "tipoVeiculo" "TipoVeiculo" NOT NULL,
    "cambio" "Cambio" NOT NULL,
    "portas" INTEGER NOT NULL,
    "combustivel" "Combustivel" NOT NULL,
    "direcao" "Direcao" NOT NULL,
    "potenciaMotor" VARCHAR(50) NOT NULL,
    "cor" "Cor" NOT NULL,
    "quilometragem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "itens" "ItemVeiculo"[],
    "precoPromocional" DOUBLE PRECISION,
    "estadoFinanceiro" VARCHAR(100),
    "documentacaoRegularizacao" VARCHAR(200),
    "conservacaoGarantia" VARCHAR(200),
    "aceitaTroca" BOOLEAN NOT NULL DEFAULT false,
    "aceitaFinanciamento" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusVeiculo" NOT NULL DEFAULT 'DISPONIVEL',
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dataVenda" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo_imagens" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "capa" BOOLEAN NOT NULL DEFAULT false,
    "veiculoId" INTEGER NOT NULL,

    CONSTRAINT "veiculo_imagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos_whatsapp" (
    "id" SERIAL NOT NULL,
    "veiculoId" INTEGER NOT NULL,
    "vendedorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contatos_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_lojaId_key" ON "enderecos"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_slug_key" ON "lojas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_email_key" ON "lojas"("email");

-- CreateIndex
CREATE INDEX "lojas_slug_idx" ON "lojas"("slug");

-- CreateIndex
CREATE INDEX "vendedores_lojaId_idx" ON "vendedores"("lojaId");

-- CreateIndex
CREATE INDEX "veiculos_lojaId_idx" ON "veiculos"("lojaId");

-- CreateIndex
CREATE INDEX "veiculos_lojaId_status_idx" ON "veiculos"("lojaId", "status");

-- CreateIndex
CREATE INDEX "veiculos_marca_modelo_idx" ON "veiculos"("marca", "modelo");

-- CreateIndex
CREATE INDEX "veiculo_imagens_veiculoId_idx" ON "veiculo_imagens"("veiculoId");

-- CreateIndex
CREATE INDEX "contatos_whatsapp_veiculoId_idx" ON "contatos_whatsapp"("veiculoId");

-- CreateIndex
CREATE INDEX "contatos_whatsapp_vendedorId_idx" ON "contatos_whatsapp"("vendedorId");

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo_imagens" ADD CONSTRAINT "veiculo_imagens_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_whatsapp" ADD CONSTRAINT "contatos_whatsapp_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_whatsapp" ADD CONSTRAINT "contatos_whatsapp_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
