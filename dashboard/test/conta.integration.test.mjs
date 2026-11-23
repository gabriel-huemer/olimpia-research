import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin } from "./support/sessao.mjs";

const admin = chamar(await entrarComoAdmin());
const m = randomUUID().slice(0, 8);

async function novaConta(sufixo) {
  const perfil = (await (await admin("/api/admin/perfis", { method: "POST", body: { nome: `Conta ${m}${sufixo}`, areas: { coleta: true } } })).json()).perfil;
  const email = `conta.${m}${sufixo}@exemplo.com`, senha = `Primeira-${m}-1`;
  await admin("/api/admin/usuarios", { method: "POST", body: { nome: "Conta Teste", email, perfilId: perfil.id, senha } });
  return { email, senha, chamar: chamar((await entrar(email, senha)).cookie) };
}
const trocar = async (quem, atual, nova) => (await quem("/api/auth/senha", { method: "POST", body: { atual, nova } })).status;

test("trocar a própria senha: a nova entra e a antiga não", async () => {
  const c = await novaConta("a");
  const nova = `Segunda-${m}-2`;
  assert.equal(await trocar(chamar(null), c.senha, nova), 401);
  assert.equal(await trocar(c.chamar, "errada-123456", nova), 400);
  assert.equal(await trocar(c.chamar, c.senha, "curta1"), 400);
  assert.equal(await trocar(c.chamar, c.senha, c.senha), 400);
  assert.equal(await trocar(c.chamar, null, { a: 1 }), 400);
  assert.equal((await entrar(c.email, c.senha)).status, 200);
  assert.equal(await trocar(c.chamar, c.senha, nova), 200);
  assert.equal((await entrar(c.email, c.senha)).status, 401);
  assert.equal((await entrar(c.email, nova)).status, 200);
});

test("errar a senha atual várias vezes bloqueia", async () => {
  const c = await novaConta("b");
  for (let i = 0; i < 5; i++) await trocar(c.chamar, `errada-${i}-12345`, `Nova-${m}-33`);
  assert.equal(await trocar(c.chamar, c.senha, `Nova-${m}-33`), 429);
});

test("a senha nunca aparece na auditoria", async () => {
  const texto = await (await admin("/api/auditoria?limite=50")).text();
  assert.doesNotMatch(texto, /\$2[aby]\$|Segunda-|Primeira-/);
});

const cancelar = async (canceladas, token = process.env.SYNC_API_TOKEN) => {
  const r = await fetch(`${baseUrl}/api/v1/pesquisas/canceladas`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ canceladas }),
  });
  return { status: r.status, corpo: await r.json() };
};
const item = (extra = {}) => ({
  id: randomUUID(), pesquisador: "OTO305", motivo: "Turista desistiu",
  iniciadaEm: new Date(Date.now() - 60_000).toISOString(), canceladaEm: new Date().toISOString(), ...extra,
});

test("cancelada fica registrada com o motivo e não entra nos indicadores (RF23)", async () => {
  const ler = async () => (await admin("/api/visao-geral")).json();
  const antes = await ler();
  const c = item();
  assert.deepEqual((await cancelar([c])).corpo.aceitas, [c.id]);
  assert.deepEqual((await cancelar([c])).corpo.aceitas, [c.id], "reenviar não falha nem duplica");
  const depois = await ler();
  const n = (v) => v.canceladas.find((x) => x.motivo === "Turista desistiu")?.n ?? 0;
  assert.equal(n(depois), n(antes) + 1);
  assert.equal(depois.respostasNoAno, antes.respostasNoAno);
});

test("cancelada inválida ou sem token é recusada", async () => {
  assert.equal((await cancelar([item()], null)).status, 401);
  assert.equal((await cancelar("x")).status, 400);
  const ruins = [
    item({ id: "x" }), item({ motivo: " " }), item({ motivo: "x".repeat(101) }), item({ pesquisador: "ZZZ999" }),
    item({ canceladaEm: "2020-01-01T00:00:00Z" }), item({ iniciadaEm: "ontem" }), item({ pesquisador: 5 }), null, 7,
  ];
  assert.deepEqual((await cancelar(ruins)).corpo.aceitas, []);
});
