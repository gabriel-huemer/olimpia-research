// Login nos testes de integração. Contas criadas por oto-db/scripts/criar_usuarios_teste.sh;
// e-mails e senhas vêm do ambiente (TEST_ADMIN_EMAIL / TEST_ADMIN_SENHA etc.).
export const baseUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000";
export const origin = new URL(baseUrl).origin;

export function env(k) {
  const v = process.env[k];
  if (!v) throw new Error(`defina ${k} (veja oto-db/scripts/criar_usuarios_teste.sh)`);
  return v;
}

export async function entrar(email, senha) {
  const r = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, senha }),
    redirect: "manual",
  });
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, cookie, corpo: await r.json().catch(() => null) };
}

export async function entrarComoAdmin() {
  const s = await entrar(env("TEST_ADMIN_EMAIL"), env("TEST_ADMIN_SENHA"));
  if (s.status !== 200) throw new Error(`login do admin de teste falhou (${s.status})`);
  return s.cookie;
}

/** fetch com cookie de sessão e Origin do próprio site. */
export function chamar(cookie) {
  return (path, { method = "GET", body, headers = {} } = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(method !== "GET" ? { origin } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
}
