#!/usr/bin/env node
/**
 * Seed idempotente da loja de demonstração, via API (não toca no banco direto).
 *
 * Uso:
 *   API_URL=https://<app>.onrender.com DEMO_PASSWORD=... DEMO_MANAGER_PASSWORD=... \
 *     node scripts/seed-demo.mjs
 *
 * Rode ANTES de ligar READ_ONLY=true no backend (o seed precisa escrever).
 * Reexecutar é seguro: se a loja já existe, só faz login e completa o que
 * faltar (vendedores/veículos são comparados por nome/marca+modelo+ano).
 * Senhas vêm do ambiente — nunca ficam no repositório.
 */
const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@lojademo.com.br';
const PASSWORD = process.env.DEMO_PASSWORD;
const MANAGER_PASSWORD = process.env.DEMO_MANAGER_PASSWORD;

if (!PASSWORD || !MANAGER_PASSWORD) {
  console.error('Defina DEMO_PASSWORD e DEMO_MANAGER_PASSWORD (mín. 8 caracteres).');
  process.exit(1);
}

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const foto = (seed) => `https://picsum.photos/seed/${seed}/1200/800`;

const VENDEDORES = [
  { nome: 'Carlos Mendes', whatsapp: '5583999990001' },
  { nome: 'Fernanda Lima', whatsapp: '5583999990002' },
  { nome: 'Ricardo Alves', whatsapp: '5583999990003' },
];

const BASE = {
  portas: 4,
  direcao: 'ELETRICA',
  aceitaTroca: true,
  aceitaFinanciamento: true,
};
const VEICULOS = [
  ['Toyota', 'Corolla XEi 2.0', 2021, 'SEDAN', 'AUTOMATICO', 'FLEX', 'PRATA', 62000, 118900, '2.0 16V'],
  ['Honda', 'Civic EXL 2.0', 2020, 'SEDAN', 'AUTOMATICO', 'FLEX', 'PRETO', 71000, 112500, '2.0 16V'],
  ['Volkswagen', 'Polo Highline 200 TSI', 2022, 'HATCH', 'AUTOMATICO', 'FLEX', 'BRANCO', 38000, 94900, '1.0 TSI'],
  ['Fiat', 'Argo Drive 1.3', 2021, 'HATCH', 'MANUAL', 'FLEX', 'VERMELHO', 45000, 62900, '1.3 8V'],
  ['Chevrolet', 'Onix LTZ 1.0 Turbo', 2022, 'HATCH', 'AUTOMATICO', 'FLEX', 'CINZA', 29000, 79900, '1.0 Turbo'],
  ['Jeep', 'Compass Longitude 1.3 T270', 2022, 'SUV', 'AUTOMATICO', 'FLEX', 'BRANCO', 41000, 149900, '1.3 Turbo'],
  ['Hyundai', 'Creta Platinum 2.0', 2023, 'SUV', 'AUTOMATICO', 'FLEX', 'PRETO', 18000, 139900, '2.0 16V'],
  ['Toyota', 'Hilux SRV 2.8 4x4', 2020, 'PICKUP', 'AUTOMATICO', 'DIESEL', 'PRATA', 88000, 229900, '2.8 Turbo Diesel'],
  ['Ford', 'Ranger XLT 3.2', 2019, 'PICKUP', 'AUTOMATICO', 'DIESEL', 'BRANCO', 112000, 189900, '3.2 Diesel'],
  ['Renault', 'Kwid Intense 1.0', 2022, 'HATCH', 'MANUAL', 'FLEX', 'LARANJA', 27000, 49900, '1.0 12V'],
  ['Nissan', 'Kicks Advance 1.6', 2021, 'SUV', 'AUTOMATICO', 'FLEX', 'AZUL', 52000, 99900, '1.6 16V'],
  ['Volkswagen', 'T-Cross Comfortline', 2021, 'SUV', 'AUTOMATICO', 'FLEX', 'CINZA', 47000, 104900, '1.0 TSI'],
].map(([marca, modelo, ano, tipoVeiculo, cambio, combustivel, cor, quilometragem, preco, potenciaMotor], i) => ({
  ...BASE,
  marca,
  modelo,
  anoFabricacao: ano,
  anoModelo: ano,
  tipoVeiculo,
  cambio,
  combustivel,
  cor,
  quilometragem,
  preco,
  potenciaMotor,
  descricao: `${marca} ${modelo} ${ano}, único dono, revisões em dia e laudo cautelar aprovado.`,
  itens: ['AR_CONDICIONADO', 'AIRBAG', 'CAMERA_RE', 'SENSOR_RE'],
  imagens: [
    { url: foto(`automarket-${i}-a`), ordem: 0, capa: true },
    { url: foto(`automarket-${i}-b`), ordem: 1, capa: false },
  ],
}));

async function login() {
  const { status, data } = await call('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  return status === 201 || status === 200 ? data.accessToken : null;
}

async function main() {
  let token = await login();

  if (!token) {
    const { status, data } = await call('POST', '/lojas', {
      nome: 'Loja Demo Veículos',
      slug: 'lojademo',
      email: EMAIL,
      telefone: '8333330000',
      whatsapp: '5583999990000',
      password: PASSWORD,
      confirm_password: PASSWORD,
      managerPassword: MANAGER_PASSWORD,
      confirmManagerPassword: MANAGER_PASSWORD,
      endereco: {
        rua: 'Av. Principal',
        numero: '1000',
        bairro: 'Centro',
        cidade: 'João Pessoa',
        estado: 'PB',
        cep: '58000-000',
      },
    });
    if (status >= 300) throw new Error(`Criar loja falhou (${status}): ${JSON.stringify(data)}`);
    console.log('Loja criada.');
    token = await login();
    if (!token) throw new Error('Login falhou após criar a loja.');
  } else {
    console.log('Loja já existe — completando o que faltar.');
  }

  const vend = await call('GET', '/vendedor', undefined, token);
  const nomesVend = new Set((vend.data ?? []).map((v) => v.nome));
  for (const v of VENDEDORES) {
    if (nomesVend.has(v.nome)) continue;
    const r = await call('POST', '/vendedor', v, token);
    console.log(`Vendedor ${v.nome}: ${r.status}`);
  }

  const veic = await call('GET', '/veiculos', undefined, token);
  const chaves = new Set(
    (Array.isArray(veic.data) ? veic.data : (veic.data?.data ?? [])).map(
      (v) => `${v.marca}|${v.modelo}|${v.anoModelo}`,
    ),
  );
  for (const v of VEICULOS) {
    if (chaves.has(`${v.marca}|${v.modelo}|${v.anoModelo}`)) continue;
    const r = await call('POST', '/veiculos', v, token);
    console.log(`Veículo ${v.marca} ${v.modelo}: ${r.status}`);
    if (r.status >= 300) console.log(JSON.stringify(r.data));
  }
  console.log(`Pronto. Catálogo: <front>/lojademo | login: ${EMAIL}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
