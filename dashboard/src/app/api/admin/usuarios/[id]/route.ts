import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { editarUsuario } from "@/lib/auth/admin";
import { respostaDeErro } from "@/lib/auth/resposta";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => ({}));
  try {
    await editarUsuario(g.usuario.id, id, { ativo: corpo?.ativo, perfilId: corpo?.perfilId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}
