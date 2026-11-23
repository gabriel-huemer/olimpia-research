import type { AnalyticsFilters } from "./paineis-types";

/** Filtros das Análises vindos da URL; o que falta vira "sem filtro" (período: ano corrente). */
export function lerFiltros(q: URLSearchParams): Required<AnalyticsFilters> {
  return {
    periodo: q.get("periodo") || `Ano ${new Date().getFullYear()}`,
    genero: q.get("genero") || "Todos",
    faixaIdade: q.get("faixaIdade") || "Todas",
    cidade: q.get("cidade") || "Todas",
    hospedagem: q.get("hospedagem") || "Todas",
    transporte: q.get("transporte") || "Todos",
    localPesquisa: q.get("localPesquisa") || "Todos",
  };
}
