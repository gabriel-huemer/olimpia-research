// Formato do Panorama (aba "Visão geral executiva"). Tipos usados pelo servidor e pelo navegador.

export interface PanoramaDados {
  /** Total de pesquisas no recorte. 0 = ainda não há dados (as telas mostram "—"). */
  pesquisasColetadas: number;
  /** Comparação com o período anterior equivalente. */
  crescimento: string;
  permanenciaMedia: string;
  nps: number;
  promotores: number;
  neutros: number;
  detratores: number;
  /** Quantas pesquisas tinham a nota de recomendação (base do NPS). */
  respostasNps: number;
  sazonalidade: Array<{ mes: string; valor: number; pesquisas: number; noPeriodo: boolean }>;
  anoSazonalidade: number;
  origensEstados: Array<{ uf: string; percentual: number; detalhe?: string }>;
  visitanteRecorrente: { sim: number; nao: number };
  intencaoRetorno: number;
}

export const panoramaVazio: PanoramaDados = {
  pesquisasColetadas: 0,
  crescimento: "",
  permanenciaMedia: "—",
  nps: 0,
  promotores: 0,
  neutros: 0,
  detratores: 0,
  respostasNps: 0,
  sazonalidade: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((mes) => ({
    mes,
    valor: 0,
    pesquisas: 0,
    noPeriodo: false,
  })),
  anoSazonalidade: 0,
  origensEstados: [],
  visitanteRecorrente: { sim: 0, nao: 0 },
  intencaoRetorno: 0,
};
