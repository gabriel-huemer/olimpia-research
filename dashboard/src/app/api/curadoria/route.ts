import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { listarFila } from "@/lib/curadoria/curadoria";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    return NextResponse.json({ itens: await listarFila() }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
