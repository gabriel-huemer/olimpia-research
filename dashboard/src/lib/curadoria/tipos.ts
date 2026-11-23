export type Decisao = "APROVAR" | "CORRIGIR" | "EXCLUIR";

export interface ItemFila {
  id: string;
  protocolo: string;
  pergunta: string;
  motivos: string[];
  operador: string;
  coletada: string;
  criadaEm: string;
}

export interface RespostaDetalhe {
  pergunta: string;
  valor: string;
  sinalizada: boolean;
}

export interface DetalheCuradoria {
  id: string;
  protocolo: string;
  origem: string;
  operador: string;
  local: string;
  coletada: string;
  pergunta: string;
  tipo: string;
  motivos: string[];
  mantidoPeloPesquisador: boolean;
  valorOriginal: string;
  status: "PENDENTE" | "APROVADA" | "CORRIGIDA" | "EXCLUIDA";
  curador: string | null;
  justificativa: string | null;
  respostas: RespostaDetalhe[];
}
