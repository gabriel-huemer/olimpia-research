import { NextRequest, NextResponse } from "next/server";
import { POST as syncBatch } from "../../../sync/lote/route";

export async function POST(request: NextRequest) {
  const response = await syncBatch(request);
  const body = await response.json();

  if (!response.ok || !body.ok) {
    return NextResponse.json(body, { status: response.status });
  }

  return NextResponse.json({
    aceitas: (body.itens ?? []).map((item: { id: string }) => item.id),
    rejeitadas: {},
  });
}
