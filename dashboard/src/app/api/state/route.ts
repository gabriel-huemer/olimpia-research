import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import { contarPendentes } from "@/lib/curadoria/curadoria";
import { exigir } from "@/lib/auth/servidor";
import { podeAcessar } from "@/lib/auth/permissoes";

// Estado que o menu mostra em todas as telas: conexão e pendências de revisão.
export async function GET(request: NextRequest) {
  const g = await exigir(request, ["coleta", "sistema"]);
  if (g.resposta) return g.resposta;
  const dbConnected = await isDatabaseAvailable();
  const coleta = podeAcessar(g.usuario.areas, "coleta");
  return NextResponse.json(
    { dbConnected, ...(coleta && { pendentesRevisao: dbConnected ? await contarPendentes() : 0 }) },
    { headers: { "cache-control": "no-store" } }
  );
}
