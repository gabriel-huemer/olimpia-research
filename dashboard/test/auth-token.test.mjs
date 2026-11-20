import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import { criarToken, verificarToken } from "../src/lib/auth/token.ts";

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres-ok";
const outro = "outro-segredo-de-teste-com-mais-de-32-caracteres";

test("token valido volta com o id e o perfil do usuario", async () => {
  const t = await criarToken({ uid: "u-1", perfilId: 3 }, SEGREDO);
  const s = await verificarToken(t, SEGREDO);
  assert.equal(s?.uid, "u-1");
  assert.equal(s?.perfilId, 3);
});

test("assinatura com outro segredo e rejeitada", async () => {
  const t = await criarToken({ uid: "u-1", perfilId: 3 }, SEGREDO);
  assert.equal(await verificarToken(t, outro), null);
});

test("token adulterado e rejeitado", async () => {
  const t = await criarToken({ uid: "u-1", perfilId: 3 }, SEGREDO);
  const [h, p, s] = t.split(".");
  const payloadFalso = Buffer.from(JSON.stringify({ uid: "u-admin", perfilId: 1, exp: 9999999999 })).toString("base64url");
  assert.equal(await verificarToken(`${h}.${payloadFalso}.${s}`, SEGREDO), null);
  assert.equal(await verificarToken(`${h}.${p}.${s.slice(0, -2)}xx`, SEGREDO), null);
});

test("token expirado e rejeitado", async () => {
  const t = await criarToken({ uid: "u-1", perfilId: 3 }, SEGREDO, { expiraEmSegundos: -10 });
  assert.equal(await verificarToken(t, SEGREDO), null);
});

test("lixo, vazio e alg=none sao rejeitados sem lancar erro", async () => {
  assert.equal(await verificarToken("", SEGREDO), null);
  assert.equal(await verificarToken("abc.def.ghi", SEGREDO), null);
  assert.equal(await verificarToken(undefined, SEGREDO), null);
  const semAssinatura = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"uid":"x","perfilId":1}').toString("base64url")}.`;
  assert.equal(await verificarToken(semAssinatura, SEGREDO), null);
});

test("token assinado com outro algoritmo (HS512) e rejeitado", async () => {
  const t = await new SignJWT({ uid: "u-1", perfilId: 1 })
    .setProtectedHeader({ alg: "HS512" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SEGREDO));
  assert.equal(await verificarToken(t, SEGREDO), null);
});

test("segredo curto demais e recusado ao criar", async () => {
  await assert.rejects(() => criarToken({ uid: "u-1", perfilId: 1 }, "curto"), /segredo/i);
});
