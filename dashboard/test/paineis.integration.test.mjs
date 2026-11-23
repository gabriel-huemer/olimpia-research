import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrarComoAdmin } from "./support/sessao.mjs";

// Banco DESCARTÁVEL. Cada teste isola o próprio recorte com uma combinação local+gênero+hospedagem e compara antes/depois.
const dispositivo = randomUUID();
const enviar = async (lista) => {
  const inicio = Date.now() - 600_000;
  const pesquisas = lista.map((r) => ({
    id: randomUUID(), protocolo: 1_000_000 + Math.floor(Math.random() * 900_000_000), pesquisador: "OTO482",
    local: "Praça da Matriz", dispositivo, versaoQuestionario: 1,
    iniciadaEm: new Date(inicio).toISOString(), finalizadaEm: new Date(inicio + 60_000).toISOString(),
    respostas: Object.entries(r.respostas).map(([chave, valor]) => ({ chave, valor })), sinalizacoes: r.sinais ?? [],
  }));
  const r = await fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
    body: JSON.stringify({ pesquisas }),
  });
  assert.equal((await r.json()).aceitas.length, lista.length);
};
const painel = async (aba, filtros = {}, f = fetch) => {
  const url = `/api/analytics?${new URLSearchParams({ aba, periodo: "Últimos 30 dias", ...filtros })}`;
  const r = await (f === fetch ? fetch(baseUrl + url) : f(url));
  assert.equal(r.status, 200);
  return (await r.json())[aba];
};
const n = (fatias, rotulo) => fatias.find((f) => f.rotulo === rotulo)?.n ?? 0;

test("aba desconhecida é 400; sem aba devolve o Panorama e as opções reais de filtro", async () => {
  assert.equal((await fetch(`${baseUrl}/api/analytics?aba=__proto__`)).status, 400);
  const j = await (await fetch(`${baseUrl}/api/analytics`)).json();
  assert.ok(j.panorama);
  assert.ok(j.opcoes.locais.includes("Praça da Matriz"));
  assert.ok(j.opcoes.periodos.includes(`Ano ${new Date().getFullYear()}`));
});

test("infraestrutura: notas 5/3/1, ignora 'não utilizei', expectativa e PcD", async () => {
  const f = { localPesquisa: "Praça da Matriz" };
  const antes = await painel("infraestrutura", f);
  await enviar([
    { respostas: { servico_38: "Ótimo", expectativa: "Sim", pcd: "Sim", pcd_tipo: "Física, Visual" } },
    { respostas: { servico_38: "Não utilizei", expectativa: "Em parte", pcd: "Não" } },
  ]);
  const depois = await painel("infraestrutura", f);
  const av = (p) => p.servicos.find((s) => s.nome === "Acessibilidade para PCD")?.avaliacoes ?? 0;
  assert.equal(av(depois) - av(antes), 1);
  assert.equal(n(depois.expectativa, "Em parte") - n(antes.expectativa, "Em parte"), 1);
  assert.equal(n(depois.tiposPcd, "Visual") - n(antes.tiposPcd, "Visual"), 1);
  for (const s of depois.servicos) assert.ok(s.nota >= 1 && s.nota <= 5);
});

test("texto livre não aparece para visitante, só para quem tem login", async () => {
  const marca = `Falta sombra ${randomUUID()}`;
  await enviar([{ respostas: { o_que_falta: marca } }]);
  assert.equal((await painel("infraestrutura")).oQueFalta, null);
  const admin = chamar(await entrarComoAdmin());
  assert.ok((await painel("infraestrutura", {}, admin)).oQueFalta.includes(marca));
});

test("impacto: gasto suspeito fica fora; gasto por renda cruza as duas respostas", async () => {
  const antes = await painel("impacto");
  const faixa = "Mais de 20 Salários Mínimos (Acima de R$ 32.420,00)";
  await enviar([
    { respostas: { gasto_diario: 1000, renda: faixa } },
    { respostas: { gasto_diario: 999999, renda: faixa }, sinais: [{ chave: "gasto_diario", mensagem: "alto", status: "confirmed" }] },
  ]);
  const depois = await painel("impacto");
  assert.equal(depois.respostasGasto - antes.respostasGasto, 1);
  assert.equal(n(depois.renda, faixa) - n(antes.renda, faixa), 2);
  const por = (p) => p.gastoPorRenda.find((g) => g.faixa === faixa)?.n ?? 0;
  assert.equal(por(depois) - por(antes), 1);
});

test("perfil: faixa etária, múltipla escolha e destinos concorrentes", async () => {
  const antes = await painel("perfil");
  await enviar([{ respostas: { idade: 65, motivos: "Descanso, Clima", considerou_outro: "Sim", destinos: "Caldas Novas, GO" } }]);
  const depois = await painel("perfil");
  assert.equal(n(depois.idades, "45+") - n(antes.idades, "45+"), 1);
  for (const m of ["Descanso", "Clima"]) assert.equal(n(depois.motivos, m) - n(antes.motivos, m), 1);
  assert.ok(n(depois.concorrencia, "Caldas Novas, GO") >= 1);
});

test("perfil: cidade com poucas respostas não é exposta nem vira filtro", async () => {
  await enviar([{ respostas: { estado: "Acre (AC)", cidade: "Jordão" } }]);
  const p = await painel("perfil", { localPesquisa: "Praça da Matriz" });
  for (const c of p.cidades) assert.ok(c.cidade === "Outras cidades" || c.respostas >= 5);
});

test("atrações: visitas avaliadas e meio de transporte", async () => {
  const antes = await painel("atracoes");
  await enviar([{ respostas: { atrativo_49: "Regular", transporte: "Aéreo", aeroporto: "Táxi" } }]);
  const depois = await painel("atracoes");
  const v = (p) => p.atrativos.find((a) => a.nome === "Museu do Folclore")?.avaliacoes ?? 0;
  assert.equal(v(depois) - v(antes), 1);
  assert.equal(n(depois.transporte, "Aéreo") - n(antes.transporte, "Aéreo"), 1);
  assert.equal(n(depois.aeroporto, "Táxi") - n(antes.aeroporto, "Táxi"), 1);
});

test("recorte vazio devolve listas vazias e nulos, nunca números inventados", async () => {
  const f = { cidade: "Cidade Inexistente, ZZ" };
  assert.deepEqual((await painel("infraestrutura", f)).servicos, []);
  assert.equal((await painel("infraestrutura", f)).gruposPcd, null);
  assert.equal((await painel("impacto", f)).gastoDiarioMedio, null);
  assert.deepEqual((await painel("perfil", f)).idades, []);
  assert.deepEqual((await painel("atracoes", f)).atrativos, []);
});

test("filtros maliciosos não quebram nem vazam detalhes", async () => {
  for (const v of ["'; DROP TABLE x;--", "%", "\\", "a".repeat(3000)]) {
    const r = await fetch(`${baseUrl}/api/analytics?${new URLSearchParams({ aba: "perfil", cidade: v, localPesquisa: v, genero: v, periodo: v })}`);
    assert.equal(r.status, 200, v.slice(0, 20));
  }
});
