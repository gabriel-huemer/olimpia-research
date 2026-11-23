import assert from "node:assert/strict";
import test from "node:test";
import { chaveMunicipio, conceitoDe, converterValor, dividirMulti, ufDeEstado } from "../src/lib/ingestao/conversao.ts";

const opcoes = [
  { id: 1, rotulo: "Parques (Aquático/Temáticos)" },
  { id: 2, rotulo: "Descanso, lazer e relaxamento" },
  { id: 3, rotulo: "Hotel" },
];
const ctx = { municipios: new Map([[chaveMunicipio("SP", "Marília"), 3529005]]), ufResidencia: "SP" };

test("multipla escolha junta pedacos quando a opcao tem virgula", () => {
  const r = dividirMulti("Parques (Aquático/Temáticos), Descanso, lazer e relaxamento, Outro motivo", opcoes);
  assert.deepEqual(r.opcoes.map((o) => o.id), [1, 2]);
  assert.deepEqual(r.sobras, ["Outro motivo"]);
});

test("escolha unica ignora acento e caixa; texto desconhecido nao se perde", () => {
  assert.deepEqual(converterValor("UNICA_ESCOLHA", "hotel", opcoes, ctx), [{ opcaoId: 3 }]);
  assert.deepEqual(converterValor("UNICA_ESCOLHA", "Pousada X", opcoes, ctx), [{ texto: "Pousada X" }]);
});

test("cidade usa a UF de residencia; cidade multipla le 'Nome, UF; Nome, UF'", () => {
  assert.deepEqual(converterValor("MUNICIPIO", "Marilia", [], ctx), [{ municipioIbge: 3529005 }]);
  assert.deepEqual(converterValor("MUNICIPIO_MULTIPLO", "Marília, SP; Lugar Nenhum, RJ", [], ctx), [
    { municipioIbge: 3529005 },
    { texto: "Lugar Nenhum, RJ" },
  ]);
});

test("numeros, datas e day use", () => {
  assert.deepEqual(converterValor("NUMERO", 20, [], ctx), [{ numero: 20 }]);
  assert.deepEqual(converterValor("MOEDA", "1.234,50", [], ctx), [{ numero: 1234.5 }]);
  assert.deepEqual(converterValor("NUMERO", "Day use (não pernoitou)", [], ctx), [{ numero: 0 }]);
  assert.deepEqual(converterValor("DATA", "2026-11-18", [], ctx), [{ data: "2026-11-18" }]);
  assert.deepEqual(converterValor("TEXTO", "", [], ctx), []);
});

test("conceito de avaliacao e UF do estado", () => {
  assert.equal(conceitoDe("Ótimo"), "OTIMO");
  assert.equal(conceitoDe("Não sei opinar"), "NAO_SEI");
  assert.equal(conceitoDe("Não utilizei"), "NAO_UTILIZEI");
  assert.equal(conceitoDe("xyz"), null);
  assert.equal(ufDeEstado("São Paulo (SP)"), "SP");
  assert.equal(ufDeEstado("Residente Exterior"), null);
});
