import assert from "node:assert/strict";
import test from "node:test";
import { tokenSyncValido } from "../src/lib/auth/sync.ts";

const T = "token-de-sync-com-tamanho-suficiente-123";

test("aceita só 'Bearer <token>' igual ao configurado", () => {
  assert.equal(tokenSyncValido(`Bearer ${T}`, T), true);
  assert.equal(tokenSyncValido(`bearer ${T}`, T), true);
  assert.equal(tokenSyncValido(`Bearer ${T}x`, T), false);
  assert.equal(tokenSyncValido(`Bearer ${T.slice(0, -1)}`, T), false);
  assert.equal(tokenSyncValido(T, T), false);
  assert.equal(tokenSyncValido(null, T), false);
  assert.equal(tokenSyncValido("Bearer ", T), false);
});

test("sem token configurado (ou curto demais) ninguém sincroniza: falha fechada", () => {
  assert.equal(tokenSyncValido("Bearer ", ""), false);
  assert.equal(tokenSyncValido("Bearer undefined", undefined), false);
  assert.equal(tokenSyncValido("Bearer curto", "curto"), false);
});
