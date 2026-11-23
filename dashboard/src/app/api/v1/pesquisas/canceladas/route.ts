import { NextRequest, NextResponse } from "next/server";
import { tokenSyncValido } from "@/lib/auth/sync";
import { registrarCanceladas } from "@/lib/canceladas/canceladas";

// Contrato: POST { canceladas: [{ id, pesquisador, motivo, iniciadaEm, canceladaEm }] } -> { aceitas: [uuid] }
export async function POST(req: NextRequest) {
  if (!tokenSyncValido(req.headers.get("authorization"), process.env.SYNC_API_TOKEN)) {
    return NextResponse.json({ error: "Token de sincronização ausente ou inválido" }, { status: 401 });
  }
  const corpo = await req.json().catch(() => null);
  if (!Array.isArray(corpo?.canceladas) || corpo.canceladas.length > 50) {
    return NextResponse.json({ error: "Campo 'canceladas' deve ser uma lista de até 50" }, { status: 400 });
  }
  try {
    return NextResponse.json({ aceitas: await registrarCanceladas(corpo.canceladas) });
  } catch (e) {
    console.error("[canceladas]", e);
    return NextResponse.json({ error: "Falha ao gravar no banco de dados" }, { status: 503 });
  }
}
