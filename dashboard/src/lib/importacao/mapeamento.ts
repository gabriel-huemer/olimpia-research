// Descobre a que pergunta cada coluna da planilha corresponde. Módulo puro, testado com `node --test`.
import { norm } from "../ingestao/conversao.ts";
import type { Celula } from "./planilha.ts";

export interface Alvo {
  chave: string;
  titulos: string[];
  /** Posição (a partir de 1) na planilha de tabulação de 2026. */
  coluna: number | null;
  /** Título no modelo, quando o nome sozinho seria ambíguo. */
  modelo?: string;
}
export interface Mapeamento {
  linhaCabecalho: number;
  chaves: Array<string | null>;
  colunaData: number | null;
  colunaLocal: number | null;
  ignoradas: string[];
}

const DATA = new Set(["carimbo de data/hora", "data da pesquisa", "data pesquisa", "data/hora", "timestamp"]);
const LOCAL = new Set(["local", "local da pesquisa", "local de coleta"]);
const limpar = (c: Celula | undefined) => norm(c).replace(/[\s:.*?]+$/, "");
const colchetes = (t: string) => /\[([^\]]+)\]\s*$/.exec(t)?.[1]?.trim();

export function mapear(linhas: Celula[][], alvos: Alvo[]): Mapeamento | null {
  const porCodigo = new Map(alvos.map((a) => [norm(a.chave), a.chave]));
  const porTitulo = new Map<string, string>();
  for (const a of alvos) {
    for (const t of a.titulos.map(limpar)) if (t && !porTitulo.has(t)) porTitulo.set(t, a.chave);
  }
  const achar = (c: Celula) => {
    const t = limpar(c);
    const dentro = colchetes(t);
    // "[Hospedagem]" é item avaliado; "hospedagem" sozinho é a pergunta.
    return (dentro ? porTitulo.get(t) ?? porTitulo.get(limpar(dentro)) : porCodigo.get(t) ?? porTitulo.get(t)) ?? null;
  };

  let melhor = -1;
  let acertos = 0;
  for (let i = 0; i < Math.min(5, linhas.length); i++) {
    const n = linhas[i].filter((c) => achar(c)).length;
    if (n > acertos) [melhor, acertos] = [i, n];
  }
  if (acertos < 3) return null;

  const cabecalho = linhas[melhor];
  const largura = Math.max(cabecalho.length, ...linhas.slice(melhor, melhor + 20).map((l) => l.length));
  const usadas = new Set<string>();
  const chaves: Array<string | null> = Array.from({ length: largura }, (_, i) => {
    const chave = achar(cabecalho[i] ?? null);
    if (!chave || usadas.has(chave)) return null;
    usadas.add(chave);
    return chave;
  });
  // Planilha de tabulação de 2026: algumas colunas não têm título próprio, vale a posição.
  const posicional = alvos.filter((a) => a.coluna && chaves[a.coluna - 1] === a.chave).length >= 20;
  let colunaData: number | null = null;
  let colunaLocal: number | null = null;
  const ignoradas: string[] = [];
  for (let i = 0; i < largura; i++) {
    const t = limpar(cabecalho[i]);
    if (chaves[i]) continue;
    if (DATA.has(t) && colunaData === null) colunaData = i;
    else if (LOCAL.has(t) && colunaLocal === null) colunaLocal = i;
    else {
      const alvo = posicional ? alvos.find((a) => a.coluna === i + 1 && !usadas.has(a.chave)) : undefined;
      if (alvo) {
        usadas.add(alvo.chave);
        chaves[i] = alvo.chave;
      } else if (t) ignoradas.push(String(cabecalho[i]).trim().slice(0, 80));
    }
  }
  return { linhaCabecalho: melhor, chaves, colunaData, colunaLocal, ignoradas };
}
