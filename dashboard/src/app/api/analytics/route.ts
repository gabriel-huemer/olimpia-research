import { NextRequest, NextResponse } from "next/server";
import { getFilteredAnalytics } from "@/lib/mockAndSeedData";
import { isDatabaseAvailable, getDbPool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filters = {
    periodo: searchParams.get("periodo") || "Jan a out 2026",
    genero: searchParams.get("genero") || "Todos",
    faixaIdade: searchParams.get("faixaIdade") || "Todas",
    cidade: searchParams.get("cidade") || "Todas",
    hospedagem: searchParams.get("hospedagem") || "Todas",
    transporte: searchParams.get("transporte") || "Todos",
    localPesquisa: searchParams.get("localPesquisa") || "Todos",
  };

  let dbConnected = false;
  let dbValidResponsesCount: number | null = null;

  if (await isDatabaseAvailable()) {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        "SELECT COUNT(DISTINCT pesquisa_id)::int AS total FROM oto.vw_resposta_valida"
      );
      dbConnected = true;
      if (res.rows[0]?.total > 0) {
        dbValidResponsesCount = res.rows[0].total;
      }
    } catch {
      dbConnected = false;
    }
  }

  const analytics = getFilteredAnalytics(filters);
  if (dbValidResponsesCount && analytics.isDefault) {
    analytics.panorama.pesquisasColetadas = dbValidResponsesCount;
  }

  return NextResponse.json({
    dbConnected,
    filters,
    ...analytics,
  });
}
