import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { chamar, entrar, entrarComoAdmin } from "./support/sessao.mjs";

const admin = chamar(await entrarComoAdmin());
const marca = randomUUID().slice(0, 8);
const consultar = async (q) => {
  const r = await admin(`/api/auditoria?${new URLSearchParams(q)}`);
  assert.equal(r.status, 200);
  return r.json();
};

test("só a área Sistema consulta", async () => {
  assert.equal((await chamar(null)("/api/auditoria")).status, 401);
  const perfil = (await (await admin("/api/admin/perfis", { method: "POST", body: { nome: `Aud ${marca}`, areas: { coleta: true } } })).json()).perfil;
  const email = `aud.${marca}@exemplo.com`, senha = `Auditoria-${marca}-1`;
  await admin("/api/admin/usuarios", { method: "POST", body: { nome: `Nome ${marca}`, email, perfilId: perfil.id, senha } });
  assert.equal((await chamar((await entrar(email, senha)).cookie)("/api/auditoria")).status, 403);
});

test("registra autor e item, filtra por busca e ação e não mostra hash de senha", async () => {
  const d = await consultar({ busca: marca, acao: "Inseriu" });
  const u = d.registros.find((r) => r.item === "Usuário");
  assert.equal(u.usuario, "Admin de Teste");
  assert.equal(u.alteracao, `Nome ${marca}`);
  assert.ok(d.registros.every((r) => r.acao === "Inseriu"));
  assert.doesNotMatch(JSON.stringify(await consultar({ limite: "500" })), /\$2[aby]\$/);
  assert.deepEqual((await consultar({ busca: marca, acao: "Excluiu" })).registros, []);
});

test("paginação por cursor não repete registros", async () => {
  const a = await consultar({ limite: "5" });
  assert.equal(a.registros.length, 5);
  const b = await consultar({ limite: "5", antes: a.proximo });
  const ids = new Set(a.registros.map((r) => r.id));
  assert.ok(b.registros.every((r) => !ids.has(r.id)));
});

test("decisão de curadoria aparece com o protocolo", async () => {
  const d = await consultar({ acao: "Corrigiu", limite: "20" });
  for (const r of d.registros) {
    assert.match(r.protocolo, /^\w+-\d+/);
    assert.match(r.alteracao, /→/);
  }
});

test("filtros inválidos são ignorados, não viram erro; não existe escrita", async () => {
  await consultar({ usuario: "' OR 1=1", acao: "x", dias: "-1", antes: "abc", limite: "-3", busca: "%_'\\\0" });
  assert.equal((await admin("/api/auditoria", { method: "POST", body: {} })).status, 405);
  assert.equal((await admin("/api/auditoria", { method: "DELETE" })).status, 405);
});
