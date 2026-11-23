import assert from "node:assert/strict";
import test from "node:test";

// Requer: painel rodando (DASHBOARD_URL), banco com a migracao V005 e as contas de teste criadas por
// oto-db/scripts/criar_usuarios_teste.sh. Senhas vem do ambiente:
//   TEST_ADMIN_EMAIL / TEST_ADMIN_SENHA, TEST_VIS_EMAIL / TEST_VIS_SENHA, TEST_PESQ_EMAIL / TEST_PESQ_SENHA
const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const origin = new URL(base).origin;
const manual = { redirect: "manual" };

async function entrar(email, senha) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, senha }),
    ...manual,
  });
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, cookie, headers: r.headers };
}

const get = (path, cookie) => fetch(`${base}${path}`, { headers: cookie ? { cookie } : {}, ...manual });
const post = (path, body, cookie, extra = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}), ...extra },
    body: JSON.stringify(body),
    ...manual,
  });

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`defina ${k} para rodar os testes de integracao de autenticacao`);
  return v;
};

test("visitante anonimo ve Analises e a API publica", async () => {
  assert.equal((await get("/analises/panorama")).status, 200);
  const r = await get("/api/analytics");
  assert.equal(r.status, 200);
  assert.ok((await r.json()).panorama);
});

test("visitante anonimo volta para Analises em Coleta e Sistema, sem ver onde fica o login", async () => {
  for (const p of ["/coleta/pesquisas", "/coleta/revisao", "/sistema/usuarios", "/sistema/auditoria"]) {
    const r = await get(p);
    assert.ok([302, 303, 307, 308].includes(r.status), `${p} -> ${r.status}`);
    assert.equal(new URL(r.headers.get("location"), base).pathname, "/analises/panorama");
  }
});

test("API administrativa nega anonimo (GET e POST) e nao vaza dados", async () => {
  const g = await get("/api/state");
  assert.equal(g.status, 401);
  const corpo = await g.text();
  assert.doesNotMatch(corpo, /usuarios|auditoria|codigo/i);
  const p = await post("/api/state", { action: "CRIAR_USUARIO", payload: { nome: "Invasor", perfil: "ADMINISTRADOR" } });
  assert.equal(p.status, 401);
});

test("login com senha errada ou usuario inexistente: mesma resposta generica", async () => {
  const a = await entrar(env("TEST_ADMIN_EMAIL"), "senha-errada-123");
  const b = await entrar("ninguem@exemplo.com", "senha-errada-123");
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.cookie, "");
});

test("administrador entra, usa Coleta/Sistema e o cookie e HttpOnly", async () => {
  const s = await entrar(env("TEST_ADMIN_EMAIL"), env("TEST_ADMIN_SENHA"));
  assert.equal(s.status, 200);
  assert.ok(s.cookie.length > 0);
  const setCookie = (s.headers.getSetCookie?.() ?? []).join(" | ");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.equal((await get("/coleta/pesquisas", s.cookie)).status, 200);
  assert.equal((await get("/sistema/usuarios", s.cookie)).status, 200);
  assert.equal((await get("/api/state", s.cookie)).status, 200);
});

test("visualizador nao faz login: mesma resposta de senha errada e nenhum cookie", async () => {
  const s = await entrar(env("TEST_VIS_EMAIL"), env("TEST_VIS_SENHA"));
  assert.equal(s.status, 401);
  assert.equal(s.cookie, "");
});

test("a pagina publica nao aponta para o login e /login nao existe", async () => {
  const html = await (await get("/analises/panorama")).text();
  assert.doesNotMatch(html, /href="[^"]*(login|acesso)/i);
  assert.doesNotMatch(html, /Entrar/);
  assert.equal((await get("/login")).status, 404);
});

test("pesquisador nao tem acesso ao painel web", async () => {
  const s = await entrar(env("TEST_PESQ_EMAIL"), env("TEST_PESQ_SENHA"));
  assert.equal(s.status, 401);
  assert.equal(s.cookie, "");
});

test("escrita administrativa exige Origin do proprio site (CSRF)", async () => {
  const s = await entrar(env("TEST_ADMIN_EMAIL"), env("TEST_ADMIN_SENHA"));
  const r = await post("/api/state", { action: "TOGGLE_ITEM_PUBLICACAO", payload: { id: "x" } }, s.cookie, {
    origin: "https://evil.example",
  });
  assert.equal(r.status, 403);
});

test("autor da auditoria vem da sessao, nao do corpo da requisicao", async () => {
  const s = await entrar(env("TEST_ADMIN_EMAIL"), env("TEST_ADMIN_SENHA"));
  const r = await post(
    "/api/state",
    { action: "CRIAR_OPERADOR", payload: { nome: "Operador Teste Auth" }, usuario: "Fulano Falso" },
    s.cookie
  );
  assert.equal(r.status, 200);
  const estado = await r.json();
  const registro = estado.auditoria.find((a) => a.item.includes("Operador Teste Auth"));
  assert.ok(registro);
  assert.notEqual(registro.usuario, "Fulano Falso");
});

test("rate limit: muitas senhas erradas seguidas bloqueiam o login (429)", async () => {
  const email = `forca-bruta-${Date.now()}@exemplo.com`;
  let ultimo = 0;
  for (let i = 0; i < 12; i++) ultimo = (await entrar(email, `errada-${i}-xyz`)).status;
  assert.equal(ultimo, 429);
});

test("logout invalida o acesso no navegador (cookie limpo)", async () => {
  const s = await entrar(env("TEST_ADMIN_EMAIL"), env("TEST_ADMIN_SENHA"));
  const r = await post("/api/auth/logout", {}, s.cookie);
  assert.equal(r.status, 200);
  assert.match((r.headers.getSetCookie?.() ?? []).join(" | "), /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
});

test("API do app: lote sem token e recusado", async () => {
  const r = await post("/api/v1/pesquisas/lote", { pesquisas: [] });
  assert.equal(r.status, 401);
});
