import assert from "node:assert/strict";
import test from "node:test";
import { alertaDe, conceitoValido, problemaDe } from "../src/lib/ingestao/validacao.ts";

const ctx = { municipios: new Map(), ufResidencia: null };
const p = (tipo, faixa = null) => ({ codigo: "x", enunciado: "X", tipo, opcoes: [], faixa });

test("números: aceita o formato brasileiro e recusa texto, negativo, fração e estouro", () => {
  assert.equal(problemaDe(p("MOEDA"), "1.234,50", ctx), null);
  assert.equal(problemaDe(p("NUMERO"), "30", ctx), null);
  for (const v of ["abc", "-1", "1,5", "1e15", "12 anos"]) assert.ok(problemaDe(p("NUMERO"), v, ctx), v);
  assert.equal(problemaDe(p("NUMERO"), "", ctx), null);
});

test("escala só de 0 a 10", () => {
  assert.equal(problemaDe(p("ESCALA_0_10"), 10, ctx), null);
  assert.ok(problemaDe(p("ESCALA_0_10"), 11, ctx));
});

test("datas impossíveis são recusadas", () => {
  assert.equal(problemaDe(p("DATA"), "2026-02-28", ctx), null);
  for (const v of ["2026-02-30", "ontem", "0026-01-01"]) assert.ok(problemaDe(p("DATA"), v, ctx), v);
});

test("escolha fora da lista vira texto livre, como no app; NUL é recusado", () => {
  assert.equal(problemaDe(p("UNICA_ESCOLHA"), "Outro qualquer", ctx), null);
  assert.ok(problemaDe(p("TEXTO"), "a\0b", ctx));
});

test("valor fora da faixa vira alerta, sem recusar", () => {
  const idade = p("NUMERO", { min: 16, max: 100, mensagem: "Idade fora" });
  assert.equal(problemaDe(idade, 150, ctx), null);
  assert.equal(alertaDe(idade, 150, ctx), "Idade fora");
  assert.equal(alertaDe(idade, 15, ctx), "Idade fora");
  assert.equal(alertaDe(idade, 16, ctx), null);
  assert.equal(alertaDe(idade, "", ctx), null);
});

test("conceitos", () => {
  assert.ok(conceitoValido("Ótimo") && conceitoValido(""));
  assert.ok(!conceitoValido("Excelente"));
});
