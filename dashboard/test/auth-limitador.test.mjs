import assert from "node:assert/strict";
import test from "node:test";
import { criarLimitador } from "../src/lib/auth/limitador.ts";

const cfg = { maxFalhas: 3, janelaMs: 60_000, bloqueioMs: 300_000 };

test("permite tentativas ate o limite e bloqueia a partir dai", () => {
  let agora = 0;
  const l = criarLimitador({ ...cfg, relogio: () => agora });
  assert.equal(l.bloqueado("ip1|a@x.com"), false);
  l.registrarFalha("ip1|a@x.com");
  l.registrarFalha("ip1|a@x.com");
  assert.equal(l.bloqueado("ip1|a@x.com"), false);
  l.registrarFalha("ip1|a@x.com");
  assert.equal(l.bloqueado("ip1|a@x.com"), true);
});

test("bloqueio expira depois de bloqueioMs", () => {
  let agora = 0;
  const l = criarLimitador({ ...cfg, relogio: () => agora });
  for (let i = 0; i < 3; i++) l.registrarFalha("k");
  assert.equal(l.bloqueado("k"), true);
  agora = 299_999;
  assert.equal(l.bloqueado("k"), true);
  agora = 300_001;
  assert.equal(l.bloqueado("k"), false);
});

test("falhas antigas (fora da janela) nao contam", () => {
  let agora = 0;
  const l = criarLimitador({ ...cfg, relogio: () => agora });
  l.registrarFalha("k");
  l.registrarFalha("k");
  agora = 61_000;
  l.registrarFalha("k");
  assert.equal(l.bloqueado("k"), false);
});

test("login com sucesso zera o contador", () => {
  const l = criarLimitador({ ...cfg, relogio: () => 0 });
  l.registrarFalha("k");
  l.registrarFalha("k");
  l.registrarSucesso("k");
  l.registrarFalha("k");
  assert.equal(l.bloqueado("k"), false);
});

test("chaves diferentes nao se afetam", () => {
  const l = criarLimitador({ ...cfg, relogio: () => 0 });
  for (let i = 0; i < 3; i++) l.registrarFalha("ip1|a@x.com");
  assert.equal(l.bloqueado("ip1|a@x.com"), true);
  assert.equal(l.bloqueado("ip2|a@x.com"), false);
});

test("memoria limitada: descarta chaves antigas ao passar do teto", () => {
  const l = criarLimitador({ ...cfg, maxChaves: 100, relogio: () => 0 });
  for (let i = 0; i < 500; i++) l.registrarFalha(`k${i}`);
  assert.ok(l.tamanho() <= 100);
});
