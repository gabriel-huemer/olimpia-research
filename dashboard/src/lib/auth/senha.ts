// Senhas com bcrypt. Aceita hashes gerados pelo Postgres (pgcrypto, prefixo $2a$).
import bcrypt from "bcryptjs";

const CUSTO = 12;
const MAX_BYTES = 72; // bcrypt ignora o que passa disso

// Hash de uma senha aleatória descartada: usado quando o usuário não existe,
// para que a resposta leve o mesmo tempo (evita descobrir e-mails cadastrados).
const HASH_FALSO = "$2a$12$3zisJtehg3twzJedcDmEc.cKwKOhpel9VqZgX3Pv018mxQJdrJCKi";

export async function gerarHash(senha: string): Promise<string> {
  if (new TextEncoder().encode(senha).length > MAX_BYTES) {
    throw new Error(`senha passa de ${MAX_BYTES} bytes (limite do bcrypt)`);
  }
  return bcrypt.hash(senha, CUSTO);
}

export async function verificarSenha(senha: string, hash: string | null | undefined): Promise<boolean> {
  const alvo = typeof hash === "string" && hash.length > 0 ? hash : null;
  try {
    const ok = await bcrypt.compare(senha ?? "", alvo ?? HASH_FALSO);
    return alvo !== null && ok;
  } catch {
    return false;
  }
}

const OBVIAS = new Set([
  "senha12345", "senha123456", "1234567890", "12345678910", "qwerty12345", "password123",
  "admin12345", "olimpia2026", "olimpia123", "abc1234567",
]);

export function validarForcaSenha(senha: string): { ok: boolean; motivo?: string } {
  if (typeof senha !== "string" || senha.length < 10) return { ok: false, motivo: "Use pelo menos 10 caracteres." };
  if (new TextEncoder().encode(senha).length > MAX_BYTES) return { ok: false, motivo: "Senha longa demais." };
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return { ok: false, motivo: "Misture letras e números." };
  if (OBVIAS.has(senha.toLowerCase())) return { ok: false, motivo: "Senha muito comum." };
  return { ok: true };
}
