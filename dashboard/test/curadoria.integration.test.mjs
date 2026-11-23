import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin } from "./support/sessao.mjs";

// Requer painel rodando em banco DESCARTÁVEL (grava pesquisas e decisões), nunca oto nem oto_demo.
const admin = chamar(await entrarComoAdmin());
const anonimo = chamar(null);
const dispositivo = randomUUID();
const sufixo = Date.now();
const json = async (r) => ({ status: r.status, corpo: await r.json().catch(() => null) });
const sinal = (chave, mensagem = `${chave} ${randomUUID()}`) => ({ chave, mensagem, status: "confirmed" });

async function enviar(respostas, sinalizacoes) {
  const inicio = Date.now() - 600_000;
  const p = {
    id: randomUUID(), protocolo: 1_000_000 + Math.floor(Math.random() * 900_000_000), pesquisador: "OTO117",
    local: "Hot Beach Olímpia", dispositivo, versaoQuestionario: 1,
    iniciadaEm: new Date(inicio).toISOString(), finalizadaEm: new Date(inicio + 300_000).toISOString(), respostas, sinalizacoes,
  };
  const r = await fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SYNC_API_TOKEN}` },
    body: JSON.stringify({ pesquisas: [p] }),
  });
  assert.deepEqual((await r.json()).aceitas, [p.id]);
  return `OTO117-${p.protocolo}`;
}
const fila = async () => (await json(await admin("/api/curadoria"))).corpo.itens;
const itensDe = async (protocolo) => (await fila()).filter((i) => i.protocolo === protocolo);
const detalhe = async (id) => json(await admin(`/api/curadoria/${id}`));
const decidir = (id, body, quem = admin, headers) => quem(`/api/curadoria/${id}`, { method: "POST", body, headers });
const comIdade = async (valor = 500) => {
  const protocolo = await enviar([{ chave: "idade", valor }, { chave: "genero", valor: "Feminino" }], [sinal("idade")]);
  return { protocolo, item: (await itensDe(protocolo))[0] };
};
const contarIdade = async (faixaIdade) =>
  (await (await fetch(`${baseUrl}/api/analytics?${new URLSearchParams({ faixaIdade, periodo: "Últimos 30 dias" })}`)).json()).panorama.pesquisasColetadas;
const situacao = async (protocolo) =>
  (await json(await admin(`/api/pesquisas?busca=${protocolo}`))).corpo.pesquisas.find((p) => p.protocolo === protocolo)?.situacao;

async function usuarioCom(areas) {
  const marca = `${sufixo}-${randomUUID().slice(0, 6)}`;
  const perfil = (await json(await admin("/api/admin/perfis", { method: "POST", body: { nome: `Cur ${marca}`, areas } }))).corpo.perfil;
  const email = `cur.${marca}@exemplo.com`, senha = `Curadoria-${marca}`;
  const novo = await admin("/api/admin/usuarios", { method: "POST", body: { nome: "Curador Teste", email, perfilId: perfil.id, senha } });
  assert.equal(novo.status, 201);
  return chamar((await entrar(email, senha)).cookie);
}

test("a sinalização do app entra na fila, com detalhe e todas as respostas", async () => {
  const { protocolo, item } = await comIdade();
  assert.ok(item);
  assert.equal(item.pergunta, "Qual a sua idade?");
  const { status, corpo } = await detalhe(item.id);
  assert.equal(status, 200);
  assert.equal(corpo.protocolo, protocolo);
  assert.equal(corpo.valorOriginal, "500");
  assert.equal(corpo.mantidoPeloPesquisador, true);
  assert.ok(corpo.respostas.some((r) => r.valor === "Feminino" && !r.sinalizada));
  assert.ok(corpo.respostas.some((r) => r.valor === "500" && r.sinalizada));
});

test("a fila vem da mais antiga para a mais nova", async () => {
  await comIdade();
  await comIdade();
  const datas = (await fila()).map((i) => Date.parse(i.criadaEm));
  assert.deepEqual(datas, [...datas].sort((a, b) => a - b));
});

test("aprovar sem motivo: valor original passa a valer e a pesquisa é concluída", async () => {
  const antes = await contarIdade("45+");
  const { protocolo, item } = await comIdade(105);
  assert.equal(await contarIdade("45+"), antes);
  assert.equal(await situacao(protocolo), "EM_REVISAO");
  assert.equal((await decidir(item.id, { decisao: "APROVAR" })).status, 200);
  assert.equal(await contarIdade("45+"), antes + 1);
  assert.deepEqual(await itensDe(protocolo), []);
  assert.equal(await situacao(protocolo), "CONCLUIDA");
});

test("corrigir: o valor novo entra nos indicadores e o original continua guardado", async () => {
  const antes = await contarIdade("30 a 44");
  const { item } = await comIdade();
  assert.equal((await decidir(item.id, { decisao: "CORRIGIR", novoValor: "35", motivo: "erro de digitação" })).status, 200);
  assert.equal(await contarIdade("30 a 44"), antes + 1);
  const { corpo } = await detalhe(item.id);
  assert.equal(corpo.valorOriginal, "500");
  assert.equal(corpo.status, "CORRIGIDA");
  assert.equal(corpo.curador, "Admin de Teste");
  assert.equal(corpo.justificativa, "erro de digitação");
  assert.ok(corpo.respostas.some((r) => r.sinalizada && r.valor === "35"));
});

test("corrigir fora da faixa avisa, mas grava (RN13)", async () => {
  const { item } = await comIdade();
  const r = await json(await decidir(item.id, { decisao: "CORRIGIR", novoValor: "101", motivo: "confirmado" }));
  assert.equal(r.status, 200);
  assert.match(r.corpo.aviso, /faixa/i);
});

test("excluir tira a resposta dos indicadores e mantém a pesquisa", async () => {
  const totalAntes = await contarIdade("Todas"), faixaAntes = await contarIdade("45+");
  const { protocolo, item } = await comIdade(105);
  assert.equal((await decidir(item.id, { decisao: "EXCLUIR", motivo: "inconsistente" })).status, 200);
  assert.equal(await contarIdade("45+"), faixaAntes);
  assert.equal(await contarIdade("Todas"), totalAntes + 1);
  assert.equal(await situacao(protocolo), "CONCLUIDA");
});

test("dados inválidos dão 400 e o item continua na fila sem mudança", async () => {
  const { protocolo, item } = await comIdade();
  for (const corpo of [
    {}, { decisao: "OUTRA" },
    { decisao: "CORRIGIR", novoValor: "35" }, { decisao: "CORRIGIR", novoValor: "35", motivo: "   " },
    { decisao: "CORRIGIR", novoValor: "abc", motivo: "x" }, { decisao: "CORRIGIR", motivo: "x" },
    { decisao: "EXCLUIR" }, { decisao: "EXCLUIR", motivo: " " },
    { decisao: "APROVAR", motivo: "x".repeat(501) }, { decisao: "APROVAR", motivo: 5 },
  ]) assert.equal((await decidir(item.id, corpo)).status, 400, JSON.stringify(corpo).slice(0, 60));
  assert.equal((await itensDe(protocolo)).length, 1);
  assert.ok((await detalhe(item.id)).corpo.respostas.some((r) => r.sinalizada && r.valor === "500"));
});

test("inexistente ou malformado é 404; já decidido é 409", async () => {
  for (const id of ["999999999999", "abc", "-1", "99999999999999999999999"]) {
    assert.equal((await decidir(id, { decisao: "APROVAR" })).status, 404, id);
    assert.equal((await detalhe(id)).status, 404, id);
  }
  const { item } = await comIdade();
  assert.equal((await decidir(item.id, { decisao: "APROVAR" })).status, 200);
  assert.equal((await decidir(item.id, { decisao: "EXCLUIR", motivo: "x" })).status, 409);
});

test("duas decisões simultâneas: só uma vale", async () => {
  const { item } = await comIdade();
  const r = await Promise.all([1, 2, 3].map(() => decidir(item.id, { decisao: "APROVAR" })));
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409, 409]);
});

test("pesquisa só é concluída quando não resta pendência, mesmo com decisões simultâneas", async () => {
  for (let i = 0; i < 4; i++) {
    const protocolo = await enviar([{ chave: "idade", valor: 500 }, { chave: "pernoites", valor: 90 }], [sinal("idade"), sinal("pernoites")]);
    const itens = await itensDe(protocolo);
    assert.equal(itens.length, 2);
    if (i === 0) {
      await decidir(itens[0].id, { decisao: "APROVAR" });
      assert.equal(await situacao(protocolo), "EM_REVISAO");
      await decidir(itens[1].id, { decisao: "APROVAR" });
    } else {
      await Promise.all(itens.map((x) => decidir(x.id, { decisao: "APROVAR" })));
    }
    assert.equal(await situacao(protocolo), "CONCLUIDA");
  }
});

test("permissões: anônimo 401; só Sistema 403; Coleta aprova e não exclui; CSRF 403", async () => {
  const { item } = await comIdade();
  assert.equal((await anonimo("/api/curadoria")).status, 401);
  assert.equal((await anonimo(`/api/curadoria/${item.id}`)).status, 401);
  assert.equal((await decidir(item.id, { decisao: "APROVAR" }, anonimo)).status, 401);
  const sistema = await usuarioCom({ sistema: true });
  assert.equal((await sistema("/api/curadoria")).status, 403);
  assert.equal((await decidir(item.id, { decisao: "EXCLUIR", motivo: "x" }, sistema)).status, 403);
  const coleta = await usuarioCom({ coleta: true });
  assert.equal((await coleta("/api/curadoria")).status, 200);
  assert.equal((await decidir(item.id, { decisao: "EXCLUIR", motivo: "x" }, coleta)).status, 403);
  assert.equal((await decidir(item.id, { decisao: "APROVAR" }, admin, { origin: "https://evil.example" })).status, 403);
  assert.equal((await decidir(item.id, { decisao: "APROVAR", curadorId: randomUUID() }, coleta)).status, 200);
  assert.equal((await detalhe(item.id)).corpo.curador, "Curador Teste");
});

test("ingestão: sinalização sem valor aparece na fila e pode ser corrigida", async () => {
  const protocolo = await enviar([{ chave: "genero", valor: "Feminino" }], [sinal("idade")]);
  const [item] = await itensDe(protocolo);
  assert.ok(item, "sinalização perdida");
  const antes = await contarIdade("30 a 44");
  assert.equal((await decidir(item.id, { decisao: "CORRIGIR", novoValor: "40", motivo: "ligação" })).status, 200);
  assert.equal(await contarIdade("30 a 44"), antes + 1);
});

test("ingestão: dois alertas na mesma resposta ficam guardados e uma decisão resolve ambos", async () => {
  const protocolo = await enviar([{ chave: "acomp_65_mais", valor: 40 }], [sinal("acomp_65_mais", "Alerta um"), sinal("acomp_65_mais", "Alerta dois")]);
  const itens = await itensDe(protocolo);
  assert.equal(itens.length, 1);
  assert.deepEqual([...itens[0].motivos].sort(), ["Alerta dois", "Alerta um"]);
  assert.equal((await decidir(itens[0].id, { decisao: "APROVAR" })).status, 200);
  assert.deepEqual(await itensDe(protocolo), []);
  assert.equal(await situacao(protocolo), "CONCLUIDA");
});

test("/api/state: pendentes vêm do banco e a ação antiga não existe mais", async () => {
  const { item } = await comIdade();
  const { corpo } = await json(await admin("/api/state"));
  assert.equal(corpo.pendentesRevisao, (await fila()).length);
  assert.ok(!("revisao" in corpo));
  assert.equal((await admin("/api/state", { method: "POST", body: { action: "CURAR_RESPOSTA", payload: { id: item.id, decisao: "APROVAR" } } })).status, 400);
});
