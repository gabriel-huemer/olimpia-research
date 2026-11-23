import assert from "node:assert/strict";
import test from "node:test";
import { montarSerie } from "../src/lib/relatorio/serie.ts";

const HOJE = "2026-11-23";
const s = (inicio, fim, primeira = inicio, ultima = primeira, hoje = HOJE) => montarSerie({ inicio, fim }, primeira, ultima, hoje);

test("granularidade: 16 dias ainda é dia; 17 vira semana", () => {
  assert.equal(s("2026-03-02", "2026-03-18").granularidade, "dia");
  assert.equal(s("2026-03-02", "2026-03-18").pontos.length, 16);
  assert.equal(s("2026-03-02", "2026-03-19").granularidade, "semana");
});

test("granularidade: 16 semanas ainda é semana; 17 vira mês; 24 meses ainda é mês; 25 vira ano", () => {
  assert.equal(s("2026-03-02", "2026-06-22").granularidade, "semana");
  assert.equal(s("2026-03-02", "2026-06-22").pontos.length, 16);
  assert.equal(s("2026-03-02", "2026-06-23").granularidade, "mes");
  assert.equal(s("2024-01-01", "2026-01-01").granularidade, "mes");
  assert.equal(s("2024-01-01", "2026-01-01").pontos.length, 24);
  assert.equal(s("2024-01-01", "2026-01-02").granularidade, "ano");
});

test("pontos cobrem o intervalo sem buracos, inclusive na virada do ano", () => {
  const { pontos } = s("2025-11-20", "2026-01-20");
  assert.equal(pontos[0].inicio, "2025-11-20");
  assert.equal(pontos.at(-1).fim, "2026-01-20");
  pontos.slice(1).forEach((p, i) => assert.equal(p.inicio, pontos[i].fim));
  assert.deepEqual(s("2025-01-01", "2026-03-01").pontos.slice(11, 13).map((p) => p.rotulo), ["dez/25", "jan/26"]);
});

test("corta antes da primeira coleta e depois de hoje; último ponto incompleto fica marcado", () => {
  const { pontos } = s("2026-01-01", "2027-01-01", "2026-03-10", "2026-11-20");
  assert.equal(pontos[0].inicio, "2026-03-10");
  assert.equal(pontos.at(-1).fim, "2026-11-24");
  assert.equal(pontos[0].parcial, true);
  assert.equal(pontos[1].parcial, false);
  assert.equal(pontos.at(-1).parcial, true);
});

test("coleta com data adiante de hoje não some da série", () => {
  assert.equal(s("2026-11-01", "2026-12-01", "2026-11-05", "2026-11-25").pontos.at(-1).fim, "2026-11-26");
});

test("sem coletas não há pontos", () => {
  assert.deepEqual(montarSerie({ inicio: "2026-12-01", fim: "2027-01-01" }, null, null, HOJE).pontos, []);
});
