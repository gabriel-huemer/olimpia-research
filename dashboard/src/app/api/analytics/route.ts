import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import { calcularPanorama } from "@/lib/panorama";
import { panoramaVazio } from "@/lib/panorama-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = {
    periodo: searchParams.get("periodo") || "Ano 2026",
    genero: searchParams.get("genero") || "Todos",
    faixaIdade: searchParams.get("faixaIdade") || "Todas",
    cidade: searchParams.get("cidade") || "Todas",
    hospedagem: searchParams.get("hospedagem") || "Todas",
    transporte: searchParams.get("transporte") || "Todos",
    localPesquisa: searchParams.get("localPesquisa") || "Todos",
  };

  if (!(await isDatabaseAvailable())) {
    return NextResponse.json({ dbConnected: false, filters, panorama: panoramaVazio });
  }
  try {
    return NextResponse.json({ dbConnected: true, filters, panorama: await calcularPanorama(filters) });
  } catch (e) {
    console.error("[analytics] falha ao calcular o panorama:", e);
    return NextResponse.json({ dbConnected: false, filters, panorama: panoramaVazio, error: (e as Error).message }, { status: 500 });
  }
}
