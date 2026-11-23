// Conversão dos valores enviados pelo app do pesquisador para o modelo relacional do oto-db.
// Arquivo sem dependências (nem alias "@/"), para poder ser testado direto com `node --test`.

export interface Opcao {
  id: number;
  rotulo: string;
}

export interface ValorConvertido {
  opcaoId?: number;
  municipioIbge?: number;
  numero?: number;
  data?: string;
  texto?: string;
}

/** Minúsculas, sem acentos e com espaços normalizados: usado em todas as comparações de texto. */
export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function chaveMunicipio(uf: string, nome: string): string {
  return `${uf.toUpperCase()}|${norm(nome)}`;
}

/** "São Paulo (SP)" -> "SP". */
export function ufDeEstado(valor: unknown): string | null {
  const m = /\(([A-Za-z]{2})\)\s*$/.exec(String(valor ?? ""));
  return m ? m[1].toUpperCase() : null;
}

export type Conceito = "OTIMO" | "REGULAR" | "RUIM" | "NAO_SEI" | "NAO_UTILIZEI";

export function conceitoDe(valor: unknown): Conceito | null {
  const v = norm(valor);
  if (v.startsWith("otimo")) return "OTIMO";
  if (v.startsWith("regular")) return "REGULAR";
  if (v.startsWith("ruim")) return "RUIM";
  if (v.startsWith("nao sei")) return "NAO_SEI";
  if (v.startsWith("nao utilizei")) return "NAO_UTILIZEI";
  return null;
}

function acharOpcao(opcoes: Opcao[], texto: string): Opcao | undefined {
  const alvo = norm(texto);
  return opcoes.find((o) => norm(o.rotulo) === alvo);
}

/**
 * O app exporta múltipla escolha como "A, B, C", mas algumas opções têm vírgula no próprio texto.
 * Junta pedaços (do maior para o menor) até casar com uma opção conhecida.
 */
export function dividirMulti(valor: unknown, opcoes: Opcao[]): { opcoes: Opcao[]; sobras: string[] } {
  const itens = Array.isArray(valor) ? valor.map(String) : String(valor ?? "").split(", ");
  const achadas: Opcao[] = [];
  const sobras: string[] = [];
  let i = 0;
  while (i < itens.length) {
    let casou = false;
    for (let len = itens.length - i; len >= 1; len--) {
      const o = acharOpcao(opcoes, itens.slice(i, i + len).join(", "));
      if (o) {
        achadas.push(o);
        i += len;
        casou = true;
        break;
      }
    }
    if (!casou) {
      if (itens[i].trim()) sobras.push(itens[i].trim());
      i += 1;
    }
  }
  return { opcoes: achadas, sobras };
}

export function paraNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string" || !valor.trim()) return null;
  const t = valor.trim();
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

export type TipoPergunta =
  | "TEXTO" | "NUMERO" | "MOEDA" | "DATA" | "BOOLEANO" | "UNICA_ESCOLHA" | "MULTIPLA_ESCOLHA"
  | "MUNICIPIO" | "MUNICIPIO_MULTIPLO" | "PAIS" | "ESCALA_0_10" | "CONTADOR_POR_FAIXA" | "MATRIZ_AVALIACAO";

export interface ContextoConversao {
  /** Mapa "UF|nome normalizado" -> código IBGE. */
  municipios: Map<string, number>;
  /** UF de residência informada em outra pergunta do mesmo formulário (a cidade chega sem UF). */
  ufResidencia: string | null;
}

/** Converte o valor de UMA resposta em linhas de `resposta_valor`. Nada é descartado: o que não casa vira texto. */
export function converterValor(
  tipo: TipoPergunta,
  valor: unknown,
  opcoes: Opcao[],
  ctx: ContextoConversao,
): ValorConvertido[] {
  if (valor === null || valor === undefined || valor === "") return [];

  switch (tipo) {
    case "UNICA_ESCOLHA": {
      const o = acharOpcao(opcoes, String(valor));
      return [o ? { opcaoId: o.id } : { texto: String(valor).slice(0, 500) }];
    }
    case "MULTIPLA_ESCOLHA": {
      const { opcoes: achadas, sobras } = dividirMulti(valor, opcoes);
      return [
        ...achadas.map((o) => ({ opcaoId: o.id })),
        ...sobras.map((t) => ({ texto: t.slice(0, 500) })),
      ];
    }
    case "MUNICIPIO": {
      const nome = typeof valor === "object" && valor !== null ? String((valor as { name?: unknown }).name ?? "") : String(valor);
      const uf = typeof valor === "object" && valor !== null ? String((valor as { uf?: unknown }).uf ?? "") : ctx.ufResidencia ?? "";
      const ibge = uf ? ctx.municipios.get(chaveMunicipio(uf, nome)) : undefined;
      return [ibge ? { municipioIbge: ibge } : { texto: nome.slice(0, 500) }];
    }
    case "MUNICIPIO_MULTIPLO": {
      return String(valor)
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((par) => {
          const i = par.lastIndexOf(",");
          const nome = i >= 0 ? par.slice(0, i).trim() : par;
          const uf = i >= 0 ? par.slice(i + 1).trim() : "";
          const ibge = uf ? ctx.municipios.get(chaveMunicipio(uf, nome)) : undefined;
          return ibge ? { municipioIbge: ibge } : { texto: par.slice(0, 500) };
        });
    }
    case "DATA": {
      const t = String(valor).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(t) ? [{ data: t }] : [{ texto: String(valor).slice(0, 500) }];
    }
    case "NUMERO":
    case "MOEDA":
    case "ESCALA_0_10":
    case "CONTADOR_POR_FAIXA": {
      const n = paraNumero(valor);
      if (n !== null) return [{ numero: n }];
      if (/day\s*use/i.test(String(valor))) return [{ numero: 0 }];
      return [{ texto: String(valor).slice(0, 500) }];
    }
    case "BOOLEANO":
    case "PAIS":
    case "TEXTO":
    default:
      return [{ texto: String(valor).slice(0, 500) }];
  }
}
