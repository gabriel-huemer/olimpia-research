import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { formularioAtivo } from "@/lib/pesquisas/formulario";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta", "sistema"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json({ secoes: await formularioAtivo() }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
