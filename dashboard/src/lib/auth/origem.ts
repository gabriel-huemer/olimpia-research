// Proteções de navegação: CSRF (Origin/Referer) e redirecionamento pós-login.

export const DESTINO_PADRAO = "/analises/panorama";

function hostDe(url: string | null | undefined): string | null {
  if (!url || url === "null") return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.host.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Requisição que altera dados só é aceita se vier do próprio site. */
export function origemPermitida(h: { origin?: string | null; referer?: string | null; host?: string | null }): boolean {
  const host = h.host?.toLowerCase();
  if (!host) return false;
  if (h.origin) return hostDe(h.origin) === host;
  return hostDe(h.referer) === host;
}

/** Só aceita caminho interno (evita open redirect) e nunca volta para o próprio /login. */
export function destinoSeguro(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) {
    return DESTINO_PADRAO;
  }
  try {
    const u = new URL(destino, "http://interno");
    if (u.host !== "interno" || u.pathname === "/login" || u.pathname.startsWith("/login/")) return DESTINO_PADRAO;
    return u.pathname + u.search;
  } catch {
    return DESTINO_PADRAO;
  }
}
