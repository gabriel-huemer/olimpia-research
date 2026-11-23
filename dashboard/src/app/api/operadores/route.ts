import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { criarOperador, lerDias, listarLocais, listarOperadores } from "@/lib/operadores/operadores";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    const dias = lerDias(req.nextUrl.searchParams.get("dias"));
    const [operadores, locais] = await Promise.all([listarOperadores(dias, g.usuario.areas.sistema), listarLocais()]);
    return NextResponse.json({ operadores, locais }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}

// Cadastrar e editar operador é do administrador (RF20).
export async function POST(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    return NextResponse.json(await criarOperador(g.usuario.id, corpo ?? {}), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
