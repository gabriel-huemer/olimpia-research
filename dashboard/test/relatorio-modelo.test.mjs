import assert from "node:assert/strict";
import test from "node:test";
import { curto, montarModelo, nomeDoArquivo } from "../src/lib/relatorio/modelo.ts";

const semMedidas = { n: 0, nps: null, promotores: null, neutros: null, detratores: null, permanencia: null, gasto: null, retorno: null, primeiraVez: null };
const vazio = {
  filtros: { periodo: "2026-11", genero: "Todos", faixaIdade: "Todas", cidade: "Todas", hospedagem: "Todas", transporte: "Todos", localPesquisa: "Todos" },
  emitidoEm: "2026-11-23", de: "2026-11-01", ate: "2026-11-30", ficticio: false,
  paineis: {
    panorama: { crescimento: "" },
    infraestrutura: { servicos: [], expectativa: [], gruposPcd: null, tiposPcd: [], oQueFalta: null },
    impacto: { renda: [], gastoPorRenda: [], antecedencia: [], hospedagem: [], refeicoes: [] },
    perfil: { idades: [], cidades: [], escolaridade: [], estadoCivil: [], conhecimento: [], motivos: [], concorrencia: [] },
    atracoes: { atrativos: [], transporte: [], aeroporto: [] },
  },
  total: semMedidas, granularidade: "dia", serie: [], servicos: [], estados: [], comQuem: [], locais: [],
  qualidade: { recebidas: 0, emRevisao: 0, comExcluida: 0, pesquisadores: 0 },
};
const blocos = (m) => m.paginas.flatMap((p) => p.linhas.flat(2));

test("1 página, 8 páginas e 12 slides, mesmo sem nenhuma resposta", () => {
  const paginas = (v) => { const m = montarModelo(v, vazio); return m.paginas.length + (m.capa ? 1 : 0); };
  assert.deepEqual(["resumo", "relatorio", "apresentacao"].map(paginas), [1, 8, 12]);
});

test("sem respostas, indicadores viram travessão e não zero", () => {
  const kpis = blocos(montarModelo("relatorio", vazio)).filter((b) => b.tipo === "kpis").flatMap((b) => b.itens);
  assert.equal(kpis.find((k) => k.rotulo.startsWith("NPS")).valor, "—");
  assert.equal(kpis.find((k) => k.rotulo === "pesquisas").valor, "0");
});

test("estados: os maiores e o resto somado em Outros", () => {
  const estados = Array.from({ length: 12 }, (_, i) => ({ rotulo: `E${i} (XX)`, n: 12 - i, percentual: 12 - i }));
  const b = blocos(montarModelo("resumo", { ...vazio, estados })).find((x) => x.titulo === "Estados de origem");
  assert.equal(b.itens.length, 6);
  assert.deepEqual(b.itens.at(-1).rotulo, "Outros 7 estados");
  assert.equal(b.itens.at(-1).texto, "28%");
});

test("quadro mostra no máximo 24 períodos e marca os incompletos", () => {
  const serie = Array.from({ length: 30 }, (_, i) => ({ ...semMedidas, n: 1, rotulo: `p${i}`, parcial: i === 29 }));
  const q = blocos(montarModelo("relatorio", { ...vazio, serie })).find((b) => b.tipo === "tabela" && b.titulo.startsWith("Quadro"));
  assert.equal(q.linhas.length, 24);
  assert.equal(q.linhas.at(-1)[0], "p29*");
});

test("filtros ativos e dados fictícios aparecem; filtros neutros não", () => {
  const m = montarModelo("resumo", { ...vazio, ficticio: true, filtros: { ...vazio.filtros, genero: "Feminino" } });
  assert.deepEqual(m.filtros, ["Gênero: Feminino"]);
  assert.match(m.rodape, /DADOS FICTÍCIOS/);
  assert.equal(m.periodo, "Novembro de 2026 (01/11/2026 a 30/11/2026)");
});

test("rótulos longos são encurtados", () => {
  assert.equal(curto("Até 2 salários mínimos (até R$ 3.242)"), "Até 2 SM");
  assert.equal(curto("x".repeat(80), 20).length, 20);
});

test("nome do arquivo: mês, ano ou intervalo", () => {
  const nome = (de, ate) => nomeDoArquivo("resumo", { ...vazio, de, ate });
  assert.equal(nome("2026-11-01", "2026-11-30"), "OTO_Resumo_2026-11.pdf");
  assert.equal(nome("2026-01-01", "2026-12-31"), "OTO_Resumo_2026.pdf");
  assert.equal(nome("2026-11-01", "2026-11-10"), "OTO_Resumo_2026-11-01_a_2026-11-10.pdf");
});

test("lista cortada fica com os maiores, na ordem original, e avisa quantos existem", () => {
  const renda = [5, 1, 9, 8, 7, 6, 2, 4, 3].map((n, i) => ({ rotulo: `faixa ${i}`, n, percentual: n }));
  const b = blocos(montarModelo("relatorio", { ...vazio, paineis: { ...vazio.paineis, impacto: { ...vazio.paineis.impacto, renda } } })).find((x) => x.titulo === "Renda familiar");
  assert.deepEqual(b.itens.map((x) => x.rotulo), [0, 2, 3, 4, 5, 7, 8].map((i) => `faixa ${i}`));
  assert.match(b.nota, /7 maiores de 9/);
});

test("resumo mostra a antecedência completa, em ordem", () => {
  const antecedencia = [1, 8, 3, 7, 2, 6, 4, 5].map((n, i) => ({ rotulo: `a${i}`, n, percentual: n }));
  const b = blocos(montarModelo("resumo", { ...vazio, paineis: { ...vazio.paineis, impacto: { ...vazio.paineis.impacto, antecedencia } } })).find((x) => x.titulo === "Antecedência da decisão");
  assert.deepEqual(b.itens.map((x) => x.rotulo), antecedencia.map((x) => x.rotulo));
});
