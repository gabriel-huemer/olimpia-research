import { NextRequest, NextResponse } from "next/server";
import { exigir } from "@/lib/auth/servidor";
import { ErroAdmin } from "@/lib/auth/admin";
import { respostaDeErro } from "@/lib/auth/resposta";
import { importar, listarImportacoes, modelo, preverImportacao } from "@/lib/importacao/importacao";

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  try {
    const [importacoes, colunas] = await Promise.all([listarImportacoes(), modelo()]);
    return NextResponse.json({ importacoes, colunas }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}

// Corpo = o arquivo. Sem ?confirmar=1 só confere e mostra a prévia; nada é gravado.
export async function POST(req: NextRequest) {
  const g = await exigir(req, ["sistema"]);
  if (g.resposta) return g.resposta;
  try {
    const declarado = Number(req.headers.get("content-length") ?? 0);
    if (declarado > MAX_BYTES) throw new ErroAdmin(413, "Arquivo grande demais (limite de 8 MB).");
    const bytes = Buffer.from(await req.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new ErroAdmin(413, "Arquivo grande demais (limite de 8 MB).");
    const nome = (req.nextUrl.searchParams.get("nome") ?? "").replaceAll("\0", "").trim().slice(0, 255) || "planilha";
    if (req.nextUrl.searchParams.get("confirmar") === "1") {
      return NextResponse.json(await importar(g.usuario.id, nome, bytes), { status: 201 });
    }
    return NextResponse.json(await preverImportacao(nome, bytes));
  } catch (e) {
    return respostaDeErro(e);
  }
}
