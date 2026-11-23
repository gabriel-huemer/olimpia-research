import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { decidir, detalhar } from "@/lib/curadoria/curadoria";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Contexto) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json(await detalhar((await ctx.params).id), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function POST(req: NextRequest, ctx: Contexto) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json({ ok: true, ...(await decidir(g.usuario, (await ctx.params).id, corpo)) });
  } catch (e) {
    return respostaDeErro(e);
  }
}
