import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { autores, consultarAuditoria, lerFiltro } from "@/lib/auditoria/auditoria";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  try {
    const [pagina, usuarios] = await Promise.all([consultarAuditoria(lerFiltro(req.nextUrl.searchParams)), autores()]);
    return NextResponse.json({ ...pagina, usuarios }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
