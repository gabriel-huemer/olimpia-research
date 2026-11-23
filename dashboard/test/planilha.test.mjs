import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { buildXlsxBytes } from "../src/lib/excel.ts";
import { ErroPlanilha, lerPlanilha, paraIso } from "../src/lib/importacao/planilha.ts";
import { mapear } from "../src/lib/importacao/mapeamento.ts";

function zip(arquivos) {
  const locais = [], centrais = [];
  let pos = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const dados = deflateRawSync(Buffer.from(conteudo));
    const n = Buffer.from(nome);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(8, 8); l.writeUInt32LE(dados.length, 18); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(dados.length, 20); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(pos, 42);
    locais.push(l, n, dados); centrais.push(c, n); pos += 30 + n.length + dados.length;
  }
  const central = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(Object.keys(arquivos).length, 10); fim.writeUInt32LE(pos, 16);
  return Buffer.concat([...locais, central, fim]);
}

test("lê o próprio .xlsx exportado", () => {
  const g = lerPlanilha(Buffer.from(buildXlsxBytes("A", [{ Nome: "Zé & Cia", Idade: 30 }])));
  assert.deepEqual(g.slice(-2), [["Nome", "Idade"], ["Zé & Cia", 30]]);
});

test("lê .xlsx do Excel: textos compartilhados, formatação, células e linhas puladas", () => {
  const g = lerPlanilha(zip({
    "xl/sharedStrings.xml": "<sst><si><t>Cidade</t></si><si><r><t>São </t></r><r><t>Paulo &#38; região</t></r></si></sst>",
    "xl/worksheets/sheet1.xml": '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"/></row><row r="3"><c r="C3" t="s"><v>1</v></c><c r="D3"><v>45000.5</v></c></row></sheetData>',
  }));
  assert.equal(g[0][0], "Cidade");
  assert.deepEqual(g[1], []);
  assert.deepEqual(g[2], [null, null, "São Paulo & região", 45000.5]);
});

test("lê CSV com ponto e vírgula, aspas, quebra de linha no campo e windows-1252", () => {
  assert.deepEqual(lerPlanilha(Buffer.from('﻿a;b\r\n"x;""y""\nz";2\r\n')), [["a", "b"], ['x;"y"\nz', "2"]]);
  assert.deepEqual(lerPlanilha(Buffer.from("Olímpia,1", "latin1")), [["Olímpia", "1"]]);
});

test("arquivos ruins viram erro legível, sem travar", () => {
  for (const b of ["", "PK\x03\x04lixo", "a\0b"]) assert.throws(() => lerPlanilha(Buffer.from(b)), ErroPlanilha);
  assert.throws(() => lerPlanilha(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 1])), /xls antigo/);
  // bomba de descompressão
  assert.throws(() => lerPlanilha(zip({ "xl/worksheets/sheet1.xml": Buffer.alloc(70 * 1024 * 1024) })), ErroPlanilha);
  assert.throws(() => lerPlanilha(zip({ "xl/worksheets/sheet1.xml": '<row r="999999999"></row>' })), /linhas/);
});

test("datas: série do Excel, brasileira e ISO", () => {
  assert.equal(paraIso(45000.5), "2023-03-15");
  assert.equal(paraIso("5/3/2024 10:22:01"), "2024-03-05");
  assert.equal(paraIso("2024-03-05"), "2024-03-05");
  for (const v of ["30/02/2024", "x", "", null, 3]) assert.equal(paraIso(v), null);
});

const seed = JSON.parse(readFileSync(new URL("../src/lib/importacao/cabecalhos.json", import.meta.url)));
const alvos = Object.entries(seed).map(([chave, v]) => ({ chave, titulos: [v.titulo ?? ""], coluna: v.coluna }));

test("reconhece a planilha de tabulação inteira, inclusive as colunas sem título", () => {
  const cab = Array(75).fill(null);
  cab[0] = "Carimbo de data/hora";
  for (const a of alvos) cab[a.coluna - 1] = a.titulos[0] || null;
  const m = mapear([["Título solto"], cab, Array(75).fill("x")], alvos);
  assert.equal(m.linhaCabecalho, 1);
  assert.equal(m.colunaData, 0);
  assert.equal(m.chaves[16], "acomp_13_17");
  assert.equal(m.chaves[73], "pessoas_renda");
  assert.equal(m.chaves.filter(Boolean).length, alvos.length);
});

test("ordem trocada e títulos por código funcionam; desconhecidos são listados; planilha alheia é recusada", () => {
  const m = mapear([["IDADE", "genero:", "xyz", "Data da pesquisa", "nps", "Local"]], alvos);
  assert.deepEqual(m.chaves, ["idade", "genero", null, null, "nps", null]);
  assert.deepEqual([m.colunaData, m.colunaLocal, m.ignoradas], [3, 5, ["xyz"]]);
  assert.equal(mapear([["a", "b"], ["c"]], alvos), null);
  assert.equal(mapear([], alvos), null);
});

test("'Hospedagem' entre colchetes é o item avaliado; sem colchetes, a pergunta", () => {
  const a = [...alvos, { chave: "servico_27", titulos: ["Hospedagem"], coluna: 27 }];
  assert.deepEqual(mapear([["idade", "Hospedagem", "Avaliação [Hospedagem]", "nps"]], a).chaves, ["idade", "hospedagem", "servico_27", "nps"]);
});
