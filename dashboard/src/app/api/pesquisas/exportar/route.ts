import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { exportarPesquisas } from "@/lib/pesquisas/consulta";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json({ linhas: await exportarPesquisas(req.nextUrl.searchParams) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
