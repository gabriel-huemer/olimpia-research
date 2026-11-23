// Validação de respostas digitadas ou importadas (o app valida as dele). Módulo puro, testado com `node --test`.
import { conceitoDe, converterValor, type ContextoConversao, type Opcao, type TipoPergunta } from "./conversao.ts";

export interface PerguntaValidavel {
  codigo: string;
  enunciado: string;
  tipo: TipoPergunta;
  opcoes: Opcao[];
  faixa: { min: number | null; max: number | null; mensagem: string } | null;
}

const MAX_NUMERO = 1e12; // numeric(14,2)
const DATA_MINIMA = "1900-01-01";

function dataReal(t: string): boolean {
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === t && t >= DATA_MINIMA && t <= "2100-12-31";
}

/** Motivo da recusa, ou null se o valor serve. Vazio sempre serve: ninguém é obrigado a responder. */
export function problemaDe(p: PerguntaValidavel, valor: unknown, ctx: ContextoConversao): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "string" && valor.includes("\0")) return `${p.enunciado}: texto inválido`;
  if (p.tipo === "MATRIZ_AVALIACAO") return `${p.enunciado}: responda item por item`;
  for (const v of converterValor(p.tipo, valor, p.opcoes, ctx)) {
    if (v.numero !== undefined) {
      const inteiro = p.tipo !== "MOEDA";
      if (v.numero < 0 || v.numero >= MAX_NUMERO || (inteiro && !Number.isInteger(v.numero))) {
        return `${p.enunciado}: número inválido (${v.numero})`;
      }
      if (p.tipo === "ESCALA_0_10" && v.numero > 10) return `${p.enunciado}: use de 0 a 10`;
    }
    if (v.data !== undefined && !dataReal(v.data)) return `${p.enunciado}: data inválida (${v.data})`;
    if (v.texto !== undefined && ["NUMERO", "MOEDA", "ESCALA_0_10", "CONTADOR_POR_FAIXA", "DATA"].includes(p.tipo)) {
      return `${p.enunciado}: valor inválido (${v.texto.slice(0, 40)})`;
    }
  }
  return null;
}

/** Alerta de curadoria (RF13) para um valor aceito, mas fora da faixa esperada. */
export function alertaDe(p: PerguntaValidavel, valor: unknown, ctx: ContextoConversao): string | null {
  if (!p.faixa) return null;
  const n = converterValor(p.tipo, valor, p.opcoes, ctx)[0]?.numero;
  if (n === undefined) return null;
  const fora = (p.faixa.min !== null && n < p.faixa.min) || (p.faixa.max !== null && n > p.faixa.max);
  return fora ? p.faixa.mensagem : null;
}

export function conceitoValido(valor: unknown): boolean {
  return valor === "" || valor === null || valor === undefined || conceitoDe(valor) !== null;
}
