import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { criarPerfil, listarPerfis } from "@/lib/auth/admin";
import { respostaDeErro } from "@/lib/auth/resposta";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json({ perfis: await listarPerfis() });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function POST(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ perfil: await criarPerfil(g.usuario.id, corpo?.nome, corpo?.areas) }, { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
