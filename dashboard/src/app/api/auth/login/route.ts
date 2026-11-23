import { NextRequest, NextResponse } from "next/server";
import { criarLimitador, type Limitador } from "@/lib/auth/limitador";
import { verificarSenha } from "@/lib/auth/senha";
import { criarToken } from "@/lib/auth/token";
import { temAcessoWeb } from "@/lib/auth/permissoes";
import { buscarPorEmail, cookieSessao, erro, ipDe, origemOk, segredoSessao } from "@/lib/auth/servidor";

// Em globalThis para sobreviver ao recarregamento do `next dev`.
const g = globalThis as typeof globalThis & { __otoLimitadores?: { porIpEmail: Limitador; porEmail: Limitador } };
const limitadores = (g.__otoLimitadores ??= {
  // 5 erros em 15 min de um mesmo IP para um e-mail bloqueiam por 15 min...
  porIpEmail: criarLimitador({ maxFalhas: 5, janelaMs: 15 * 60_000, bloqueioMs: 15 * 60_000 }),
  // ...e 20 erros para o mesmo e-mail, vindos de qualquer IP, também (ataque distribuído).
  porEmail: criarLimitador({ maxFalhas: 20, janelaMs: 15 * 60_000, bloqueioMs: 15 * 60_000 }),
});

const GENERICO = "E-mail ou senha inválidos.";

export async function POST(req: NextRequest) {
  if (!origemOk(req)) return erro(403, "Origem da requisição não permitida.");

  let segredo: string;
  try {
    segredo = segredoSessao();
  } catch (e) {
    console.error("[auth]", (e as Error).message);
    return erro(500, "Login indisponível: servidor sem AUTH_SECRET configurado.");
  }

  const corpo = await req.json().catch(() => null);
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";
  if (!email || !senha || email.length > 200 || senha.length > 200) return erro(400, "Informe e-mail e senha.");

  const chaveIp = `${ipDe(req)}|${email}`;
  if (limitadores.porIpEmail.bloqueado(chaveIp) || limitadores.porEmail.bloqueado(email)) {
    return erro(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }

  const u = await buscarPorEmail(email).catch(() => null);
  // Sempre compara (mesmo sem usuário) para o tempo de resposta não revelar quais e-mails existem.
  const senhaOk = await verificarSenha(senha, u?.senhaHash ?? null);
  if (!u || !senhaOk || !u.ativo) {
    limitadores.porIpEmail.registrarFalha(chaveIp);
    limitadores.porEmail.registrarFalha(email);
    return erro(401, GENERICO);
  }
  limitadores.porIpEmail.registrarSucesso(chaveIp);
  limitadores.porEmail.registrarSucesso(email);

  if (!temAcessoWeb(u.areas)) {
    return erro(403, "Seu perfil não tem acesso ao painel web. Pesquisadores usam o aplicativo.");
  }

  const token = await criarToken({ uid: u.id, perfilId: u.perfil.id }, segredo);
  const res = NextResponse.json(
    { usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, areas: u.areas } },
    { headers: { "cache-control": "no-store" } }
  );
  res.cookies.set(cookieSessao(req, token));
  return res;
}
