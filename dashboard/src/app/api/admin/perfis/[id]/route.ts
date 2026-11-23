import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { editarPerfil } from "@/lib/auth/admin";
import { respostaDeErro } from "@/lib/auth/resposta";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ erro: "Perfil não encontrado." }, { status: 404 });
  const corpo = await req.json().catch(() => ({}));
  try {
    await editarPerfil(g.usuario.id, id, { nome: corpo?.nome, areas: corpo?.areas });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}
