import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { entrarComoAdmin } from "./support/sessao.mjs";

// Requer: dashboard rodando (DASHBOARD_URL) com banco e seeds S04/S05.
// Os testes comparam o Panorama ANTES e DEPOIS de enviar pesquisas conhecidas (diferença),
// então funcionam em banco vazio ou já populado (inclusive o de demonstração).
const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const dispositivo = randomUUID();

const post = (pesquisas) =>
  fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
    body: JSON.stringify({ pesquisas }),
  }).then((r) => r.json());

const agora = Date.now() - 60_000;
const pesquisa = (respostas, extra = {}) => ({
  id: randomUUID(),
  protocolo: 100000 + Math.floor(Math.random() * 800000),
  pesquisador: "OTO117",
  local: "Hot Beach Olímpia",
  dispositivo,
  versaoQuestionario: 1,
  iniciadaEm: new Date(agora).toISOString(),
  finalizadaEm: new Date(agora + 480_000).toISOString(),
  respostas,
  sinalizacoes: [],
  ...extra,
});

async function panorama(filtros = {}) {
  const qs = new URLSearchParams(filtros).toString();
  const r = await fetch(`${baseUrl}/api/analytics${qs ? `?${qs}` : ""}`);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.dbConnected, true);
  return j.panorama;
}

// Quatro pesquisas com perfis distintos
const base = [
  { chave: "estado", valor: "Minas Gerais (MG)" },
  { chave: "pernoites", valor: 3 },
];
const lote = [
  pesquisa([...base, { chave: "genero", valor: "Feminino" }, { chave: "idade", valor: 25 }, { chave: "hospedagem", valor: "Resort" }, { chave: "transporte", valor: "Aéreo" }, { chave: "nps", valor: 10 }]),
  pesquisa([...base, { chave: "genero", valor: "Masculino" }, { chave: "idade", valor: 40 }, { chave: "hospedagem", valor: "Hotel" }, { chave: "transporte", valor: "Veículo próprio" }, { chave: "nps", valor: 5 }]),
  pesquisa([...base, { chave: "genero", valor: "Feminino" }, { chave: "idade", valor: 61 }, { chave: "hospedagem", valor: "Hotel" }, { chave: "transporte", valor: "Veículo próprio" }, { chave: "nps", valor: 8 }]),
  // idade absurda, sinalizada: a resposta fica SUSPEITA e não entra no filtro por idade
  pesquisa([...base, { chave: "genero", valor: "Masculino" }, { chave: "idade", valor: 500 }, { chave: "hospedagem", valor: "Hotel" }, { chave: "nps", valor: 9 }], {
    sinalizacoes: [{ regra: "idade", chave: "idade", titulo: "Idade fora do esperado", mensagem: "500 anos parece incorreto", status: "confirmed" }],
  }),
];

const filtros = [
  ["total", {}],
  ["genero Feminino", { genero: "Feminino" }],
  ["faixa 18 a 29", { faixaIdade: "18 a 29" }],
  ["faixa 30 a 44", { faixaIdade: "30 a 44" }],
  ["faixa 45+", { faixaIdade: "45+" }],
  ["hospedagem Resorts", { hospedagem: "Resorts" }],
  ["hospedagem Hotéis", { hospedagem: "Hotéis" }],
  ["transporte Avião", { transporte: "Avião" }],
  ["transporte Carro", { transporte: "Carro" }],
  ["local Hot Beach", { localPesquisa: "Hot Beach" }],
  ["mês atual", { periodo: "Mês atual" }],
];

const antes = {};
const depois = {};

test("envio do lote de perfis distintos", async () => {
  for (const [nome, f] of filtros) antes[nome] = (await panorama(f)).pesquisasColetadas;
  const r = await post(lote);
  assert.deepEqual(r.rejeitadas, {});
  assert.equal(r.aceitas.length, 4);
  for (const [nome, f] of filtros) depois[nome] = (await panorama(f)).pesquisasColetadas;
});

const esperado = {
  total: 4,
  "genero Feminino": 2,
  "faixa 18 a 29": 1,
  "faixa 30 a 44": 1,
  "faixa 45+": 1, // só a de 61 anos; a de 500 é suspeita e fica de fora
  "hospedagem Resorts": 1,
  "hospedagem Hotéis": 3,
  "transporte Avião": 1,
  "transporte Carro": 2,
  "local Hot Beach": 4,
  "mês atual": 4,
};

for (const [nome, delta] of Object.entries(esperado)) {
  test(`Panorama com filtro "${nome}" soma ${delta}`, () => {
    assert.equal(depois[nome] - antes[nome], delta);
  });
}

test("NPS usa só as respostas válidas e a permanência tem formato numérico", async () => {
  const p = await panorama();
  assert.ok(p.respostasNps >= 4);
  assert.equal(p.promotores + p.neutros + p.detratores, 100);
  assert.equal(p.nps, p.promotores - p.detratores);
  assert.match(p.permanenciaMedia, /^\d+,\d$/);
});

test("sazonalidade tem 12 meses e origens somam no máximo 100%", async () => {
  const p = await panorama();
  assert.equal(p.sazonalidade.length, 12);
  assert.ok(p.sazonalidade.some((m) => m.pesquisas > 0));
  const soma = p.origensEstados.reduce((s, o) => s + o.percentual, 0);
  assert.ok(soma >= 98 && soma <= 102, `soma das origens = ${soma}`);
});

test("filtros desconhecidos ou 'todos' não quebram a rota", async () => {
  for (const f of [{ genero: "Todos" }, { periodo: "valor inexistente" }, { cidade: "Marília, SP" }, { cidade: "sem virgula" }]) {
    const p = await panorama(f);
    assert.equal(typeof p.pesquisasColetadas, "number");
  }
});

test("filtro sem nenhum resultado devolve Panorama vazio, não erro", async () => {
  const p = await panorama({ cidade: "Cidade Inexistente, ZZ" });
  assert.equal(p.pesquisasColetadas, 0);
  assert.equal(p.permanenciaMedia, "—");
  assert.deepEqual(p.origensEstados, []);
});

test("lista de pesquisas (/api/state) traz as pesquisas novas, com a sinalizada marcada", async () => {
  const r = await fetch(`${baseUrl}/api/state`, { headers: { cookie: await entrarComoAdmin() } });
  assert.equal(r.status, 200);
  const { pesquisas } = await r.json();
  assert.ok(Array.isArray(pesquisas));
  const ids = new Set(pesquisas.map((x) => x.id));
  for (const p of lote) assert.ok(ids.has(p.id), `pesquisa ${p.id} não está na lista`);
  const sinalizada = pesquisas.find((x) => x.id === lote[3].id);
  assert.equal(sinalizada.situacao, "Sinalizada");
  const normal = pesquisas.find((x) => x.id === lote[0].id);
  assert.equal(normal.situacao, "Sincronizada");
  assert.match(normal.protocolo, /^OTO117-/);
  assert.equal(normal.local, "Hot Beach Olímpia");
});
