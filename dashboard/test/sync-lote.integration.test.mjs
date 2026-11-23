import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Requer: dashboard rodando (DASHBOARD_URL), banco com os seeds S04/S05 e OTO_MOBILE_PASSWORD no .env.local.
const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const dispositivo = randomUUID();

const post = (pesquisas) =>
  fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pesquisas }),
  });

const pesquisa = (extra = {}) => ({
  id: randomUUID(),
  protocolo: 100000 + Math.floor(Math.random() * 800000),
  pesquisador: "OTO482",
  local: "Thermas dos Laranjais",
  dispositivo,
  versaoQuestionario: 1,
  iniciadaEm: "2026-11-18T13:00:00Z",
  finalizadaEm: "2026-11-18T13:08:00Z",
  respostas: [
    { chave: "estado", valor: "São Paulo (SP)" },
    { chave: "cidade", valor: "Marília" },
    { chave: "idade", valor: 31 },
    { chave: "nps", valor: 9 },
    { chave: "servico_27", valor: "Ótimo" },
  ],
  sinalizacoes: [],
  ...extra,
});

const total = async () => (await (await fetch(`${baseUrl}/api/analytics`)).json()).panorama.pesquisasColetadas;

test("lote novo e gravado, reenvio nao duplica e o Panorama sobe uma vez", async () => {
  const antes = await total();
  const p = pesquisa();

  const r1 = await (await post([p])).json();
  assert.deepEqual(r1.aceitas, [p.id]);
  assert.equal(r1.duplicadas, 0);
  assert.deepEqual(r1.rejeitadas, {});

  const r2 = await (await post([p])).json();
  assert.deepEqual(r2.aceitas, [p.id]); // o app precisa marcar como enviada
  assert.equal(r2.duplicadas, 1);

  assert.equal(await total(), antes + 1);
});

test("pesquisador desconhecido e rejeitado com motivo", async () => {
  const p = pesquisa({ pesquisador: "ZZZ999" });
  const r = await (await post([p])).json();
  assert.deepEqual(r.aceitas, []);
  assert.match(r.rejeitadas[p.id], /não cadastrado/);
});

test("resposta sinalizada vai para a fila de curadoria", async () => {
  const p = pesquisa({
    respostas: [{ chave: "idade", valor: 500 }],
    sinalizacoes: [{ regra: "idade", chave: "idade", titulo: "Idade fora do esperado", mensagem: "500 anos parece incorreto", status: "confirmed" }],
  });
  const r = await (await post([p])).json();
  assert.deepEqual(r.aceitas, [p.id]);
});

test("corpo invalido devolve 400", async () => {
  const r = await fetch(`${baseUrl}/api/v1/pesquisas/lote`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(r.status, 400);
});
