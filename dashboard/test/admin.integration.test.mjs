import assert from "node:assert/strict";
import test from "node:test";
import { baseUrl, chamar, entrar, entrarComoAdmin, env } from "./support/sessao.mjs";

// Requer o painel rodando (DASHBOARD_URL), banco com V005 e as contas de teste (TEST_*).
// Cria perfis e usuários com sufixo único: pode rodar várias vezes no mesmo banco.
const sufixo = Date.now();
const admin = chamar(await entrarComoAdmin());
const anonimo = chamar(null);
const json = async (r) => ({ status: r.status, corpo: await r.json().catch(() => null) });

test("sessão: anônimo recebe null; logado recebe nome e áreas, sem hash de senha", async () => {
  assert.deepEqual((await json(await anonimo("/api/auth/sessao"))).corpo, { usuario: null });
  const { corpo } = await json(await admin("/api/auth/sessao"));
  assert.equal(corpo.usuario.email, env("TEST_ADMIN_EMAIL"));
  assert.deepEqual(corpo.usuario.areas, { analises: true, coleta: true, sistema: true });
  assert.doesNotMatch(JSON.stringify(corpo), /senha|hash|\$2[aby]\$/i);
});

test("perfis: anônimo 401, visualizador 403, admin lista os 3 padrão", async () => {
  assert.equal((await anonimo("/api/admin/perfis")).status, 401);
  const vis = await entrar(env("TEST_VIS_EMAIL"), env("TEST_VIS_SENHA"));
  assert.equal((await chamar(vis.cookie)("/api/admin/perfis")).status, 403);
  const { status, corpo } = await json(await admin("/api/admin/perfis"));
  assert.equal(status, 200);
  const padrao = corpo.perfis.filter((p) => p.padrao).map((p) => p.nome).sort();
  assert.deepEqual(padrao, ["ADMINISTRADOR", "PESQUISADOR", "VISUALIZADOR"]);
});

test("perfis: criar valida nome e não aceita duplicado; perfil padrão não é editável", async () => {
  const nome = `Estagiario ${sufixo}`;
  const criado = await json(await admin("/api/admin/perfis", { method: "POST", body: { nome, areas: { coleta: true } } }));
  assert.equal(criado.status, 201);
  assert.deepEqual(criado.corpo.perfil.areas, { analises: false, coleta: true, sistema: false });
  assert.equal((await admin("/api/admin/perfis", { method: "POST", body: { nome: nome.toUpperCase(), areas: {} } })).status, 409);
  assert.equal((await admin("/api/admin/perfis", { method: "POST", body: { nome: "  ", areas: {} } })).status, 400);

  const lista = (await json(await admin("/api/admin/perfis"))).corpo.perfis;
  const vis = lista.find((p) => p.nome === "VISUALIZADOR");
  const r = await admin(`/api/admin/perfis/${vis.id}`, { method: "PATCH", body: { areas: { sistema: true } } });
  assert.equal(r.status, 409);
});

test("escrita administrativa recusa Origin de outro site (CSRF)", async () => {
  const r = await admin("/api/admin/perfis", {
    method: "POST",
    body: { nome: `Csrf ${sufixo}`, areas: {} },
    headers: { origin: "https://evil.example" },
  });
  assert.equal(r.status, 403);
});

test("usuários: senha fraca e e-mail inválido são recusados", async () => {
  const base = { nome: "Fraco", email: `fraco.${sufixo}@exemplo.com`, perfilId: 3 };
  assert.equal((await admin("/api/admin/usuarios", { method: "POST", body: { ...base, senha: "senha12345" } })).status, 400);
  assert.equal((await admin("/api/admin/usuarios", { method: "POST", body: { ...base, email: "sem-arroba", senha: "Boa-Senha-2026" } })).status, 400);
});

test("perfil personalizado vale na hora: criar, entrar, mudar áreas e desativar", async () => {
  const perfil = (await json(await admin("/api/admin/perfis", {
    method: "POST",
    body: { nome: `So Coleta ${sufixo}`, areas: { analises: true, coleta: true } },
  }))).corpo.perfil;

  const email = `coleta.${sufixo}@exemplo.com`;
  const senha = `Coleta-${sufixo}-ok`;
  const novo = await json(await admin("/api/admin/usuarios", {
    method: "POST",
    body: { nome: "Usuaria Coleta", email, perfilId: perfil.id, senha },
  }));
  assert.equal(novo.status, 201);
  assert.doesNotMatch(JSON.stringify(novo.corpo), /\$2[aby]\$/);

  const lista = (await json(await admin("/api/admin/usuarios"))).corpo.usuarios;
  assert.ok(lista.some((u) => u.email === email && u.perfil.id === perfil.id));

  const s = await entrar(email, senha);
  assert.equal(s.status, 200);
  const u = chamar(s.cookie);
  assert.equal((await u("/coleta/pesquisas")).status, 200);
  assert.ok([302, 303, 307, 308, 403].includes((await u("/sistema/usuarios")).status));
  const estado = await json(await u("/api/state"));
  assert.equal(estado.status, 200);
  assert.ok(Array.isArray(estado.corpo.pesquisas));
  assert.ok(!("auditoria" in estado.corpo), "sem Sistema não recebe auditoria");
  assert.equal((await u("/api/admin/usuarios")).status, 403);

  // Admin tira Coleta do perfil: a mesma sessão perde acesso sem precisar sair.
  assert.equal((await admin(`/api/admin/perfis/${perfil.id}`, { method: "PATCH", body: { areas: { analises: true, coleta: false } } })).status, 200);
  assert.equal((await u("/api/state")).status, 403);

  // Admin desativa a usuária: a sessão deixa de valer.
  const id = novo.corpo.usuario.id;
  assert.equal((await admin(`/api/admin/usuarios/${id}`, { method: "PATCH", body: { ativo: false } })).status, 200);
  assert.equal((await u("/api/state")).status, 401);
  assert.equal((await entrar(email, senha)).status, 401);
});

test("admin não pode desativar a si mesmo nem tirar o próprio acesso a Sistema", async () => {
  const eu = (await json(await admin("/api/auth/sessao"))).corpo.usuario;
  assert.equal((await admin(`/api/admin/usuarios/${eu.id}`, { method: "PATCH", body: { ativo: false } })).status, 409);
  assert.equal((await admin(`/api/admin/usuarios/${eu.id}`, { method: "PATCH", body: { perfilId: 3 } })).status, 409);
});

test("página de login abre para anônimo", async () => {
  const r = await fetch(`${baseUrl}/login`);
  assert.equal(r.status, 200);
});
