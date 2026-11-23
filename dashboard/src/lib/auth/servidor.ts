// Sessão no servidor: lê o cookie, valida o token e relê usuário e perfil no banco a cada requisição
// (desativar alguém ou mudar as áreas de um perfil vale na hora, sem esperar o token expirar).
import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { verificarToken, DURACAO_SESSAO_S } from "./token";
import { podeAcessar, temAcessoWeb, type Area } from "./permissoes";
import { origemPermitida } from "./origem";

export const COOKIE_SESSAO = "oto_sessao";

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  perfil: { id: number; nome: string };
  areas: Record<Area, boolean>;
}

/** Segredo do cookie. Sem AUTH_SECRET forte, ninguém entra (falha fechada). */
export function segredoSessao(): string {
  const s = process.env.AUTH_SECRET ?? "";
  if (s.length < 32) throw new Error("AUTH_SECRET ausente ou curto (mínimo 32 caracteres). Veja dashboard/.env.example.");
  return s;
}

const SQL_USUARIO = `
  SELECT u.id, u.nome, u.email, u.senha_hash, u.ativo,
         p.id AS perfil_id, p.nome AS perfil_nome,
         p.acesso_analises, p.acesso_coleta, p.acesso_sistema
    FROM oto.usuario u
    JOIN oto.perfil_acesso p ON p.id = u.perfil_acesso_id`;

interface LinhaUsuario {
  id: string;
  nome: string;
  email: string | null;
  senha_hash: string | null;
  ativo: boolean;
  perfil_id: number;
  perfil_nome: string;
  acesso_analises: boolean;
  acesso_coleta: boolean;
  acesso_sistema: boolean;
}

function paraSessao(l: LinhaUsuario): UsuarioSessao {
  return {
    id: l.id,
    nome: l.nome,
    email: l.email ?? "",
    perfil: { id: l.perfil_id, nome: l.perfil_nome },
    areas: { analises: l.acesso_analises, coleta: l.acesso_coleta, sistema: l.acesso_sistema },
  };
}

export async function buscarPorEmail(email: string): Promise<(UsuarioSessao & { senhaHash: string | null; ativo: boolean }) | null> {
  const r = await getDbPool().query<LinhaUsuario>(`${SQL_USUARIO} WHERE lower(u.email) = lower($1)`, [email]);
  const l = r.rows[0];
  return l ? { ...paraSessao(l), senhaHash: l.senha_hash, ativo: l.ativo } : null;
}

async function buscarAtivoPorId(id: string): Promise<UsuarioSessao | null> {
  const r = await getDbPool().query<LinhaUsuario>(`${SQL_USUARIO} WHERE u.id = $1 AND u.ativo`, [id]);
  return r.rows[0] ? paraSessao(r.rows[0]) : null;
}

/** Usuário logado e ainda autorizado a usar o painel, ou null. */
export async function sessaoAtual(req: NextRequest): Promise<UsuarioSessao | null> {
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  let segredo: string;
  try {
    segredo = segredoSessao();
  } catch {
    return null;
  }
  const dados = await verificarToken(token, segredo);
  if (!dados || !/^[0-9a-f-]{36}$/i.test(dados.uid)) return null;
  const u = await buscarAtivoPorId(dados.uid).catch(() => null);
  return u && temAcessoWeb(u.areas) ? u : null;
}

export function erro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ erro: mensagem }, { status, headers: { "cache-control": "no-store" } });
}

/** Escrita só com Origin/Referer do próprio site (CSRF). */
export function origemOk(req: NextRequest): boolean {
  return origemPermitida({
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
  });
}

/**
 * Guarda das rotas de API: exige sessão (401) e alguma das áreas (403).
 * Para métodos que alteram dados, exige também origem do próprio site (403).
 */
export async function exigir(
  req: NextRequest,
  areas: Area[]
): Promise<{ usuario: UsuarioSessao; resposta?: undefined } | { usuario?: undefined; resposta: NextResponse }> {
  if (req.method !== "GET" && req.method !== "HEAD" && !origemOk(req)) {
    return { resposta: erro(403, "Origem da requisição não permitida.") };
  }
  const usuario = await sessaoAtual(req);
  if (!usuario) return { resposta: erro(401, "Faça login para continuar.") };
  if (!areas.some((a) => podeAcessar(usuario.areas, a))) {
    return { resposta: erro(403, "Seu perfil não tem acesso a esta área.") };
  }
  return { usuario };
}

export function cookieSessao(req: NextRequest, valor: string, maxAge = DURACAO_SESSAO_S) {
  const https = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return {
    name: COOKIE_SESSAO,
    value: valor,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: https,
    path: "/",
    maxAge,
  };
}

export function ipDe(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "sem-ip";
}
