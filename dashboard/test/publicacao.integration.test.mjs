import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin } from "./support/sessao.mjs";

const admin = chamar(await entrarComoAdmin());
const publico = async () => (await (await fetch(`${baseUrl}/api/publico`)).json()).indicadores;
const publicar = (codigos, quem = admin) => quem("/api/publicacao", { method: "PUT", body: { codigos } });

test("só a área Sistema escolhe; visitante vê só o resultado", async () => {
  const anon = chamar(null);
  assert.equal((await anon("/api/publicacao")).status, 401);
  assert.equal((await publicar(["nps"], anon)).status, 401);
  const m = randomUUID().slice(0, 8);
  const perfil = (await (await admin("/api/admin/perfis", { method: "POST", body: { nome: `Pub ${m}`, areas: { coleta: true } } })).json()).perfil;
  const email = `pub.${m}@exemplo.com`, senha = `Publica-${m}-1`;
  await admin("/api/admin/usuarios", { method: "POST", body: { nome: "Sem Sistema", email, perfilId: perfil.id, senha } });
  assert.equal((await publicar(["nps"], chamar((await entrar(email, senha)).cookie))).status, 403);
  assert.equal((await fetch(`${baseUrl}/publico`)).status, 200);
});

test("nada é público sem aprovação; aprovar publica e retirar despublica", async () => {
  assert.equal((await publicar([])).status, 200);
  assert.deepEqual(await publico(), []);
  await publicar(["idades", "nps"]);
  assert.ok((await publico()).every((i) => ["idades", "nps"].includes(i.codigo)));
  assert.ok((await publico()).some((i) => i.codigo === "idades"));
  await publicar(["nps"]);
  assert.ok(!(await publico()).some((i) => i.codigo === "idades"));
  await publicar([]);
  assert.deepEqual(await publico(), []);
});

test("a prévia mostra exatamente o que ficaria público, sem publicar", async () => {
  await publicar([]);
  const { indicadores } = await (await admin("/api/publicacao?previa=idades,motivos")).json();
  assert.deepEqual(await publico(), []);
  await publicar(["idades", "motivos"]);
  assert.deepEqual(await publico(), indicadores);
  await publicar([]);
});

test("seleção inválida é recusada e não muda nada", async () => {
  await publicar(["nps"]);
  for (const c of [null, "nps", ["o_que_falta"], [1], ["nps", "'; DROP"]]) assert.equal((await publicar(c)).status, 400);
  const { itens } = await (await admin("/api/publicacao")).json();
  assert.deepEqual(itens.filter((i) => i.publico).map((i) => i.codigo), ["nps"]);
  await publicar([]);
});

test("a mudança fica na auditoria com o autor", async () => {
  await publicar([]);
  await publicar(["gasto"]);
  const { registros } = await (await admin("/api/auditoria?limite=5")).json();
  assert.ok(registros.some((r) => r.item === "Publicação" && r.usuario === "Admin de Teste"));
  await publicar([]);
});

test("só /publico pode ser incorporado em outro site", async () => {
  const csp = async (p) => (await fetch(`${baseUrl}${p}`)).headers.get("content-security-policy");
  assert.equal(await csp("/publico"), null);
  for (const p of ["/analises/panorama", "/administracao", "/api/analytics"]) assert.match(await csp(p), /frame-ancestors/);
});
