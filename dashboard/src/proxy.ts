// Portão das PÁGINAS de Coleta e Sistema. As rotas de API se protegem sozinhas (lib/auth/servidor.ts),
// porque precisam responder 401/403 em JSON e não redirecionar.
import { NextRequest, NextResponse } from "next/server";
import { areaDaRota, podeAcessar } from "@/lib/auth/permissoes";
import { DESTINO_PADRAO } from "@/lib/auth/origem";
import { sessaoAtual } from "@/lib/auth/servidor";

export async function proxy(req: NextRequest) {
  const area = areaDaRota(req.nextUrl.pathname);
  if (!area || podeAcessar(null, area)) return NextResponse.next();

  const usuario = await sessaoAtual(req);
  if (!usuario) {
    // Visitante volta para a parte pública; não revelamos onde fica o login.
    return NextResponse.redirect(new URL(DESTINO_PADRAO, req.url));
  }
  if (!podeAcessar(usuario.areas, area)) {
    const inicio = new URL(DESTINO_PADRAO, req.url);
    inicio.searchParams.set("negado", area);
    return NextResponse.redirect(inicio);
  }
  return NextResponse.next();
}

export const config = {
  // Todas as páginas; quem decide se a rota é protegida é areaDaRota (pega /COLETA, /x/../coleta etc.).
  matcher: ["/((?!_next/|api/|favicon\\.ico).*)"],
};
