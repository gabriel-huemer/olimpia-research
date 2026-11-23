import assert from "node:assert/strict";
import test from "node:test";

// Requer o painel rodando (DASHBOARD_URL) e as contas de teste (TEST_ADMIN_*).
import { baseUrl, entrarComoAdmin } from "./support/sessao.mjs";

const cookie = await entrarComoAdmin();
const estado = async () => (await fetch(`${baseUrl}/api/state`, { headers: { cookie } })).json();
test("GET /api/state devolve as coleções que as telas usam", async () => {
  const s = await estado();
  for (const k of ["dbConnected", "pendentesRevisao"]) {
    assert.ok(k in s, `falta ${k}`);
  }
  assert.equal(typeof s.dbConnected, "boolean");
});
