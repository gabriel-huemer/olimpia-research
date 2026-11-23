import { NextRequest, NextResponse } from "next/server";
import { trocarSenha } from "@/lib/auth/admin";
import { criarLimitador, type Limitador } from "@/lib/auth/limitador";
import { respostaDeErro } from "@/lib/auth/resposta";
import { erro, exigir } from "@/lib/auth/servidor";

const g = globalThis as typeof globalThis & { __otoLimiteSenha?: Limitador };
const limite = (g.__otoLimiteSenha ??= criarLimitador({ maxFalhas: 5, janelaMs: 15 * 60_000, bloqueioMs: 15 * 60_000 }));

// Troca a própria senha: exige a atual, para uma sessão esquecida aberta não tomar a conta.
export async function POST(req: NextRequest) {
  const s = await exigir(req, ["coleta", "sistema"]);
  if (s.resposta) return s.resposta;
  if (limite.bloqueado(s.usuario.id)) return erro(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  const corpo = await req.json().catch(() => null);
  try {
    if (!(await trocarSenha(s.usuario.id, corpo?.atual, corpo?.nova))) {
      limite.registrarFalha(s.usuario.id);
      return erro(400, "A senha atual não confere.");
    }
    limite.registrarSucesso(s.usuario.id);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return respostaDeErro(e);
  }
}
