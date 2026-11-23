import assert from "node:assert/strict";
import test from "node:test";
import { baseUrl, chamar, entrarComoAdmin } from "./support/sessao.mjs";

const conferir = async (corpo, token = process.env.SYNC_API_TOKEN) => {
  const r = await fetch(`${baseUrl}/api/v1/pesquisador`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(corpo),
  });
  return { status: r.status, corpo: await r.json() };
};

test("sem o token de sincronização é 401", async () => {
  assert.equal((await conferir({ codigo: "OTO482" }, null)).status, 401);
  assert.equal((await conferir({ codigo: "OTO482" }, "x".repeat(40))).status, 401);
});

test("código válido devolve só o necessário", async () => {
  const r = await conferir({ codigo: "oto-482" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo, { codigo: "OTO482", nome: "Ana Souza", local: "Thermas dos Laranjais" });
});

test("código inexistente 404; formato inválido 400", async () => {
  assert.equal((await conferir({ codigo: "ZZZ999" })).status, 404);
  for (const codigo of [undefined, 5, "", "x".repeat(50)]) assert.equal((await conferir({ codigo })).status, 400);
});

test("operador novo entra; desativado ou com código trocado não entra mais", async () => {
  const admin = chamar(await entrarComoAdmin());
  const { locais } = await (await admin("/api/operadores")).json();
  const novo = await (await admin("/api/operadores", { method: "POST", body: { nome: "Login App", localId: locais[0].id } })).json();
  const editar = (body) => admin(`/api/operadores/${novo.id}`, { method: "PATCH", body });
  assert.equal((await conferir({ codigo: novo.codigo })).status, 200);
  const { codigo } = await (await editar({ redefinirCodigo: true })).json();
  assert.equal((await conferir({ codigo: novo.codigo })).status, 404);
  assert.equal((await conferir({ codigo })).status, 200);
  await editar({ ativo: false });
  assert.equal((await conferir({ codigo })).status, 404);
});
