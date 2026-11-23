import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import { buildXlsxBytes, downloadExcelXml } from "../src/lib/excel.ts";

// O .xlsx é um ZIP sem compressão (STORED): lemos as entradas direto do diretório central.
function lerZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054b50, "fim do diretório central ausente");
  const total = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const arquivos = {};
  for (let i = 0; i < total; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const tam = dv.getUint32(p + 20, true);
    const nomeLen = dv.getUint16(p + 28, true);
    const local = dv.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nomeLen));
    const ini = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    arquivos[nome] = new TextDecoder().decode(bytes.subarray(ini, ini + tam));
    p += 46 + nomeLen;
  }
  return arquivos;
}

const planilha = (nome, linhas) => lerZip(buildXlsxBytes(nome, linhas));

test("gera um ZIP OOXML com as partes que o Excel exige", () => {
  const z = planilha("Pesquisas", [{ a: 1 }]);
  for (const parte of [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ]) {
    assert.ok(parte in z, `falta ${parte}`);
  }
});

test("cabeçalho e linhas: números como número e textos como texto", () => {
  const z = planilha("Pesquisas", [{ Protocolo: "OTO482-0001", Idade: 31, Cidade: "Marília" }]);
  assert.match(z["xl/workbook.xml"], /<sheet name="Pesquisas"/);
  const s = z["xl/worksheets/sheet1.xml"];
  assert.match(s, /<c r="A1" t="inlineStr" s="1"><is><t>Protocolo<\/t><\/is><\/c>/);
  assert.match(s, /<c r="B2"><v>31<\/v><\/c>/);
  assert.match(s, /<c r="C2" t="inlineStr"><is><t>Marília<\/t><\/is><\/c>/);
  assert.match(s, /<dimension ref="A1:C2"\/>/);
});

test("escapa caracteres XML para não quebrar o arquivo nem injetar marcação", () => {
  const z = planilha("A&B", [{ "a<b": `x & "y" <script>` }]);
  assert.match(z["xl/workbook.xml"], /name="A&amp;B"/);
  const s = z["xl/worksheets/sheet1.xml"];
  assert.ok(s.includes("a&lt;b"));
  assert.ok(s.includes("x &amp; &quot;y&quot; &lt;script&gt;"));
  assert.ok(!s.includes("<script>"));
});

test("nome da aba: até 31 caracteres, sem caracteres proibidos, vazio vira 'Relatorio'", () => {
  assert.match(planilha("x".repeat(50), [{ a: 1 }])["xl/workbook.xml"], new RegExp(`name="${"x".repeat(31)}"`));
  assert.match(planilha("", [{ a: 1 }])["xl/workbook.xml"], /name="Relatorio"/);
  assert.match(planilha("a/b:c", [{ a: 1 }])["xl/workbook.xml"], /name="a b c"/);
});

test("valores nulos viram célula vazia e NaN/Infinity viram texto", () => {
  const s = planilha("a", [{ n: null, nan: NaN, inf: Infinity }])["xl/worksheets/sheet1.xml"];
  assert.match(s, /<c r="A2" t="inlineStr"><is><t><\/t><\/is><\/c>/);
  assert.match(s, /<t>NaN<\/t>/);
  assert.match(s, /<t>Infinity<\/t>/);
});

// downloadExcelXml roda no navegador: simulamos window, document e URL para capturar o arquivo.
let baixado;
const original = {};

beforeEach(() => {
  baixado = undefined;
  for (const k of ["window", "document"]) original[k] = globalThis[k];
  original.createObjectURL = URL.createObjectURL;
  original.revokeObjectURL = URL.revokeObjectURL;
  globalThis.window = {};
  globalThis.document = {
    body: { appendChild() {} },
    createElement: () => ({
      click() {
        baixado = { ...baixado, nomeArquivo: this.download };
      },
      remove() {},
    }),
  };
  URL.createObjectURL = (blob) => {
    baixado = { blob };
    return "blob:teste";
  };
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  for (const k of ["window", "document"]) {
    if (original[k] === undefined) delete globalThis[k];
    else globalThis[k] = original[k];
  }
  URL.createObjectURL = original.createObjectURL;
  URL.revokeObjectURL = original.revokeObjectURL;
});

test("download entrega um .xlsx com o tipo MIME do Excel", async () => {
  downloadExcelXml("Pesquisas", [{ a: 1 }], "pesquisas.xlsx");
  assert.equal(baixado.nomeArquivo, "pesquisas.xlsx");
  assert.equal(baixado.blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const z = lerZip(new Uint8Array(await baixado.blob.arrayBuffer()));
  assert.ok("xl/worksheets/sheet1.xml" in z);
});

test("acrescenta .xlsx ao nome quando falta e troca .xls por .xlsx", () => {
  downloadExcelXml("a", [{ a: 1 }], "relatorio");
  assert.equal(baixado.nomeArquivo, "relatorio.xlsx");
  downloadExcelXml("a", [{ a: 1 }], "antigo.xls");
  assert.equal(baixado.nomeArquivo, "antigo.xlsx");
});

test("sem linhas ou fora do navegador, não gera nada", () => {
  downloadExcelXml("a", [], "t");
  assert.equal(baixado, undefined);
  delete globalThis.window;
  downloadExcelXml("a", [{ a: 1 }], "t");
  assert.equal(baixado, undefined);
});
