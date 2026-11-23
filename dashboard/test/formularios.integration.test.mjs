import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { baseUrl, chamar, entrarComoAdmin } from "./support/sessao.mjs";

// Publica versões novas no banco DESCARTÁVEL: elas só acrescentam perguntas, então os outros testes seguem valendo.
const admin = chamar(await entrarComoAdmin());
const acao = async (corpo, quem = admin) => {
  const r = await quem("/api/formularios", { method: "POST", body: corpo });
  return { status: r.status, ...(await r.json()) };
};
const versoes = async () => (await (await admin("/api/formularios")).json()).versoes;
const ver = async (id) => (await admin(`/api/formularios/${id}`)).json();
const doApp = async (token = process.env.SYNC_API_TOKEN) => {
  const r = await fetch(`${baseUrl}/api/v1/formulario`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.status, corpo: await r.json() };
};
const rascunho = async () => {
  const lista = (await acao({ acao: "criarRascunho" })).versoes ?? (await versoes());
  return ver(lista.find((v) => v.status === "RASCUNHO").id);
};
const marca = randomUUID().slice(0, 6);

test("permissões: anônimo e token errado são recusados", async () => {
  const anon = chamar(null);
  assert.equal((await anon("/api/formularios")).status, 401);
  assert.equal((await acao({ acao: "publicar" }, anon)).status, 401);
  assert.equal((await doApp(null)).status, 401);
});

test("o app recebe o formulário completo no formato do seed", async () => {
  const { status, corpo } = await doApp();
  assert.equal(status, 200);
  assert.ok(corpo.sections.length >= 10);
  const q = Object.fromEntries(corpo.questions.map((x) => [x.key, x]));
  assert.equal(q.estado.type, "state");
  assert.ok(q.estado.options.every((o) => o.uf));
  assert.equal(q.aeroporto.dependsOn.key, "transporte");
  assert.equal(q.servico_27.type, "rating");
  assert.equal(q.atrativo_60.section, 8);
  assert.equal(q.idade.suspectMax, 100);
  const layout = JSON.parse(await readFile(new URL("../src/lib/formularios/layout-app.json", import.meta.url), "utf8"));
  // Tudo o que o app já tinha chega igual (o banco só acrescenta). A posição é recalculada.
  for (const { position, ...o } of layout.questions) {
    const { position: _, ...r } = q[o.key];
    assert.ok(position > 0 && _ > 0);
    assert.deepEqual(r, o, o.key);
  }
  for (const x of corpo.questions) {
    for (const k of ["key", "section", "position", "type", "label", "xlsxColumn"]) assert.ok(x[k] !== undefined && x[k] !== null, `${x.key}.${k}`);
  }
});

test("rascunho: um por vez, cópia fiel da ativa", async () => {
  const r = await rascunho();
  assert.equal((await acao({ acao: "criarRascunho" })).status, 409);
  const ativa = await ver((await versoes()).find((v) => v.status === "ATIVA").id);
  assert.equal(r.numero, ativa.numero + 1);
  const limpo = (v) => v.secoes.map((s) => [s.titulo, s.perguntas.map((p) => [p.codigo, p.enunciado, p.tipo, p.opcoes, p.min, p.max])]);
  assert.deepEqual(limpo(r).slice(0, 10).map((s) => s[0]), limpo(ativa).slice(0, 10).map((s) => s[0]));
});

test("rascunho não chega ao app e pergunta original é protegida", async () => {
  const r = await rascunho();
  assert.notEqual((await doApp()).corpo.version, r.numero);
  const idade = r.secoes.flatMap((s) => s.perguntas).find((p) => p.codigo === "idade");
  assert.equal((await acao({ acao: "removerPergunta", perguntaId: idade.id })).status, 409);
});

test("versão publicada não pode ser editada", async () => {
  await rascunho();
  const ativa = await ver((await versoes()).find((v) => v.status === "ATIVA").id);
  const p = ativa.secoes[0].perguntas[0];
  assert.equal((await acao({ acao: "editarPergunta", perguntaId: p.id, enunciado: "x" })).status, 404);
  assert.equal((await acao({ acao: "adicionarPergunta", secaoId: ativa.secoes[0].id, tipo: "TEXTO", enunciado: "x" })).status, 404);
});

test("entradas inválidas são recusadas", async () => {
  const r = await rascunho();
  const s = r.secoes[0].id;
  for (const c of [
    { acao: "toString" }, { acao: "" }, { acao: "adicionarSecao", titulo: " " }, { acao: "adicionarSecao", titulo: "x".repeat(121) },
    { acao: "adicionarPergunta", secaoId: s, tipo: "MATRIZ_AVALIACAO", enunciado: "x" },
    { acao: "adicionarPergunta", secaoId: s, tipo: "UNICA_ESCOLHA", enunciado: "x", opcoes: ["só uma"] },
    { acao: "adicionarPergunta", secaoId: s, tipo: "NUMERO", enunciado: "x", min: 10, max: 1 },
    { acao: "adicionarPergunta", secaoId: s, tipo: "TEXTO", enunciado: "x", condicao: { key: "transporte", values: ["Aéreo"] } },
    { acao: "adicionarPergunta", secaoId: s, tipo: "TEXTO", enunciado: "x", condicao: { key: "estado", values: ["Inexistente"] } },
  ]) assert.equal((await acao(c)).status, 400, JSON.stringify(c));
  assert.equal((await acao({ acao: "adicionarPergunta", secaoId: r.secoes[6].id, tipo: "TEXTO", enunciado: "x" })).status, 409);
  assert.equal((await acao({ acao: "adicionarPergunta", secaoId: s, tipo: "UNICA_ESCOLHA", enunciado: `x ${marca}`, opcoes: ["A", "A"] })).status, 409);
  assert.deepEqual((await ver(r.id)).perguntas, r.perguntas);
});

test("publicar: app recebe a pergunta nova, respostas da versão antiga e da nova são aceitas", async () => {
  const r = await rascunho();
  const secao = r.secoes.find((s) => s.titulo.startsWith("Decisão")) ?? r.secoes[2];
  const antes = (await versoes()).find((v) => v.status === "ATIVA");
  assert.equal(
    (await acao({
      acao: "adicionarPergunta", secaoId: secao.id, tipo: "UNICA_ESCOLHA", enunciado: `Gostou ${marca}?`, opcoes: ["Sim", "Não", "Talvez, sim"],
      condicao: { key: "considerou_outro", values: ["Sim"] },
    })).status, 200
  );
  assert.equal((await acao({ acao: "publicar" })).status, 200);
  assert.equal((await versoes()).find((v) => v.id === antes.id).status, "ENCERRADA");

  const { corpo } = await doApp();
  assert.equal(corpo.version, r.numero);
  const nova = corpo.questions.find((q) => q.label === `Gostou ${marca}?`);
  assert.equal(nova.type, "single");
  assert.deepEqual(nova.dependsOn, { key: "considerou_outro", values: ["Sim"] });

  const enviar = async (versao, respostas) => {
    const inicio = Date.now() - 60_000;
    const p = {
      id: randomUUID(), protocolo: 1 + Math.floor(Math.random() * 900_000_000), pesquisador: "OTO305", dispositivo: randomUUID(), versaoQuestionario: versao,
      iniciadaEm: new Date(inicio).toISOString(), finalizadaEm: new Date(inicio + 1000).toISOString(), respostas,
    };
    const x = await fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
      body: JSON.stringify({ pesquisas: [p] }),
    });
    assert.equal((await x.json()).aceitas.length, 1);
    return `OTO305-${String(p.protocolo).padStart(4, "0")}`;
  };
  const total = async (id) => (await versoes()).find((v) => v.id === id).respostas;
  const [na, nn] = [await total(antes.id), await total(r.id)];
  await enviar(antes.numero, [{ chave: "idade", valor: 40 }]);
  const protocolo = await enviar(r.numero, [{ chave: "idade", valor: 40 }, { chave: nova.key, valor: "Talvez, sim" }]);
  assert.deepEqual([await total(antes.id), await total(r.id)], [na + 1, nn + 1]);
  const { linhas } = await (await admin(`/api/pesquisas/exportar?busca=${protocolo}`)).json();
  assert.equal(linhas[0][nova.key], "Talvez, sim");
});

test("publicações simultâneas: só uma vence", async () => {
  await rascunho();
  const r = await Promise.all([acao({ acao: "publicar" }), acao({ acao: "publicar" })]);
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
});

test("seção vazia impede publicar e pode ser removida", async () => {
  const r = await rascunho();
  await acao({ acao: "adicionarSecao", titulo: `Vazia ${marca}` });
  assert.equal((await acao({ acao: "publicar" })).status, 409);
  const s = (await ver(r.id)).secoes.at(-1);
  assert.equal((await acao({ acao: "removerSecao", secaoId: s.id })).status, 200);
  assert.equal((await acao({ acao: "removerSecao", secaoId: r.secoes.at(-1).id })).status, 409);
  await acao({ acao: "publicar" });
});
