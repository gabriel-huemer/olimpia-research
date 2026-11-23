// Regras do valor corrigido na curadoria. Módulo puro, testado com `node --test`.

export type ResultadoValor = { ok: true; numero: number } | { ok: false; motivo: string };

const MAXIMO = 1e12; // numeric(14,2)
const recusa = (motivo: string): ResultadoValor => ({ ok: false, motivo });

/** Só NUMERO (inteiro) e MOEDA são corrigíveis: são os tipos que o app sinaliza. */
export function validarNovoValor(tipo: string, bruto: unknown): ResultadoValor {
  if (tipo !== "NUMERO" && tipo !== "MOEDA") return recusa("Este tipo de resposta não pode ser corrigido por aqui.");
  let t = typeof bruto === "string" || typeof bruto === "number" ? String(bruto).trim() : "";
  if (!t) return recusa("Informe o novo valor.");

  if (tipo === "NUMERO") {
    if (!/^\d+$/.test(t)) return recusa("Use um número inteiro, sem sinal.");
  } else {
    t = t.replace(/^R\$\s*/, "");
    const brasileiro = /^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(t);
    if (!brasileiro && !/^\d+\.\d{1,2}$/.test(t)) return recusa("Use um valor em reais, como 850,50.");
    if (brasileiro) t = t.replaceAll(".", "").replace(",", ".");
  }
  const numero = Number(t);
  return numero < MAXIMO ? { ok: true, numero } : recusa("Valor grande demais.");
}

export interface Faixa {
  min: number | null;
  max: number | null;
}

export function foraDaFaixa(numero: number, faixa: Faixa | null): boolean {
  if (!faixa) return false;
  return (faixa.min !== null && numero < faixa.min) || (faixa.max !== null && numero > faixa.max);
}
