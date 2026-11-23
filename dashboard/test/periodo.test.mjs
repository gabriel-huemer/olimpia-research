import assert from "node:assert/strict";
import test from "node:test";
import { comparacao, hojeLocal, mesesDoAno, resolverPeriodo, rotuloPeriodo } from "../src/lib/periodo.ts";

const HOJE = "2026-11-23";
const p = (texto) => resolverPeriodo(texto, HOJE);

test("mês atual, últimos 30 dias, mês e ano viram intervalos (fim exclusivo)", () => {
  assert.deepEqual(p("Mês atual"), { tipo: "mes", inicio: "2026-11-01", fim: "2026-12-01" });
  assert.deepEqual(p("2026-12"), { tipo: "mes", inicio: "2026-12-01", fim: "2027-01-01" });
  assert.deepEqual(p("2026-02"), { tipo: "mes", inicio: "2026-02-01", fim: "2026-03-01" });
  assert.deepEqual(p("Ano 2025"), { tipo: "ano", inicio: "2025-01-01", fim: "2026-01-01" });
  assert.deepEqual(p("Últimos 7 dias"), { tipo: "dias", inicio: "2026-11-17", fim: "2026-11-24" });
  assert.deepEqual(p("Últimos 30 dias"), { tipo: "dias", inicio: "2026-10-25", fim: "2026-11-24" });
});

test("personalizado inclui os dois dias, aceita um dia só e inverte datas trocadas", () => {
  assert.deepEqual(p("2026-03-10..2026-03-15"), { tipo: "dias", inicio: "2026-03-10", fim: "2026-03-16" });
  assert.deepEqual(p("2026-03-10..2026-03-10"), { tipo: "dias", inicio: "2026-03-10", fim: "2026-03-11" });
  assert.deepEqual(p("2026-03-15..2026-03-10"), p("2026-03-10..2026-03-15"));
  assert.deepEqual(p("2025-12-20..2026-01-05"), { tipo: "dias", inicio: "2025-12-20", fim: "2026-01-06" });
});

test("valores inválidos caem no ano corrente", () => {
  for (const t of [undefined, "", "x", "2026-13", "2026-02-31..2026-03-01", "2026-03-01..", "2026-03-01'; --"]) {
    assert.deepEqual(p(t), { tipo: "ano", inicio: "2026-01-01", fim: "2027-01-01" }, String(t));
  }
});

test("comparação: mês ou ano em andamento usa só os mesmos dias do anterior", () => {
  assert.deepEqual(comparacao(p("Mês atual"), HOJE), { inicio: "2026-10-01", fim: "2026-10-24", nome: "mês anterior" });
  assert.deepEqual(comparacao(p("2026-03"), HOJE), { inicio: "2026-02-01", fim: "2026-03-01", nome: "mês anterior" });
  assert.deepEqual(comparacao(p("Ano 2025"), HOJE), { inicio: "2024-01-01", fim: "2025-01-01", nome: "ano anterior" });
  assert.deepEqual(comparacao(p("Ano 2026"), HOJE), { inicio: "2025-01-01", fim: "2025-11-24", nome: "ano anterior" });
  assert.deepEqual(comparacao(p("2026-03-10..2026-03-15"), HOJE), { inicio: "2026-03-04", fim: "2026-03-10", nome: "período anterior" });
  // 31 de março: fevereiro só tem 28 dias
  assert.equal(comparacao(resolverPeriodo("2026-03", "2026-03-31"), "2026-03-31").fim, "2026-03-01");
});

test("12 meses do ano e rótulos em português", () => {
  assert.equal(mesesDoAno(2026).length, 12);
  assert.equal(mesesDoAno(2026)[0], "2026-01");
  assert.equal(rotuloPeriodo("2026-03"), "Março de 2026");
  assert.equal(rotuloPeriodo("2026-03-10..2026-03-15"), "10/03/2026 a 15/03/2026");
  assert.equal(rotuloPeriodo("Ano 2026"), "Ano 2026");
});

test("hoje é o dia em São Paulo, não em UTC", () => {
  assert.equal(hojeLocal(new Date("2026-12-01T01:00:00Z")), "2026-11-30");
});
