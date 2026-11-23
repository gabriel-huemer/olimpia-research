import { NextRequest, NextResponse } from "next/server";
import { ingerirLote, type PesquisaPayload } from "@/lib/ingestao/ingestao";
import { tokenSyncValido } from "@/lib/auth/sync";

/**
 * Sincronização em lote do app do pesquisador (UC05 / RF08).
 * Contrato: POST { pesquisas: [...] } -> { aceitas: [uuid], rejeitadas: { uuid: motivo } }
 * Grava no PostgreSQL (oto-db) com o papel oto_mobile; reenviar um lote não duplica nada.
 * Exige Authorization: Bearer <SYNC_API_TOKEN> (o app recebe via --dart-define=SYNC_API_TOKEN).
 */
export async function POST(request: NextRequest) {
  if (!tokenSyncValido(request.headers.get("authorization"), process.env.SYNC_API_TOKEN)) {
    return NextResponse.json({ error: "Token de sincronização ausente ou inválido" }, { status: 401 });
  }
  let body: { pesquisas?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição não é um JSON válido" }, { status: 400 });
  }
  if (!Array.isArray(body.pesquisas)) {
    return NextResponse.json({ error: "Campo 'pesquisas' deve ser uma lista" }, { status: 400 });
  }
  if (body.pesquisas.length > 50) {
    return NextResponse.json({ error: "Lote acima do limite de 50 pesquisas" }, { status: 413 });
  }

  try {
    const r = await ingerirLote(body.pesquisas as PesquisaPayload[]);
    return NextResponse.json({ aceitas: r.aceitas, duplicadas: r.duplicadas.length, rejeitadas: r.rejeitadas });
  } catch (e) {
    // Banco indisponível ou formulário não cadastrado: o app mantém o lote na fila e tenta de novo.
    console.error("[sync] falha ao gravar lote:", e);
    return NextResponse.json({ error: "Falha ao gravar no banco de dados" }, { status: 503 });
  }
}
