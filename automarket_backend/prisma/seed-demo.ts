/**
 * Seed da loja de demonstração (`npm run seed:demo`).
 *
 * Idempotente: loja é upsert por `slug`, vendedores e veículos são buscados
 * por chave natural antes de criar. Os eventos de métrica (visualizações,
 * contatos) só são gerados quando o veículo é CRIADO nesta execução —
 * rodar de novo não multiplica contatos nem visualizações.
 *
 * Variáveis:
 * - DATABASE_URL        (obrigatória) banco alvo, ex.: Neon
 * - DEMO_PASSWORD       (obrigatória) senha de login da loja demo
 * - DEMO_MANAGER_PASSWORD (opcional) senha do gerente; padrão = DEMO_PASSWORD
 * - DEMO_EMAIL          (opcional) padrão demo@automarket.demo
 * - DEMO_IMAGE_BASE_URL (opcional) base de fotos próprias (`<base>/<n>.jpg`,
 *   n = 1..12); sem ela usa placeholders públicos (picsum.photos)
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  Cambio,
  Combustivel,
  Cor,
  Direcao,
  ItemVeiculo,
  PrismaClient,
  StatusVeiculo,
  TipoVeiculo,
} from '../generated/prisma/client';

const prisma = new PrismaClient();

const SLUG = 'demo';
const DIA = 24 * 60 * 60 * 1000;
const diasAtras = (n: number) => new Date(Date.now() - n * DIA);

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`${nome} não definida.`);
  return valor;
}

function imagemVeiculo(numero: number, indice: number): string {
  const base = process.env.DEMO_IMAGE_BASE_URL?.replace(/\/$/, '');
  // com base própria, a segunda foto reaproveita a mesma (sem inventar nomes)
  if (base) return `${base}/${numero}.jpg`;
  return `https://picsum.photos/seed/automarket-demo-${numero}-${indice}/1200/800`;
}

const VENDEDORES = [
  { nome: 'Carlos Menezes', whatsapp: '83999990001' },
  { nome: 'Fernanda Lopes', whatsapp: '83999990002' },
  { nome: 'Ricardo Alves', whatsapp: '83999990003' },
];

type VeiculoSeed = {
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  tipoVeiculo: TipoVeiculo;
  cambio: Cambio;
  portas: number;
  combustivel: Combustivel;
  direcao: Direcao;
  potenciaMotor: string;
  cor: Cor;
  quilometragem: number;
  preco: number;
  precoPromocional?: number;
  itens: ItemVeiculo[];
  status: StatusVeiculo;
  /** dias atrás em que foi vendido (só para VENDIDO) */
  vendidoHa?: number;
  vendedor?: number; // índice em VENDEDORES (venda)
  visualizacoes: number;
  contatos: number;
  aceitaTroca?: boolean;
  aceitaFinanciamento?: boolean;
};

const BASICOS = [
  ItemVeiculo.AR_CONDICIONADO,
  ItemVeiculo.TRAVA_ELETRICA,
  ItemVeiculo.VIDRO_ELETRICO,
  ItemVeiculo.AIRBAG,
];

const VEICULOS: VeiculoSeed[] = [
  { marca: 'Volkswagen', modelo: 'Gol 1.0', anoFabricacao: 2019, anoModelo: 2020, tipoVeiculo: TipoVeiculo.HATCH, cambio: Cambio.MANUAL, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.0 76cv', cor: Cor.BRANCO, quilometragem: 48000, preco: 42900, itens: BASICOS, status: StatusVeiculo.DISPONIVEL, visualizacoes: 140, contatos: 9, aceitaTroca: true, aceitaFinanciamento: true },
  { marca: 'Chevrolet', modelo: 'Onix LT', anoFabricacao: 2021, anoModelo: 2022, tipoVeiculo: TipoVeiculo.HATCH, cambio: Cambio.MANUAL, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.0 turbo 116cv', cor: Cor.PRATA, quilometragem: 31000, preco: 69900, precoPromocional: 66900, itens: [...BASICOS, ItemVeiculo.CENTRAL_MULTIMIDIA, ItemVeiculo.APPLE_CARPLAY, ItemVeiculo.ANDROID_AUTO], status: StatusVeiculo.DISPONIVEL, visualizacoes: 210, contatos: 14, aceitaFinanciamento: true },
  { marca: 'Fiat', modelo: 'Argo Drive', anoFabricacao: 2020, anoModelo: 2021, tipoVeiculo: TipoVeiculo.HATCH, cambio: Cambio.MANUAL, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.3 109cv', cor: Cor.VERMELHO, quilometragem: 39500, preco: 62500, itens: [...BASICOS, ItemVeiculo.CAMERA_RE, ItemVeiculo.SENSOR_RE], status: StatusVeiculo.DISPONIVEL, visualizacoes: 95, contatos: 6, aceitaTroca: true },
  { marca: 'Toyota', modelo: 'Corolla XEi', anoFabricacao: 2020, anoModelo: 2021, tipoVeiculo: TipoVeiculo.SEDAN, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '2.0 177cv', cor: Cor.PRETO, quilometragem: 52000, preco: 124900, itens: [...BASICOS, ItemVeiculo.BANCOS_COURO, ItemVeiculo.TETO_SOLAR, ItemVeiculo.CENTRAL_MULTIMIDIA, ItemVeiculo.CAMERA_RE], status: StatusVeiculo.DISPONIVEL, visualizacoes: 320, contatos: 5, aceitaTroca: true, aceitaFinanciamento: true }, // muita visualização, pouco contato
  { marca: 'Honda', modelo: 'Civic EXL', anoFabricacao: 2019, anoModelo: 2019, tipoVeiculo: TipoVeiculo.SEDAN, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '2.0 155cv', cor: Cor.CINZA, quilometragem: 67000, preco: 104900, itens: [...BASICOS, ItemVeiculo.BANCOS_COURO, ItemVeiculo.TETO_SOLAR, ItemVeiculo.PARTIDA_BOTAO], status: StatusVeiculo.DISPONIVEL, visualizacoes: 180, contatos: 11 },
  { marca: 'Jeep', modelo: 'Compass Longitude', anoFabricacao: 2021, anoModelo: 2022, tipoVeiculo: TipoVeiculo.SUV, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.3 turbo 185cv', cor: Cor.BRANCO, quilometragem: 28000, preco: 149900, itens: [...BASICOS, ItemVeiculo.TELA_TOUCHSCREEN, ItemVeiculo.CAMERA_RE, ItemVeiculo.CONTROLE_TRACAO, ItemVeiculo.PAINEL_DIGITAL], status: StatusVeiculo.DISPONIVEL, visualizacoes: 275, contatos: 16, aceitaFinanciamento: true },
  { marca: 'Hyundai', modelo: 'Creta Pulse', anoFabricacao: 2022, anoModelo: 2022, tipoVeiculo: TipoVeiculo.SUV, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.6 123cv', cor: Cor.AZUL, quilometragem: 22000, preco: 118900, itens: [...BASICOS, ItemVeiculo.CENTRAL_MULTIMIDIA, ItemVeiculo.SENSOR_RE], status: StatusVeiculo.RESERVADO, visualizacoes: 160, contatos: 8, aceitaTroca: true },
  { marca: 'Toyota', modelo: 'Hilux SRV', anoFabricacao: 2019, anoModelo: 2020, tipoVeiculo: TipoVeiculo.PICKUP, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.DIESEL, direcao: Direcao.ELETRO_HIDRAULICA, potenciaMotor: '2.8 177cv', cor: Cor.PRATA, quilometragem: 89000, preco: 229900, itens: [...BASICOS, ItemVeiculo.TRACAO_4X4, ItemVeiculo.BANCOS_COURO, ItemVeiculo.CAMERA_RE], status: StatusVeiculo.DISPONIVEL, visualizacoes: 230, contatos: 12, aceitaTroca: true },
  { marca: 'Fiat', modelo: 'Strada Freedom', anoFabricacao: 2022, anoModelo: 2023, tipoVeiculo: TipoVeiculo.PICKUP, cambio: Cambio.MANUAL, portas: 2, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.3 107cv', cor: Cor.BRANCO, quilometragem: 15000, preco: 94900, itens: [...BASICOS, ItemVeiculo.CENTRAL_MULTIMIDIA], status: StatusVeiculo.DISPONIVEL, visualizacoes: 120, contatos: 7, aceitaFinanciamento: true },
  { marca: 'Renault', modelo: 'Kwid Zen', anoFabricacao: 2021, anoModelo: 2022, tipoVeiculo: TipoVeiculo.HATCH, cambio: Cambio.MANUAL, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.0 70cv', cor: Cor.LARANJA, quilometragem: 26000, preco: 48900, itens: BASICOS, status: StatusVeiculo.VENDIDO, vendidoHa: 4, vendedor: 0, visualizacoes: 150, contatos: 10 },
  { marca: 'Volkswagen', modelo: 'T-Cross Highline', anoFabricacao: 2021, anoModelo: 2022, tipoVeiculo: TipoVeiculo.SUV, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.4 turbo 150cv', cor: Cor.CINZA, quilometragem: 34000, preco: 112900, itens: [...BASICOS, ItemVeiculo.PAINEL_DIGITAL, ItemVeiculo.CAMERA_RE, ItemVeiculo.CONTROLE_ESTABILIDADE], status: StatusVeiculo.VENDIDO, vendidoHa: 11, vendedor: 1, visualizacoes: 260, contatos: 18 },
  { marca: 'Chevrolet', modelo: 'Tracker Premier', anoFabricacao: 2022, anoModelo: 2023, tipoVeiculo: TipoVeiculo.SUV, cambio: Cambio.AUTOMATICO, portas: 4, combustivel: Combustivel.FLEX, direcao: Direcao.ELETRICA, potenciaMotor: '1.2 turbo 133cv', cor: Cor.PRETO, quilometragem: 18000, preco: 131900, itens: [...BASICOS, ItemVeiculo.TETO_SOLAR, ItemVeiculo.WIFI_INTEGRADO, ItemVeiculo.CAMERA_360], status: StatusVeiculo.VENDIDO, vendidoHa: 19, vendedor: 0, visualizacoes: 300, contatos: 20 },
];

async function main() {
  const senha = exigirEnv('DEMO_PASSWORD');
  const senhaGerente = process.env.DEMO_MANAGER_PASSWORD ?? senha;
  const email = process.env.DEMO_EMAIL ?? 'demo@automarket.demo';

  const passwordHash = await bcrypt.hash(senha, 10);
  const managerPasswordHash = await bcrypt.hash(senhaGerente, 10);

  const dadosLoja = {
    nome: 'Demo Veículos',
    email,
    telefone: '83999990000',
    whatsapp: '83999990000',
    logo: 'https://placehold.co/256x256/111111/ffffff/png?text=Demo',
    banner: 'https://picsum.photos/seed/automarket-demo-banner/1600/500',
    horarioAbertura: '08:00',
    horarioFechamento: '18:00',
    instagramUrl: 'https://instagram.com/',
    passwordHash,
    managerPasswordHash,
    ativo: true,
  };
  const loja = await prisma.loja.upsert({
    where: { slug: SLUG },
    update: dadosLoja,
    create: { slug: SLUG, ...dadosLoja },
    select: { id: true },
  });

  await prisma.endereco.upsert({
    where: { lojaId: loja.id },
    update: {},
    create: {
      lojaId: loja.id,
      cep: '58000-000',
      rua: 'Av. Exemplo',
      numero: '1000',
      bairro: 'Centro',
      cidade: 'João Pessoa',
      estado: 'PB',
    },
  });

  const vendedores: { id: number }[] = [];
  for (const [i, v] of VENDEDORES.entries()) {
    const existente = await prisma.vendedor.findFirst({
      where: { lojaId: loja.id, whatsapp: v.whatsapp },
      select: { id: true },
    });
    vendedores.push(
      existente ??
        (await prisma.vendedor.create({
          data: {
            lojaId: loja.id,
            nome: v.nome,
            whatsapp: v.whatsapp,
            fotoUrl: `https://picsum.photos/seed/automarket-demo-vendedor-${i + 1}/300/300`,
          },
          select: { id: true },
        })),
    );
  }

  let criados = 0;
  for (const [i, v] of VEICULOS.entries()) {
    const numero = i + 1;
    const existente = await prisma.veiculo.findFirst({
      where: { lojaId: loja.id, marca: v.marca, modelo: v.modelo, anoModelo: v.anoModelo },
      select: { id: true },
    });
    if (existente) continue;

    const vendido = v.status === StatusVeiculo.VENDIDO;
    const veiculo = await prisma.veiculo.create({
      data: {
        lojaId: loja.id,
        marca: v.marca,
        modelo: v.modelo,
        anoFabricacao: v.anoFabricacao,
        anoModelo: v.anoModelo,
        tipoVeiculo: v.tipoVeiculo,
        cambio: v.cambio,
        portas: v.portas,
        combustivel: v.combustivel,
        direcao: v.direcao,
        potenciaMotor: v.potenciaMotor,
        cor: v.cor,
        quilometragem: v.quilometragem,
        descricao: `${v.marca} ${v.modelo} ${v.anoModelo}, revisado e com procedência. Veículo de demonstração.`,
        preco: v.preco,
        precoPromocional: v.precoPromocional,
        itens: v.itens,
        aceitaTroca: v.aceitaTroca ?? false,
        aceitaFinanciamento: v.aceitaFinanciamento ?? false,
        status: v.status,
        visualizacoes: v.visualizacoes,
        createdAt: diasAtras(40 + i),
        dataVenda: vendido ? diasAtras(v.vendidoHa ?? 5) : null,
        vendedorId: vendido ? vendedores[v.vendedor ?? 0].id : null,
        imagens: {
          create: [0, 1].map((idx) => ({
            url: imagemVeiculo(numero, idx),
            ordem: idx,
            capa: idx === 0,
          })),
        },
      },
      select: { id: true },
    });

    // contatos espalhados pelos últimos 30 dias, distribuídos entre vendedores
    // (o primeiro recebe mais, para o ranking não ficar empatado)
    const contatos = Array.from({ length: v.contatos }, (_, c) => ({
      lojaId: loja.id,
      veiculoId: veiculo.id,
      vendedorId: vendedores[c % 4 === 3 ? 2 : c % 4 === 2 ? 1 : 0].id,
      createdAt: diasAtras((c * 3 + i) % 30),
    }));
    await prisma.contatoWhatsapp.createMany({ data: contatos });
    criados++;
  }

  console.log(
    `Seed demo ok: loja "${SLUG}" (id ${loja.id}), ${vendedores.length} vendedores, ${criados} veículos novos de ${VEICULOS.length}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
