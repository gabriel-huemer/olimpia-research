import { NextResponse } from "next/server";
import { indicadoresPublicos } from "@/lib/publicacao/publicacao";

export const dynamic = "force-dynamic";

// Sem login: só o que o gestor aprovou (RF21).
export async function GET() {
  try {
    return NextResponse.json(
      { ano: new Date().getFullYear(), indicadores: await indicadoresPublicos() },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    console.error("[publico]", e);
    return NextResponse.json({ erro: "Dados indisponíveis no momento." }, { status: 503 });
  }
}
