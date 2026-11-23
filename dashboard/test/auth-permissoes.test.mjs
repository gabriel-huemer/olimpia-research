import assert from "node:assert/strict";
import test from "node:test";
import { areaDaRota, podeAcessar, perfilEditavel, PERFIS_PADRAO } from "../src/lib/auth/permissoes.ts";

const perfil = (nome) => PERFIS_PADRAO.find((p) => p.nome === nome);

test("os 3 perfis padrao existem com as permissoes combinadas", () => {
  assert.deepEqual(PERFIS_PADRAO.map((p) => p.nome).sort(), ["ADMINISTRADOR", "PESQUISADOR", "VISUALIZADOR"]);
  assert.deepEqual(perfil("ADMINISTRADOR").areas, { analises: true, coleta: true, sistema: true });
  assert.deepEqual(perfil("VISUALIZADOR").areas, { analises: true, coleta: false, sistema: false });
  assert.deepEqual(perfil("PESQUISADOR").areas, { analises: false, coleta: false, sistema: false });
});

test("rota -> area: analises, coleta e sistema; o resto nao exige area", () => {
  assert.equal(areaDaRota("/analises/panorama"), "analises");
  assert.equal(areaDaRota("/coleta/pesquisas"), "coleta");
  assert.equal(areaDaRota("/coleta/formularios/editor"), "coleta");
  assert.equal(areaDaRota("/sistema/usuarios"), "sistema");
  assert.equal(areaDaRota("/login"), null);
  assert.equal(areaDaRota("/api/analytics"), null);
});

test("nao confunde prefixos parecidos (/coletar, /sistemas, ../)", () => {
  assert.equal(areaDaRota("/coletar"), null);
  assert.equal(areaDaRota("/sistemas/x"), null);
  assert.equal(areaDaRota("/coleta"), "coleta");
  assert.equal(areaDaRota("/COLETA/pesquisas"), "coleta");
  assert.equal(areaDaRota("/analises/../coleta/pesquisas"), "coleta");
});

test("analises e publica: visitante sem sessao acessa; coleta e sistema nao", () => {
  assert.equal(podeAcessar(null, "analises"), true);
  assert.equal(podeAcessar(null, "coleta"), false);
  assert.equal(podeAcessar(null, "sistema"), false);
});

test("administrador acessa tudo; visualizador so analises; pesquisador nada na web", () => {
  const adm = perfil("ADMINISTRADOR").areas;
  const vis = perfil("VISUALIZADOR").areas;
  const pes = perfil("PESQUISADOR").areas;
  for (const a of ["analises", "coleta", "sistema"]) assert.equal(podeAcessar(adm, a), true);
  assert.equal(podeAcessar(vis, "analises"), true);
  assert.equal(podeAcessar(vis, "coleta"), false);
  assert.equal(podeAcessar(vis, "sistema"), false);
  assert.equal(podeAcessar(pes, "coleta"), false);
  assert.equal(podeAcessar(pes, "sistema"), false);
});

test("area desconhecida ou permissoes ausentes negam por padrao", () => {
  assert.equal(podeAcessar({ analises: true }, "coleta"), false);
  assert.equal(podeAcessar({ coleta: "true" }, "coleta"), false);
  assert.equal(podeAcessar({ coleta: true }, "financeiro"), false);
  assert.equal(podeAcessar(undefined, "coleta"), false);
});

test("perfis padrao nao sao editaveis; perfis criados pelo admin sao", () => {
  assert.equal(perfilEditavel({ nome: "ADMINISTRADOR", padrao: true }), false);
  assert.equal(perfilEditavel({ nome: "VISUALIZADOR", padrao: true }), false);
  assert.equal(perfilEditavel({ nome: "Estagiario", padrao: false }), true);
});
