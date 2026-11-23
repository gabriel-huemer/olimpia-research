import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import { lerFiltros } from "@/lib/filtros";
import { calcularPainel, opcoesDeFiltro } from "@/lib/paineis";
import { ABAS, paineisVazios, type Aba } from "@/lib/paineis-types";
import { sessaoAtual } from "@/lib/auth/servidor";

export const dynamic = "force-dynamic";

// Pública (dados abertos). `aba` escolhe o painel; sem `aba`, devolve o Panorama.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const aba = (q.get("aba") ?? "panorama") as Aba;
  if (!ABAS.includes(aba)) return NextResponse.json({ erro: "Aba desconhecida." }, { status: 400 });
  const filters = lerFiltros(q);
  const headers = { "cache-control": "no-store" };
  if (!(await isDatabaseAvailable())) {
    return NextResponse.json({ dbConnected: false, filters, [aba]: paineisVazios[aba] }, { headers });
  }
  try {
    const comTexto = aba === "infraestrutura" && (await sessaoAtual(request)) !== null;
    const [painel, opcoes] = await Promise.all([calcularPainel(aba, filters, comTexto), opcoesDeFiltro()]);
    return NextResponse.json({ dbConnected: true, filters, opcoes, [aba]: painel }, { headers });
  } catch (e) {
    console.error("[analytics] falha ao calcular", aba, e);
    return NextResponse.json({ dbConnected: false, filters, [aba]: paineisVazios[aba], erro: "Erro interno." }, { status: 500, headers });
  }
}
