import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { indicadoresPublicos, listarPublicacao, publicar } from "@/lib/publicacao/publicacao";

const semCache = { headers: { "cache-control": "no-store" } };

// Com ?previa=a,b devolve exatamente o que o site mostraria com essa seleção.
export async function GET(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  try {
    const previa = req.nextUrl.searchParams.get("previa");
    if (previa !== null) return NextResponse.json({ indicadores: await indicadoresPublicos(previa.split(",")) }, semCache);
    return NextResponse.json(await listarPublicacao(), semCache);
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function PUT(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  const corpo = await req.json().catch(() => null);
  try {
    await publicar(g.usuario.id, corpo?.codigos);
    return NextResponse.json(await listarPublicacao(), semCache);
  } catch (e) {
    return respostaDeErro(e);
  }
}
