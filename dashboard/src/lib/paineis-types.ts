// Formato das abas de Análises (além do Panorama). Usado pelo servidor e pelo navegador.
import { panoramaVazio, type PanoramaDados } from "./panorama-types";

export interface Fatia {
  rotulo: string;
  percentual: number;
  n: number;
}

export interface NotaItem {
  nome: string;
  nota: number;
  avaliacoes: number;
}

export interface InfraestruturaDados {
  servicos: NotaItem[];
  expectativa: Fatia[];
  gruposPcd: number | null;
  tiposPcd: Fatia[];
  /** Texto livre: só para quem tem login (pode identificar pessoas). null = visitante. */
  oQueFalta: string[] | null;
}

export interface ImpactoDados {
  gastoDiarioMedio: number | null;
  respostasGasto: number;
  renda: Fatia[];
  gastoPorRenda: Array<{ faixa: string; valor: number; n: number }>;
  antecedencia: Fatia[];
  hospedagem: Fatia[];
  refeicoes: Fatia[];
}

export interface PerfilDados {
  idades: Fatia[];
  cidades: Array<{ cidade: string; respostas: number; percentual: number; gastoMedio: number | null }>;
  escolaridade: Fatia[];
  estadoCivil: Fatia[];
  conhecimento: Fatia[];
  motivos: Fatia[];
  concorrencia: Fatia[];
}

export interface AtracoesDados {
  atrativos: NotaItem[];
  transporte: Fatia[];
  aeroporto: Fatia[];
}

export interface OpcoesFiltro {
  periodos: string[];
  generos: string[];
  cidades: string[];
  locais: string[];
}

export interface Paineis {
  panorama: PanoramaDados;
  infraestrutura: InfraestruturaDados;
  impacto: ImpactoDados;
  perfil: PerfilDados;
  atracoes: AtracoesDados;
}

export type Aba = keyof Paineis;
export const ABAS: readonly Aba[] = ["panorama", "infraestrutura", "impacto", "perfil", "atracoes"];

export interface AnalyticsFilters {
  periodo?: string;
  genero?: string;
  faixaIdade?: string;
  cidade?: string;
  hospedagem?: string;
  transporte?: string;
  localPesquisa?: string;
}

export const paineisVazios: Paineis = {
  panorama: panoramaVazio,
  infraestrutura: { servicos: [], expectativa: [], gruposPcd: null, tiposPcd: [], oQueFalta: null },
  impacto: {
    gastoDiarioMedio: null,
    respostasGasto: 0,
    renda: [],
    gastoPorRenda: [],
    antecedencia: [],
    hospedagem: [],
    refeicoes: [],
  },
  perfil: { idades: [], cidades: [], escolaridade: [], estadoCivil: [], conhecimento: [], motivos: [], concorrencia: [] },
  atracoes: { atrativos: [], transporte: [], aeroporto: [] },
};

/** "/analises/perfil-turista" -> "perfil"; null fora de Análises. */
export function abaDaRota(pathname: string): Aba | null {
  const slug = /^\/analises\/([a-z-]+)/.exec(pathname)?.[1];
  const aba = slug?.split("-")[0] as Aba | undefined;
  return aba && ABAS.includes(aba) ? aba : null;
}
