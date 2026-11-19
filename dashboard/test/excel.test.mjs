import assert from "node:assert/strict";
import test, { beforeEach, afterEach } from "node:test";
import { downloadExcelXml } from "../src/lib/excel.ts";

// downloadExcelXml roda no navegador: simulamos window, document, Blob e URL para capturar o arquivo gerado.
let baixado;
const original = {};

beforeEach(() => {
  baixado = undefined;
  for (const k of ["window", "document"]) original[k] = globalThis[k];
  original.createObjectURL = URL.createObjectURL;
  original.revokeObjectURL = URL.revokeObjectURL;
  globalThis.window = {};
  globalThis.document = {
    body: { appendChild() {}, removeChild() {} },
    createElement: () => ({
      click() {
        baixado = { ...baixado, nomeArquivo: this.download, clicou: true };
      },
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

const xml = async () => baixado.blob.text();

test("gera planilha com cabeçalho e linhas, números como Number e textos como String", async () => {
  downloadExcelXml("Pesquisas", [{ Protocolo: "OTO482-0001", Idade: 31, Cidade: "Marília" }], "pesquisas.xlsx");
  const x = await xml();
  assert.match(x, /<Worksheet ss:Name="Pesquisas">/);
  assert.match(x, /<Data ss:Type="String">Protocolo<\/Data>/);
  assert.match(x, /<Data ss:Type="Number">31<\/Data>/);
  assert.match(x, /<Data ss:Type="String">Marília<\/Data>/);
  assert.equal(baixado.nomeArquivo, "pesquisas.xlsx");
});

test("escapa caracteres XML para não quebrar o arquivo nem injetar marcação", async () => {
  downloadExcelXml("A&B", [{ "a<b": `x & "y" <script>` }], "t");
  const x = await xml();
  assert.match(x, /ss:Name="A&amp;B"/);
  assert.match(x, /a&lt;b/);
  assert.ok(x.includes("x &amp; &quot;y&quot; &lt;script&gt;"));
  assert.ok(!x.includes("<script>"));
});

test("nome da aba é limitado a 31 caracteres e vazio vira 'Dados'", async () => {
  downloadExcelXml("x".repeat(50), [{ a: 1 }], "t");
  assert.match(await xml(), new RegExp(`ss:Name="${"x".repeat(31)}"`));
  downloadExcelXml("", [{ a: 1 }], "t");
  assert.match(await xml(), /ss:Name="Dados"/);
});

test("acrescenta .xlsx ao nome quando falta e preserva .xls", () => {
  downloadExcelXml("a", [{ a: 1 }], "relatorio");
  assert.equal(baixado.nomeArquivo, "relatorio.xlsx");
  downloadExcelXml("a", [{ a: 1 }], "antigo.xls");
  assert.equal(baixado.nomeArquivo, "antigo.xls");
});

test("valores nulos viram célula vazia e NaN/Infinity viram texto", async () => {
  downloadExcelXml("a", [{ n: null, u: undefined, nan: NaN }], "t");
  const x = await xml();
  assert.match(x, /<Data ss:Type="String"><\/Data>/);
  assert.match(x, /<Data ss:Type="String">NaN<\/Data>/);
});

test("sem linhas ou fora do navegador, não gera nada", () => {
  downloadExcelXml("a", [], "t");
  assert.equal(baixado, undefined);
  delete globalThis.window;
  downloadExcelXml("a", [{ a: 1 }], "t");
  assert.equal(baixado, undefined);
});
