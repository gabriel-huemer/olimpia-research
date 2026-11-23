import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { chamar, entrarComoAdmin } from "./support/sessao.mjs";

const admin = chamar(await entrarComoAdmin());
const inserir = async (extra = {}, respostas = { idade: "42", genero: "Feminino" }) => {
  const r = await admin("/api/pesquisas", { method: "POST", body: { canal: "Telefone", data: "2026-11-20", respostas, ...extra } });
  return { status: r.status, ...(await r.json()) };
};
const listar = async (q = {}) => (await admin(`/api/pesquisas?${new URLSearchParams(q)}`)).json();

test("anônimo não lista, não insere e não exporta", async () => {
  const anon = chamar(null);
  for (const u of ["/api/pesquisas", "/api/pesquisas/exportar", "/api/formulario-ativo"]) assert.equal((await anon(u)).status, 401, u);
  assert.equal((await anon("/api/pesquisas", { method: "POST", body: {} })).status, 401);
});

test("formulário ativo traz as 10 seções e os itens das matrizes", async () => {
  const { secoes } = await (await admin("/api/formulario-ativo")).json();
  assert.equal(secoes.length, 10);
  assert.ok(secoes.flatMap((s) => s.campos).some((c) => c.chave === "servico_27" && c.opcoes.includes("Ótimo")));
});

test("inserção manual gera protocolo, aparece na lista e entra nas análises e na auditoria", async () => {
  const antes = await (await admin("/api/analytics?aba=perfil&periodo=Ano%202026")).json();
  const r = await inserir({}, { idade: 42, estado: "São Paulo (SP)", cidade: "Marília", motivos: ["Descanso", "Clima"], servico_27: "Ótimo", gasto_diario: "1.234,50" });
  assert.equal(r.status, 201);
  assert.match(r.protocolo, /^MAN-\d{4,}$/);
  const { pesquisas, total } = await listar({ busca: r.protocolo });
  assert.equal(total, 1);
  assert.equal(pesquisas[0].origem, "MANUAL");
  assert.equal(pesquisas[0].canal, "Telefone");
  assert.equal(pesquisas[0].cidade, "Marília, SP");
  assert.equal(pesquisas[0].operador, "Admin de Teste");
  const depois = await (await admin("/api/analytics?aba=perfil&periodo=Ano%202026")).json();
  const n = (d) => d.perfil.idades.find((f) => f.rotulo === "30 a 44")?.n ?? 0;
  assert.equal(n(depois) - n(antes), 1);
  const aud = await (await admin(`/api/auditoria?busca=${r.protocolo}`)).json();
  assert.ok(aud.registros.some((x) => x.usuario === "Admin de Teste" && x.item === "Pesquisa"));
});

test("valor fora da faixa entra como sinalizado e vai para a revisão", async () => {
  const r = await inserir({}, { idade: 130 });
  assert.equal(r.alertas, 1);
  assert.equal((await listar({ busca: r.protocolo, situacao: "EM_REVISAO" })).total, 1);
});

test("dados inválidos são recusados e nada é gravado", async () => {
  const antes = (await listar()).total;
  const futuro = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  for (const extra of [{ canal: "Fax" }, { data: "" }, { data: "2026-02-30" }, { data: futuro }, { localId: "99999999" }, { localId: "x" }, { respostas: {} }, { respostas: [] }, { respostas: null }]) {
    assert.equal((await inserir(extra)).status, 400, JSON.stringify(extra));
  }
  for (const respostas of [{ idade: "abc" }, { nps: 11 }, { inventada: "x" }, { servico_27: "Excelente" }, { data_chegada: "2026-02-30" }, { idade: { a: 1 } }, { avaliacao_servicos: "x" }]) {
    assert.equal((await inserir({}, respostas)).status, 400, JSON.stringify(respostas));
  }
  assert.equal((await listar()).total, antes);
});

test("protocolos simultâneos não se repetem", async () => {
  const r = await Promise.all(Array.from({ length: 8 }, () => inserir()));
  assert.equal(new Set(r.map((x) => x.protocolo)).size, 8);
});

test("filtros e paginação", async () => {
  const manuais = await listar({ origem: "MANUAL" });
  assert.ok(manuais.total > 0 && manuais.pesquisas.every((p) => p.origem === "MANUAL"));
  assert.ok((await listar({ mes: "2026-11" })).pesquisas.every((p) => p.coletada.slice(3, 10) === "11/2026"));
  assert.ok((await listar({ pagina: "99999" })).pagina >= 1);
  await listar({ mes: "x", operador: "' OR 1=1", local: "-1", situacao: "x", origem: "x", busca: "%_\\\0", pagina: "-5" });
  assert.equal((await listar({ operador: randomUUID() })).total, 0);
});

test("exportação traz as respostas com a mesma estrutura em todas as linhas", async () => {
  const r = await inserir({}, { idade: 33, servico_27: "Ruim" });
  const { linhas } = await (await admin(`/api/pesquisas/exportar?busca=${r.protocolo}`)).json();
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].idade, "33");
  assert.equal(linhas[0].Hospedagem, "RUIM");
  assert.ok("gasto_diario" in linhas[0]);
});
