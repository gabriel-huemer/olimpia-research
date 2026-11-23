import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { executarAcao, listarVersoes } from "@/lib/formularios/formularios";

const semCache = { headers: { "cache-control": "no-store" } };

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json({ versoes: await listarVersoes() }, semCache);
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function POST(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json({ versoes: await executarAcao(g.usuario.id, corpo ?? {}) }, semCache);
  } catch (e) {
    return respostaDeErro(e);
  }
}
