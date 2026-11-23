import assert from "node:assert/strict";
import test from "node:test";
import { foraDaFaixa, validarNovoValor } from "../src/lib/curadoria/valor.ts";

test("NUMERO aceita inteiro não negativo", () => {
  assert.deepEqual(validarNovoValor("NUMERO", "50"), { ok: true, numero: 50 });
  assert.deepEqual(validarNovoValor("NUMERO", " 0 "), { ok: true, numero: 0 });
});

test("NUMERO recusa vazio, texto, negativo e decimal", () => {
  for (const v of ["", "  ", "abc", "-5", "3,5", "1e3", "0x10", null, undefined, {}]) {
    assert.equal(validarNovoValor("NUMERO", v).ok, false, String(v));
  }
});

test("MOEDA aceita formato brasileiro, com ou sem R$", () => {
  for (const [v, n] of [["850", 850], ["850,50", 850.5], ["1.234,50", 1234.5], ["R$ 1.234,50", 1234.5], ["1.234", 1234], ["850.50", 850.5]]) {
    assert.deepEqual(validarNovoValor("MOEDA", v), { ok: true, numero: n }, v);
  }
});

test("MOEDA recusa mais de 2 casas, ponto mal colocado e o que não cabe no banco", () => {
  for (const v of ["1,234", "12.34.5", "R$", "9999999999999"]) assert.equal(validarNovoValor("MOEDA", v).ok, false, v);
});

test("tipos não numéricos não são corrigíveis", () => {
  assert.equal(validarNovoValor("MUNICIPIO", "5").ok, false);
});

test("foraDaFaixa avisa só quando há limite ultrapassado", () => {
  assert.equal(foraDaFaixa(101, { min: 16, max: 100 }), true);
  assert.equal(foraDaFaixa(15, { min: 16, max: 100 }), true);
  assert.equal(foraDaFaixa(100, { min: 16, max: 100 }), false);
  assert.equal(foraDaFaixa(0, { min: null, max: 30 }), false);
  assert.equal(foraDaFaixa(999, null), false);
});
