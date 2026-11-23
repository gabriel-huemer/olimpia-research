import assert from "node:assert/strict";
import test from "node:test";
import { linhasDaAba } from "../src/lib/exportacao.ts";

const p = {
  impacto: {
    gastoDiarioMedio: 350.5, respostasGasto: 2, renda: [{ rotulo: "Até 2", n: 2, percentual: 100 }],
    gastoPorRenda: [], antecedencia: [], hospedagem: [], refeicoes: [],
  },
};

test("exporta os números da tela com os filtros e colunas iguais em todas as linhas", () => {
  const l = linhasDaAba("impacto", p, { genero: "Feminino" });
  assert.equal(l.length, 2);
  assert.equal(l[0].Valor, 350.5);
  assert.deepEqual(Object.keys(l[0]), Object.keys(l[1]));
  assert.ok(l.every((x) => x.Filtro_genero === "Feminino"));
  assert.equal(l[1].Percentual, 100);
});
