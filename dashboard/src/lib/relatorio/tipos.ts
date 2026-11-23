import type { AnalyticsFilters, Fatia, Paineis } from "../paineis-types";
import type { Granularidade, PontoSerie } from "./serie.ts";

/** Números de um intervalo. null = ninguém respondeu. */
export interface Medidas {
  n: number;
  nps: number | null;
  promotores: number | null;
  neutros: number | null;
  detratores: number | null;
  permanencia: number | null;
  gasto: number | null;
  retorno: number | null;
  primeiraVez: number | null;
}
export type PontoMedido = PontoSerie & Medidas;

export interface Conceitos {
  nome: string;
  otimo: number;
  regular: number;
  ruim: number;
  n: number;
}

export interface DadosRelatorio {
  filtros: Required<AnalyticsFilters>;
  /** Dia da emissão e limites do período, AAAA-MM-DD (fim incluso). */
  emitidoEm: string;
  de: string;
  ate: string;
  ficticio: boolean;
  paineis: Paineis;
  total: Medidas;
  granularidade: Granularidade;
  serie: PontoMedido[];
  servicos: Conceitos[];
  estados: Fatia[];
  comQuem: Fatia[];
  locais: Fatia[];
  qualidade: { recebidas: number; emRevisao: number; comExcluida: number; pesquisadores: number };
}
