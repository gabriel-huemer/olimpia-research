import assert from "node:assert/strict";
import test from "node:test";
import { descrever } from "../src/lib/auditoria/texto.ts";

test("correção mostra valor antigo, novo e motivo (RF15)", () => {
  const r = descrever("sinalizacao", "UPDATE", { status: "PENDENTE", valor_original: 500 }, { status: "CORRIGIDA", valor_original: 500, valor_corrigido: 50, justificativa: "digitação" });
  assert.deepEqual(r, { acao: "Corrigiu", item: "Resposta sinalizada", alteracao: "valor 500 → 50 · motivo: digitação" });
});

test("aprovar e excluir têm ação própria", () => {
  const f = (s) => descrever("sinalizacao", "UPDATE", { status: "PENDENTE", valor_original: 5 }, { status: s, justificativa: null }).acao;
  assert.equal(f("APROVADA"), "Aprovou");
  assert.equal(f("EXCLUIDA"), "Excluiu");
});

test("alteração lista só os campos que mudaram", () => {
  const r = descrever("usuario", "UPDATE", { nome: "Ana", ativo: true }, { nome: "Ana", ativo: false });
  assert.equal(r.alteracao, "ativo: sim → não");
});

test("credenciais nunca aparecem", () => {
  const r = descrever("usuario", "UPDATE", { codigo_acesso: "OTO482", token_hash: "a" }, { codigo_acesso: "OTO999", token_hash: "b" });
  assert.doesNotMatch(r.alteracao, /OTO482|OTO999|: a|→ b/);
  assert.match(r.alteracao, /oculto/);
  assert.equal(descrever("usuario", "UPDATE", { id: 1 }, { id: 1 }).alteracao, "sem mudança visível (a senha não é registrada)");
});

test("entidade desconhecida e texto enorme não quebram", () => {
  const r = descrever("nova_tabela", "INSERT", null, { nome: "x".repeat(1000) });
  assert.equal(r.item, "nova_tabela");
  assert.equal(r.alteracao.length, 300);
  assert.equal(descrever("pesquisa", "DELETE", null, null).alteracao, "");
});
