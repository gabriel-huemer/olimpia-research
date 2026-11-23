import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { editarOperador } from "@/lib/operadores/operadores";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json({ ok: true, ...(await editarOperador(g.usuario.id, (await ctx.params).id, corpo ?? {})) });
  } catch (e) {
    return respostaDeErro(e);
  }
}
