// Token de sessão (JWT HS256) guardado em cookie HttpOnly.
// Só identifica o usuário: as permissões são relidas do banco a cada requisição.
import { SignJWT, jwtVerify } from "jose";

export interface DadosSessao {
  uid: string;
  perfilId: number;
}

export const DURACAO_SESSAO_S = 8 * 60 * 60;
const ALG = "HS256";
const MIN_SEGREDO = 32;

function chave(segredo: string): Uint8Array {
  if (!segredo || segredo.length < MIN_SEGREDO) {
    throw new Error(`segredo de sessão ausente ou curto (mínimo ${MIN_SEGREDO} caracteres)`);
  }
  return new TextEncoder().encode(segredo);
}

export async function criarToken(
  dados: DadosSessao,
  segredo: string,
  opcoes: { expiraEmSegundos?: number } = {}
): Promise<string> {
  const k = chave(segredo);
  const agora = Math.floor(Date.now() / 1000);
  return new SignJWT({ uid: dados.uid, perfilId: dados.perfilId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(agora)
    .setExpirationTime(agora + (opcoes.expiraEmSegundos ?? DURACAO_SESSAO_S))
    .sign(k);
}

export async function verificarToken(token: string | undefined | null, segredo: string): Promise<DadosSessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(segredo), { algorithms: [ALG] });
    if (typeof payload.uid !== "string" || typeof payload.perfilId !== "number") return null;
    return { uid: payload.uid, perfilId: payload.perfilId };
  } catch {
    return null;
  }
}
