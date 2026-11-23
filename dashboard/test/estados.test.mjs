import assert from "node:assert/strict";
import test from "node:test";
import { agruparEstados } from "../src/lib/estados.ts";

const e = (uf, n) => ({ uf, n });

test("até três estados além dos maiores: siglas e percentuais de todos", () => {
  const r = agruparEstados([e("RJ", 1), e("MG", 50), e("SP", 30), e("AC", 10), e("PR", 6), e("GO", 3)]);
  assert.deepEqual(r.slice(0, 3).map((x) => x.uf), ["MG", "SP", "AC"]);
  assert.deepEqual(r[3], { uf: "PR · GO · RJ", detalhe: "6% · 3% · 1%", percentual: 10 });
});

test("mais de três estados no resto viram 'Outros (n)', sem citar só alguns", () => {
  const r = agruparEstados([e("MG", 50), e("SP", 30), e("AC", 10), e("PR", 4), e("GO", 3), e("RJ", 2), e("BA", 1)]);
  assert.deepEqual(r[3], { uf: "Outros (4)", percentual: 10 });
});

test("sem estados, lista vazia", () => assert.deepEqual(agruparEstados([]), []));
