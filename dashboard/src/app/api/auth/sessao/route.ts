import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth/servidor";

export async function GET(req: NextRequest) {
  const usuario = await sessaoAtual(req);
  return NextResponse.json({ usuario }, { headers: { "cache-control": "no-store" } });
}
