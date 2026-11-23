import { NextRequest, NextResponse } from "next/server";
import { getMobilePool } from "@/lib/db";
import { criarLimitador, type Limitador } from "@/lib/auth/limitador";
import { ipDe } from "@/lib/auth/servidor";
import { tokenSyncValido } from "@/lib/auth/sync";

// Login do pesquisador no app (RF03): confere o código no banco. Códigos são curtos: erros seguidos bloqueiam.
const g = globalThis as typeof globalThis & { __otoLimitePesquisador?: Limitador };
const limite = (g.__otoLimitePesquisador ??= criarLimitador({ maxFalhas: 20, janelaMs: 15 * 60_000, bloqueioMs: 15 * 60_000 }));

const resposta = (status: number, corpo: object) =>
  NextResponse.json(corpo, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!tokenSyncValido(req.headers.get("authorization"), process.env.SYNC_API_TOKEN)) {
    return resposta(401, { error: "Token de sincronização ausente ou inválido" });
  }
  const corpo = await req.json().catch(() => null);
  const codigo = typeof corpo?.codigo === "string" ? corpo.codigo.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (codigo.length < 4 || codigo.length > 10) return resposta(400, { error: "Código inválido" });
  const ip = ipDe(req);
  if (limite.bloqueado(ip)) return resposta(429, { error: "Muitas tentativas. Aguarde alguns minutos." });
  try {
    const { rows } = await getMobilePool().query(
      `SELECT u.codigo_acesso AS codigo, u.nome, lc.nome AS local
         FROM oto.usuario u LEFT JOIN oto.local_coleta lc ON lc.id = u.local_padrao_id
        WHERE u.codigo_acesso = $1 AND u.perfil = 'PESQUISADOR' AND u.ativo`,
      [codigo]
    );
    if (!rows[0]) {
      limite.registrarFalha(ip);
      return resposta(404, { error: "Código não encontrado" });
    }
    return resposta(200, { codigo: rows[0].codigo, nome: rows[0].nome, local: rows[0].local ?? "" });
  } catch (e) {
    console.error("[pesquisador] falha ao conferir o código:", e);
    return resposta(503, { error: "Falha ao consultar o banco de dados" });
  }
}
