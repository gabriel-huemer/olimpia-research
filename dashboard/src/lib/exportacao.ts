// Linhas da planilha exportada em cada aba de Análises: sempre os números que estão na tela (RF24).
import type { Aba, AnalyticsFilters, Fatia, NotaItem, Paineis } from "./paineis-types";

import { rotuloPeriodo } from "./periodo.ts";

type Linha = Record<string, unknown>;

const fatias = (indicador: string, lista: Fatia[]): Linha[] =>
  lista.map((f) => ({ Indicador: indicador, Item: f.rotulo, Respostas: f.n, Percentual: f.percentual }));
const notas = (indicador: string, lista: NotaItem[]): Linha[] =>
  lista.map((i) => ({ Indicador: indicador, Item: i.nome, Respostas: i.avaliacoes, Valor: i.nota }));

export function linhasDaAba(aba: Aba, p: Paineis, filtros: AnalyticsFilters): Linha[] {
  const valor = (indicador: string, v: unknown, n?: number): Linha => ({ Indicador: indicador, Respostas: n, Valor: v });
  const linhas: Record<Aba, () => Linha[]> = {
    panorama: () => [
      valor("Pesquisas coletadas", p.panorama.pesquisasColetadas),
      valor("Permanência média (noites)", p.panorama.permanenciaMedia),
      valor("NPS", p.panorama.nps, p.panorama.respostasNps),
      valor("Intenção de retorno (%)", p.panorama.intencaoRetorno),
      valor("Visitante recorrente (%)", p.panorama.visitanteRecorrente.sim),
      ...p.panorama.sazonalidade.map((m) => ({ Indicador: `Pesquisas por mês (${p.panorama.anoSazonalidade})`, Item: m.mes, Respostas: m.pesquisas })),
      ...p.panorama.origensEstados.map((o) => ({ Indicador: "Origem por estado", Item: o.uf, Percentual: o.percentual })),
    ],
    infraestrutura: () => [
      ...notas("Nota do serviço (1 a 5)", p.infraestrutura.servicos),
      ...fatias("Expectativa atendida", p.infraestrutura.expectativa),
      ...(p.infraestrutura.gruposPcd === null ? [] : [valor("Grupos com PcD (%)", p.infraestrutura.gruposPcd)]),
      ...fatias("Tipo de deficiência", p.infraestrutura.tiposPcd),
    ],
    impacto: () => [
      valor("Gasto médio diário (R$)", p.impacto.gastoDiarioMedio, p.impacto.respostasGasto),
      ...fatias("Renda familiar", p.impacto.renda),
      ...p.impacto.gastoPorRenda.map((g) => ({ Indicador: "Gasto por renda (R$)", Item: g.faixa, Respostas: g.n, Valor: g.valor })),
      ...fatias("Antecedência", p.impacto.antecedencia),
      ...fatias("Hospedagem", p.impacto.hospedagem),
      ...fatias("Refeições", p.impacto.refeicoes),
    ],
    perfil: () => [
      ...fatias("Idade", p.perfil.idades),
      ...p.perfil.cidades.map((c) => ({
        Indicador: "Cidade de origem", Item: c.cidade, Respostas: c.respostas, Percentual: c.percentual, Valor: c.gastoMedio,
      })),
      ...fatias("Escolaridade", p.perfil.escolaridade),
      ...fatias("Estado civil", p.perfil.estadoCivil),
      ...fatias("Como conheceu", p.perfil.conhecimento),
      ...fatias("Motivação", p.perfil.motivos),
      ...p.perfil.concorrencia.map((c) => ({ Indicador: "Concorrência", Item: c.rotulo, Respostas: c.n })),
    ],
    atracoes: () => [
      ...notas("Nota do atrativo (1 a 5)", p.atracoes.atrativos),
      ...fatias("Meio de transporte", p.atracoes.transporte),
      ...fatias("Do aeroporto", p.atracoes.aeroporto),
    ],
  };
  const recorte = Object.fromEntries(Object.entries(filtros).map(([k, v]) => [`Filtro_${k}`, k === "periodo" ? rotuloPeriodo(v) : v]));
  // Todas as colunas em todas as linhas: o gerador de planilha usa as chaves da primeira.
  return linhas[aba]().map((l) => ({ Indicador: "", Item: "", Respostas: "", Percentual: "", Valor: "", ...semVazios(l), ...recorte }));
}

const semVazios = (l: Linha) => Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined && v !== null));
