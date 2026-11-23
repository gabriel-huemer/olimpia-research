import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin } from "./support/sessao.mjs";

const admin = chamar(await entrarComoAdmin());
const marca = randomUUID().slice(0, 8);
const listar = async (quem = admin, dias = 30) => (await (await quem(`/api/operadores?dias=${dias}`)).json()).operadores;
const criar = async (extra = {}) => {
  const { locais } = await (await admin("/api/operadores")).json();
  const nome = `Operador ${randomUUID().slice(0, 8)}`;
  const r = await admin("/api/operadores", { method: "POST", body: { nome, localId: locais[0].id, ...extra } });
  return { nome, status: r.status, ...(await r.json()) };
};
const editar = (id, body, quem = admin) => quem(`/api/operadores/${id}`, { method: "PATCH", body });
const enviar = async (pesquisador, sinalizada = false) => {
  const inicio = Date.now() - 600_000;
  const p = {
    id: randomUUID(), protocolo: 1 + Math.floor(Math.random() * 900_000_000), pesquisador, dispositivo: randomUUID(), versaoQuestionario: 1,
    iniciadaEm: new Date(inicio).toISOString(), finalizadaEm: new Date(inicio + 1000).toISOString(),
    respostas: [{ chave: "idade", valor: sinalizada ? 500 : 30 }],
    sinalizacoes: sinalizada ? [{ chave: "idade", mensagem: "x", status: "confirmed" }] : [],
  };
  const r = await fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
    body: JSON.stringify({ pesquisas: [p] }),
  });
  return (await r.json()).aceitas.length === 1;
};
async function soColeta() {
  const perfil = (await (await admin("/api/admin/perfis", { method: "POST", body: { nome: `Op ${randomUUID().slice(0, 8)}`, areas: { coleta: true } } })).json()).perfil;
  const email = `op.${randomUUID().slice(0, 8)}@exemplo.com`, senha = `Operador-${marca}-1`;
  await admin("/api/admin/usuarios", { method: "POST", body: { nome: "So Coleta", email, perfilId: perfil.id, senha } });
  return chamar((await entrar(email, senha)).cookie);
}

test("permissões: anônimo 401; Coleta vê sem o código e não altera; Sistema altera", async () => {
  const novo = await criar();
  assert.equal(novo.status, 201);
  assert.match(novo.codigo, /^OTO[A-Z2-9]{3}$/);
  assert.equal((await chamar(null)("/api/operadores")).status, 401);
  assert.equal((await chamar(null)("/api/visao-geral")).status, 401);
  const coleta = await soColeta();
  const visto = (await listar(coleta)).find((o) => o.id === novo.id);
  assert.equal(visto.codigo, null);
  assert.equal((await coleta("/api/operadores", { method: "POST", body: { nome: "x", localId: "1" } })).status, 403);
  assert.equal((await editar(novo.id, { ativo: false }, coleta)).status, 403);
  assert.equal((await listar()).find((o) => o.id === novo.id).codigo, novo.codigo);
});

test("operador criado no painel já consegue enviar pelo app; desativado não", async () => {
  const o = await criar();
  assert.equal(await enviar(o.codigo), true);
  assert.equal((await editar(o.id, { ativo: false })).status, 200);
  assert.equal(await enviar(o.codigo), false);
  const visto = (await listar()).find((x) => x.id === o.id);
  assert.equal(visto.ativo, false);
  assert.equal(visto.coletas, 1); // histórico preservado
});

test("desempenho: coletas, taxa de alerta, último envio e atraso", async () => {
  const o = await criar();
  let v = (await listar()).find((x) => x.id === o.id);
  assert.equal(v.atrasado, true);
  assert.equal(v.ultimoEnvio, null);
  await enviar(o.codigo);
  await enviar(o.codigo, true);
  v = (await listar()).find((x) => x.id === o.id);
  assert.equal(v.coletas, 2);
  assert.equal(v.taxaAlerta, 50);
  assert.equal(v.atrasado, false);
  assert.equal(v.porDia.length, 7);
});

test("redefinir código: o novo vale e o que estava na fila com o antigo ainda é aceito", async () => {
  const o = await criar();
  const r = await (await editar(o.id, { redefinirCodigo: true })).json();
  assert.notEqual(r.codigo, o.codigo);
  assert.equal(await enviar(r.codigo), true);
  assert.equal(await enviar(o.codigo), true);
  assert.equal((await listar()).find((x) => x.id === o.id).coletas, 2);
});

test("local novo é criado junto; dados inválidos são recusados", async () => {
  const novoLocal = `Local ${marca}`;
  const o = await criar({ novoLocal });
  assert.equal((await listar()).find((x) => x.id === o.id).local.nome, novoLocal);
  for (const extra of [{ nome: "  " }, { nome: "x".repeat(151) }, { localId: "999999" }, { localId: "abc" }]) {
    assert.equal((await criar(extra)).status, 400, JSON.stringify(extra).slice(0, 40));
  }
  assert.equal((await editar(randomUUID(), { ativo: true })).status, 404);
  assert.equal((await editar("abc", { ativo: true })).status, 404);
  assert.equal((await editar(o.id, {})).status, 400);
  assert.equal((await editar(o.id, { ativo: "sim" })).status, 400);
});

test("não dá para editar conta do painel pela rota de operadores", async () => {
  const eu = (await (await admin("/api/admin/usuarios")).json()).usuarios.find((u) => u.nome === "Admin de Teste");
  assert.equal((await editar(eu.id, { ativo: false })).status, 404);
});

test("visão geral conta as coletas de hoje e aponta o último protocolo", async () => {
  const antes = await (await admin("/api/visao-geral")).json();
  const o = await criar();
  await enviar(o.codigo);
  const depois = await (await admin("/api/visao-geral")).json();
  assert.ok(depois.respostasNoAno - antes.respostasNoAno === 1);
  assert.equal(depois.porDia.length, 7);
  assert.match(depois.ultimoProtocolo, new RegExp(`^${o.codigo}-`));
  assert.equal(depois.formulario.nome, "Pesquisa de Demanda Turística");
  assert.doesNotMatch(JSON.stringify(depois.operadores), /"codigo":"/);
});
