import { NextRequest, NextResponse } from "next/server";
import { lerFiltros } from "@/lib/filtros";
import { dadosDoRelatorio } from "@/lib/relatorio/dados";

export const dynamic = "force-dynamic";

// Pública como as Análises: só números agregados.
export async function GET(req: NextRequest) {
  try {
    const dados = await dadosDoRelatorio(lerFiltros(req.nextUrl.searchParams));
    return NextResponse.json(dados, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[relatorio] falha ao calcular", e);
    return NextResponse.json({ erro: "Não foi possível montar o relatório." }, { status: 500 });
  }
}
