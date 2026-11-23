import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { gerarHash, verificarSenha, validarForcaSenha } from "../src/lib/auth/senha.ts";

test("hash gerado e bcrypt (custo >= 12) e confere com a senha certa", async () => {
  const h = await gerarHash("Senha-Forte-123!");
  assert.match(h, /^\$2[aby]\$(1[2-9]|[2-3]\d)\$/);
  assert.equal(await verificarSenha("Senha-Forte-123!", h), true);
  assert.equal(await verificarSenha("senha-forte-123!", h), false);
});

test("hash criado pelo banco (pgcrypto \\$2a\\$) tambem e aceito", async () => {
  const doBanco = bcrypt.hashSync("Admin-Banco-9!", 10).replace(/^\$2b\$/, "$2a$");
  assert.equal(await verificarSenha("Admin-Banco-9!", doBanco), true);
});

test("usuario inexistente (hash nulo) nunca autentica, mas ainda gasta tempo de bcrypt", async () => {
  const t0 = performance.now();
  assert.equal(await verificarSenha("qualquer", null), false);
  assert.equal(await verificarSenha("", undefined), false);
  const gasto = performance.now() - t0;
  assert.ok(gasto > 20, `esperava comparacao com hash falso (>20ms), levou ${gasto.toFixed(1)}ms`);
});

test("hash corrompido nao lanca erro: so recusa", async () => {
  assert.equal(await verificarSenha("x", "isto-nao-e-um-hash"), false);
});

test("senha acima de 72 bytes e recusada (limite do bcrypt)", async () => {
  await assert.rejects(() => gerarHash("a".repeat(73)), /72/);
});

test("forca da senha: minimo de 10 caracteres, letra e numero, sem as obvias", () => {
  assert.equal(validarForcaSenha("curta1").ok, false);
  assert.equal(validarForcaSenha("somenteletrasaqui").ok, false);
  assert.equal(validarForcaSenha("1234567890123").ok, false);
  assert.equal(validarForcaSenha("senha12345").ok, false);
  assert.equal(validarForcaSenha("Boa-Senha-2026").ok, true);
});
