import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { listarPesquisas, opcoesPesquisas } from "@/lib/pesquisas/consulta";
import { inserirManual } from "@/lib/pesquisas/manual";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    const [lista, opcoes] = await Promise.all([listarPesquisas(req.nextUrl.searchParams), opcoesPesquisas()]);
    return NextResponse.json({ ...lista, opcoes }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function POST(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json(await inserirManual(g.usuario.id, corpo ?? {}), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
