import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { verVersao } from "@/lib/formularios/formularios";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json(await verVersao((await ctx.params).id), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
