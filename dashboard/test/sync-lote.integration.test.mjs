import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";

test("batch sync accepts, deduplicates, and exposes a survey", async () => {
  const id = randomUUID();
  const payload = {
    operadorCodigo: "OTO-482",
    pesquisas: [
      {
        id,
        protocolo: `IT-${id}`,
        origem: "Campinas, SP",
        sinalizada: true,
        campoSuspeito: "Idade",
        valorSuspeito: "900",
        idade: "900",
      },
    ],
  };
  const postBatch = () =>
    fetch(`${baseUrl}/api/sync/lote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  const firstResponse = await postBatch();
  assert.equal(firstResponse.status, 200);
  const firstResult = await firstResponse.json();
  assert.equal(firstResult.aceitas, 1);
  assert.equal(firstResult.duplicadas, 0);
  assert.equal(firstResult.sinalizadas, 1);

  const duplicateResponse = await postBatch();
  assert.equal(duplicateResponse.status, 200);
  const duplicateResult = await duplicateResponse.json();
  assert.equal(duplicateResult.aceitas, 0);
  assert.equal(duplicateResult.duplicadas, 1);

  const stateResponse = await fetch(`${baseUrl}/api/state`);
  assert.equal(stateResponse.status, 200);
  const state = await stateResponse.json();
  assert.ok(state.pesquisas.some((survey) => survey.id === id));
  assert.ok(
    state.revisao.some(
      (item) => item.protocolo === `IT-${id}` && item.status === "PENDENTE",
    ),
  );
});

test("mobile sync route returns the contract expected by the app", async () => {
  const id = randomUUID();
  const payload = {
    operadorCodigo: "OTO-482",
    pesquisas: [{ id, protocolo: `MOB-${id}`, origem: "Olímpia, SP" }],
  };
  const postBatch = () =>
    fetch(`${baseUrl}/api/v1/pesquisas/lote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  const firstResponse = await postBatch();
  assert.equal(firstResponse.status, 200);
  const firstResult = await firstResponse.json();
  assert.deepEqual(firstResult.aceitas, [id]);
  assert.deepEqual(firstResult.rejeitadas, {});

  const duplicateResponse = await postBatch();
  assert.equal(duplicateResponse.status, 200);
  const duplicateResult = await duplicateResponse.json();
  assert.deepEqual(duplicateResult.aceitas, [id]);
  assert.deepEqual(duplicateResult.rejeitadas, {});

  const stateResponse = await fetch(`${baseUrl}/api/state`);
  assert.equal(stateResponse.status, 200);
  const state = await stateResponse.json();
  assert.ok(state.pesquisas.some((survey) => survey.id === id));
});
