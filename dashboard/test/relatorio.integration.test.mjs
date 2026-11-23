import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { hojeLocal } from "../src/lib/periodo.ts";
import { baseUrl } from "./support/sessao.mjs";

const buscar = async (rota, q = {}) => {
  const r = await fetch(`${baseUrl}${rota}?${new URLSearchParams(q)}`);
  return { status: r.status, corpo: await r.json() };
};
const relatorio = (q) => buscar("/api/relatorio", q);
const inicio = Date.now() - 300_000;
const segredo = `TEXTO-LIVRE-${randomUUID()}`;
const pesquisa = (respostas, sinalizacoes = []) => ({
  id: randomUUID(), protocolo: 1 + Math.floor(Math.random() * 900_000_000), pesquisador: "OTO117", local: "Hot Beach Olímpia",
  dispositivo: randomUUID(), versaoQuestionario: 1, iniciadaEm: new Date(inicio).toISOString(), finalizadaEm: new Date(inicio + 1000).toISOString(),
  respostas, sinalizacoes,
});
const enviar = async (pesquisas) =>
  (await (await fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
    body: JSON.stringify({ pesquisas }),
  })).json()).aceitas.length;

const hoje = hojeLocal(new Date(inicio));
const casos = [{ periodo: `Ano ${hoje.slice(0, 4)}` }, { periodo: hoje.slice(0, 7) }, { periodo: `${hoje}..${hoje}` }, { periodo: "Últimos 30 dias", genero: "Feminino" }];

test("visitante recebe o relatório, sem texto livre das respostas", async () => {
  assert.equal(await enviar([
    pesquisa([{ chave: "genero", valor: "Feminino" }, { chave: "nps", valor: 10 }, { chave: "servico_27", valor: "Ruim" }, { chave: "o_que_falta", valor: segredo }]),
    pesquisa([{ chave: "genero", valor: "Feminino" }, { chave: "gasto_diario", valor: 100 }]),
  ]), 2);
  const { status, corpo } = await relatorio({ periodo: `${hoje}..${hoje}` });
  assert.equal(status, 200);
  assert.equal(corpo.paineis.infraestrutura.oQueFalta, null);
  assert.ok(!JSON.stringify(corpo).includes(segredo));
});

for (const q of casos) {
  test(`números iguais aos da tela e série fecha com o total: ${JSON.stringify(q)}`, async () => {
    const { corpo: d } = await relatorio(q);
    const p = (await buscar("/api/analytics", q)).corpo.panorama;
    assert.equal(d.total.n, p.pesquisasColetadas);
    assert.equal(d.total.nps ?? 0, p.nps);
    assert.equal(d.total.retorno ?? 0, p.intencaoRetorno);
    assert.equal(d.total.permanencia === null ? "—" : d.total.permanencia.toFixed(1).replace(".", ","), p.permanenciaMedia);
    assert.equal(d.serie.reduce((s, x) => s + x.n, 0), d.total.n);
    assert.equal(d.qualidade.recebidas, d.total.n);
    assert.equal(d.locais.reduce((s, x) => s + x.n, 0), d.total.n);
    assert.ok(d.servicos.every((s) => s.otimo + s.regular + s.ruim === 100));
  });
}

test("resposta sinalizada conta em revisão e fica fora das médias", async () => {
  const q = { periodo: `${hoje}..${hoje}` };
  const antes = (await relatorio(q)).corpo;
  await enviar([pesquisa([{ chave: "gasto_diario", valor: 999_999 }], [{ chave: "gasto_diario", mensagem: "x", status: "confirmed" }])]);
  const depois = (await relatorio(q)).corpo;
  assert.equal(depois.total.n, antes.total.n + 1);
  assert.equal(depois.total.gasto, antes.total.gasto);
  assert.equal(depois.qualidade.emRevisao, antes.qualidade.emRevisao + 1);
});

test("período vazio, futuro ou inválido não quebra", async () => {
  for (const periodo of ["2001-01-01..2001-01-31", "2099-12", "x'; --", ""]) {
    const { status, corpo } = await relatorio({ periodo, cidade: "' OR 1=1" });
    assert.equal(status, 200);
    assert.equal(corpo.total.n, 0);
    assert.equal(corpo.total.nps, null);
    assert.deepEqual(corpo.serie, []);
  }
});
