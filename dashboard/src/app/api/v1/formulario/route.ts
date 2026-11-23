import { NextRequest, NextResponse } from "next/server";
import { tokenSyncValido } from "@/lib/auth/sync";
import { formularioDoApp } from "@/lib/formularios/app";

// Formulário publicado, baixado pelo app (RF05).
export async function GET(req: NextRequest) {
  if (!tokenSyncValido(req.headers.get("authorization"), process.env.SYNC_API_TOKEN)) {
    return NextResponse.json({ error: "Token de sincronização ausente ou inválido" }, { status: 401 });
  }
  try {
    const f = await formularioDoApp();
    if (!f) return NextResponse.json({ error: "Nenhum formulário publicado" }, { status: 404 });
    return NextResponse.json(f, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[formulario]", e);
    return NextResponse.json({ error: "Falha ao consultar o banco de dados" }, { status: 503 });
  }
}
