// Token da API de sincronização do app (Authorization: Bearer <SYNC_API_TOKEN>).
// Um token compartilhado por todos os aparelhos: impede que qualquer um na rede grave pesquisas.
// Próximo passo natural: token por pesquisador/aparelho emitido no login do app.
import { createHash, timingSafeEqual } from "node:crypto";

const MIN_TOKEN = 24;

const resumo = (s: string) => createHash("sha256").update(s).digest();

export function tokenSyncValido(authorization: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!esperado || esperado.length < MIN_TOKEN || !authorization) return false;
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!m) return false;
  // Compara resumos de tamanho fixo em tempo constante (não vaza o tamanho nem o prefixo certo).
  return timingSafeEqual(resumo(m[1]), resumo(esperado));
}
