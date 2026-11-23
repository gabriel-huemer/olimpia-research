import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { respostaDeErro } from "@/lib/auth/resposta";
import { listarOperadores, visaoGeral } from "@/lib/operadores/operadores";

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["coleta"]);
  if (g.resposta) return g.resposta;
  try {
    const [resumo, operadores] = await Promise.all([visaoGeral(), listarOperadores(7, false)]);
    return NextResponse.json({ ...resumo, operadores: operadores.filter((o) => o.ativo) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
