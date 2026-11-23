import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin, origin } from "./support/sessao.mjs";
import { buildXlsxBytes } from "../src/lib/excel.ts";

const cookie = await entrarComoAdmin();
const admin = chamar(cookie);
const enviar = async (bytes, { confirmar = false, sessao = cookie } = {}) => {
  const r = await fetch(`${baseUrl}/api/importacoes?nome=teste.xlsx${confirmar ? "&confirmar=1" : ""}`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", origin, ...(sessao && { cookie: sessao }) },
    body: bytes,
  });
  return { status: r.status, corpo: await r.json() };
};
const marca = () => `Falta ${randomUUID()}`;
const linha = (extra = {}) => ({
  "Data da pesquisa": "15/03/2024", Local: "Praça da Matriz", estado: "São Paulo (SP)", cidade: "Marília", idade: 35, genero: "Feminino",
  "Gasto médio diário em Olímpia": "1.234", motivos: "Descanso, Clima", servico_27: "Ótimo", o_que_falta: marca(), ...extra,
});
const planilha = (...l) => buildXlsxBytes("Dados", l);
const total = async () => (await (await admin("/api/pesquisas?origem=IMPORTACAO")).json()).total;

test("só a área Sistema importa", async () => {
  assert.equal((await enviar(planilha(linha()), { sessao: null })).status, 401);
  const m = randomUUID().slice(0, 8);
  const perfil = (await (await admin("/api/admin/perfis", { method: "POST", body: { nome: `Imp ${m}`, areas: { coleta: true } } })).json()).perfil;
  const email = `imp.${m}@exemplo.com`, senha = `Importa-${m}-1`;
  await admin("/api/admin/usuarios", { method: "POST", body: { nome: "Sem Sistema", email, perfilId: perfil.id, senha } });
  assert.equal((await enviar(planilha(linha()), { sessao: (await entrar(email, senha)).cookie })).status, 403);
});

test("a prévia não grava nada", async () => {
  const antes = await total();
  const r = await enviar(planilha(linha(), linha({ idade: "abc" }), linha({ idade: 130 })));
  assert.equal(r.status, 200);
  assert.deepEqual([r.corpo.total, r.corpo.validas, r.corpo.totalErros, r.corpo.alertas], [3, 2, 1, 1]);
  assert.equal(r.corpo.erros[0].linha, 3);
  assert.equal(await total(), antes);
});

test("importa, aparece nas pesquisas com data, local, cidade e valores certos, e não duplica", async () => {
  const antes = await total();
  const a = linha(), b = linha({ idade: 130 });
  const bytes = planilha(a, a, b, linha({ "Data da pesquisa": "" }));
  const r = await enviar(bytes, { confirmar: true });
  assert.equal(r.status, 201);
  assert.deepEqual([r.corpo.validas, r.corpo.duplicadas, r.corpo.totalErros], [2, 1, 1]);
  assert.equal((await total()) - antes, 2);

  const { linhas } = await (await admin("/api/pesquisas/exportar?origem=IMPORTACAO")).json();
  const l = linhas.find((x) => x.o_que_falta === a.o_que_falta);
  assert.match(l.Protocolo, /^IMP-\d{6}$/);
  assert.equal(l.Coletada.slice(0, 10), "15/03/2024");
  assert.equal(l.Local, "Praça da Matriz");
  assert.equal(l.cidade, "Marília, SP");
  assert.equal(l.gasto_diario, "1234");
  assert.equal(l.motivos, "Descanso; Clima");
  assert.equal(l["Avaliação [Hospedagem]"], "OTIMO");
  assert.equal(linhas.find((x) => x.o_que_falta === b.o_que_falta).Situacao, "EM_REVISAO");

  assert.equal((await enviar(bytes, { confirmar: true })).status, 400); // nada novo
  const misto = await enviar(planilha(a, linha()), { confirmar: true }); // outro arquivo, uma linha repetida
  assert.deepEqual([misto.corpo.validas, misto.corpo.duplicadas], [1, 1]);
  const { importacoes } = await (await admin("/api/importacoes")).json();
  assert.equal(importacoes[0].arquivo, "teste.xlsx");
  assert.equal(importacoes[0].importadas, 1);
});

test("duas importações simultâneas do mesmo arquivo gravam uma vez só", async () => {
  const antes = await total();
  const bytes = planilha(linha());
  const r = await Promise.all([1, 2, 3].map(() => enviar(bytes, { confirmar: true })));
  assert.equal(r.filter((x) => x.status === 201).length, 1);
  assert.ok(r.every((x) => [201, 400, 409].includes(x.status)));
  assert.equal((await total()) - antes, 1);
});

test("a planilha baixada como modelo é reconhecida", async () => {
  const { colunas } = await (await admin("/api/importacoes")).json();
  const r = await enviar(planilha(Object.fromEntries(colunas.map((c) => [c, c === "Data da pesquisa" ? "15/03/2024" : c === "Idade" ? 1 : ""]))));
  assert.deepEqual(r.corpo.ignoradas, []);
  assert.equal(r.corpo.reconhecidas, colunas.length - 2);
});

test("arquivos inválidos são recusados com mensagem", async () => {
  for (const b of [Buffer.from("lixo"), Buffer.from("PK\x03\x04xx"), Buffer.alloc(0), planilha({ a: 1, b: 2 })]) {
    const r = await enviar(b);
    assert.equal(r.status, 400);
    assert.ok(r.corpo.erro);
  }
  assert.equal((await enviar(Buffer.alloc(9 * 1024 * 1024, 65))).status, 413);
  const futuro = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
  assert.equal((await enviar(planilha(linha({ "Data da pesquisa": futuro })))).corpo.totalErros, 1);
});
