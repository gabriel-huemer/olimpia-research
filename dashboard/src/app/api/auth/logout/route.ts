import { NextRequest, NextResponse } from "next/server";
import { cookieSessao, erro, origemOk } from "@/lib/auth/servidor";

export async function POST(req: NextRequest) {
  if (!origemOk(req)) return erro(403, "Origem da requisição não permitida.");
  const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(cookieSessao(req, "", 0));
  return res;
}
