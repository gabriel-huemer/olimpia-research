import assert from "node:assert/strict";
import test from "node:test";

// Requer o painel rodando (DASHBOARD_URL) e as contas de teste (TEST_ADMIN_*). Estas ações (operadores, formulários) ainda
// funcionam sobre o estado em memória do servidor: os testes documentam o comportamento atual
// e devem ser revisados quando essas telas passarem a gravar no PostgreSQL.
import { baseUrl, origin, entrarComoAdmin } from "./support/sessao.mjs";

const cookie = await entrarComoAdmin();
const estado = async () => (await fetch(`${baseUrl}/api/state`, { headers: { cookie } })).json();
const acao = async (action, payload) => {
  const r = await fetch(`${baseUrl}/api/state`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, cookie },
    body: JSON.stringify({ action, payload, usuario: "Teste Automatizado" }),
  });
  return { status: r.status, corpo: await r.json() };
};

test("GET /api/state devolve as coleções que as telas usam", async () => {
  const s = await estado();
  for (const k of ["dbConnected", "pendentesRevisao", "pesquisas", "formularios"]) {
    assert.ok(k in s, `falta ${k}`);
  }
  assert.equal(typeof s.dbConnected, "boolean");
  assert.ok(Array.isArray(s.pesquisas));
});

test("ação desconhecida é recusada (400) e não altera nada", async () => {
  const { status } = await acao("ACAO_QUE_NAO_EXISTE", {});
  assert.equal(status, 400);
});
