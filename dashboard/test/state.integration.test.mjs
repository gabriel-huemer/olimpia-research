import assert from "node:assert/strict";
import test from "node:test";

// Requer o painel rodando (DASHBOARD_URL). Estas ações (curadoria, operadores, usuários) ainda
// funcionam sobre o estado em memória do servidor: os testes documentam o comportamento atual
// e devem ser revisados quando essas telas passarem a gravar no PostgreSQL.
const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";

const estado = async () => (await fetch(`${baseUrl}/api/state`)).json();
const acao = async (action, payload) => {
  const r = await fetch(`${baseUrl}/api/state`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload, usuario: "Teste Automatizado" }),
  });
  return { status: r.status, corpo: await r.json() };
};

test("GET /api/state devolve as coleções que as telas usam", async () => {
  const s = await estado();
  for (const k of ["dbConnected", "pendentesRevisao", "pesquisas", "operadores", "usuarios", "auditoria", "revisao", "formularios"]) {
    assert.ok(k in s, `falta ${k}`);
  }
  assert.equal(typeof s.dbConnected, "boolean");
  assert.ok(Array.isArray(s.pesquisas));
});

test("curadoria: item inexistente devolve 404", async () => {
  const { status, corpo } = await acao("CURAR_RESPOSTA", { id: 999999, decisao: "APROVAR" });
  assert.equal(status, 404);
  assert.match(corpo.error, /não encontrado/);
});

test("curadoria: aprovar, corrigir e excluir reduzem os pendentes e geram auditoria", async () => {
  const antes = await estado();
  const pendentes = antes.revisao.filter((r) => r.status === "PENDENTE");
  if (pendentes.length < 3) return; // itens de exemplo já consumidos neste servidor

  const [a, b, c] = pendentes;
  const auditoriaAntes = antes.auditoria.length;

  let r = await acao("CURAR_RESPOSTA", { id: a.id, decisao: "APROVAR" });
  assert.equal(r.corpo.revisao.find((x) => x.id === a.id).status, "APROVADA");

  r = await acao("CURAR_RESPOSTA", { id: b.id, decisao: "CORRIGIR", novoValor: "35", motivo: "confirmado com o turista" });
  assert.equal(r.corpo.revisao.find((x) => x.id === b.id).status, "CORRIGIDA");
  assert.equal(r.corpo.revisao.find((x) => x.id === b.id).valorSuspeito, "35");

  r = await acao("CURAR_RESPOSTA", { id: c.id, decisao: "EXCLUIR", motivo: "inconsistência confirmada" });
  assert.equal(r.corpo.revisao.find((x) => x.id === c.id).status, "EXCLUIDA");

  assert.equal(r.corpo.pendentesRevisao, antes.pendentesRevisao - 3);
  assert.equal(r.corpo.auditoria.length, auditoriaAntes + 3);
  assert.equal(r.corpo.auditoria[0].usuario, "Teste Automatizado");
});

test("operadores: criar gera código OTO-NNN ativo; alternar e redefinir registram auditoria", async () => {
  const nome = `Operador Teste ${Date.now()}`;
  let r = await acao("CRIAR_OPERADOR", { nome, localHabitual: "Hot Beach Olímpia" });
  const op = r.corpo.operadores.find((o) => o.nome === nome);
  assert.ok(op);
  assert.match(op.codigo, /^OTO-\d{3}$/);
  assert.equal(op.ativo, true);
  assert.equal(op.localHabitual, "Hot Beach Olímpia");

  r = await acao("ALTERNAR_STATUS_OPERADOR", { id: op.id });
  assert.equal(r.corpo.operadores.find((o) => o.id === op.id).ativo, false);
  assert.match(r.corpo.auditoria[0].alteracao, /desativado/);

  r = await acao("REDEFINIR_CODIGO_OPERADOR", { id: op.id });
  assert.match(r.corpo.auditoria[0].alteracao, /código redefinido/);
});

test("usuários: criar com perfil, atualizar perfil e status", async () => {
  const nome = `Usuario Teste ${Date.now()}`;
  let r = await acao("CRIAR_USUARIO", { nome, perfil: "Analista" });
  const u = r.corpo.usuarios.find((x) => x.nome === nome);
  assert.ok(u);
  assert.equal(u.perfil, "Analista");
  assert.equal(u.status, "Ativo");
  assert.match(u.email, /@/);

  r = await acao("ATUALIZAR_USUARIO", { id: u.id, perfil: "Visualizador", status: "Inativo" });
  const atualizado = r.corpo.usuarios.find((x) => x.id === u.id);
  assert.equal(atualizado.perfil, "Visualizador");
  assert.equal(atualizado.status, "Inativo");
});

test("ação desconhecida não altera nada e responde ok", async () => {
  const antes = await estado();
  const { status, corpo } = await acao("ACAO_QUE_NAO_EXISTE", {});
  assert.equal(status, 200);
  assert.equal(corpo.auditoria.length, antes.auditoria.length);
});
