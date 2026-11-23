import { agruparEstados } from "@/lib/estados";
import { getDbPool } from "@/lib/db";
import type { AnalyticsFilters } from "@/lib/paineis-types";
import { comparacao, diaSql, hojeLocal, intervaloAno, resolverPeriodo, type Intervalo } from "@/lib/periodo";
import { panoramaVazio, type PanoramaDados } from "@/lib/panorama-types";

// Indicadores do Panorama calculados direto do PostgreSQL (oto.pesquisa / resposta / resposta_valor).
// Respostas SUSPEITA ou EXCLUIDA ficam de fora dos indicadores (mesma regra da vw_resposta_valida, RF12/RF14).

export const VALIDA = "r.situacao IN ('NORMAL', 'APROVADA', 'CORRIGIDA')";
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Rótulos dos filtros da tela -> trechos dos rótulos das opções no formulário
const HOSPEDAGEM: Record<string, string[]> = {
  Hotéis: ["Hotel", "Hotel fazenda"],
  Resorts: ["Resort"],
  Aluguel: ["Imóvel alugado%"],
  Parentes: ["Casa de Parentes%"],
};
const TRANSPORTE: Record<string, string[]> = {
  Carro: ["Veículo próprio", "Veículo alugado"],
  Ônibus: ["Ônibus%"],
  Avião: ["Aéreo"],
};
export const FAIXAS_IDADE: Record<string, [number, number]> = {
  "0 a 12": [0, 12],
  "13 a 17": [13, 17],
  "18 a 29": [18, 29],
  "30 a 44": [30, 44],
  "45+": [45, 200],
};

type Params = unknown[];

/** Monta o WHERE (alias `p` = pesquisa) a partir dos filtros da tela; `intervalo` troca só o período. */
export function montarFiltro(f: AnalyticsFilters, intervalo?: Intervalo): { where: string; params: Params } {
  const cond: string[] = ["TRUE"];
  const params: Params = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const respostaOpcao = (codigo: string, extra: string) =>
    `EXISTS (SELECT 1 FROM oto.resposta r JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = ${add(codigo)}
       JOIN oto.resposta_valor rv ON rv.resposta_id = r.id JOIN oto.opcao o ON o.id = rv.opcao_id
       WHERE r.pesquisa_id = p.id AND ${VALIDA} AND (${extra}))`;

  const { inicio, fim } = intervalo ?? resolverPeriodo(f.periodo, hojeLocal());
  cond.push(`p.iniciada_em >= ${diaSql(add(inicio))} AND p.iniciada_em < ${diaSql(add(fim))}`);

  if (f.genero && f.genero !== "Todos") cond.push(respostaOpcao("genero", `o.rotulo = ${add(f.genero)}`));

  if (f.faixaIdade && f.faixaIdade !== "Todas" && FAIXAS_IDADE[f.faixaIdade]) {
    const [min, max] = FAIXAS_IDADE[f.faixaIdade];
    cond.push(
      `EXISTS (SELECT 1 FROM oto.resposta r JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = 'idade'
         JOIN oto.resposta_valor rv ON rv.resposta_id = r.id
         WHERE r.pesquisa_id = p.id AND ${VALIDA} AND rv.valor_numero BETWEEN ${add(min)} AND ${add(max)})`
    );
  }

  if (f.cidade && f.cidade !== "Todas") {
    const i = f.cidade.lastIndexOf(",");
    const nome = f.cidade.slice(0, i).trim();
    const uf = f.cidade.slice(i + 1).trim();
    cond.push(
      `EXISTS (SELECT 1 FROM oto.resposta r JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = 'cidade'
         JOIN oto.resposta_valor rv ON rv.resposta_id = r.id JOIN oto.municipio m ON m.codigo_ibge = rv.municipio_ibge
         WHERE r.pesquisa_id = p.id AND ${VALIDA} AND m.nome = ${add(nome)} AND m.uf_sigla = ${add(uf)})`
    );
  }

  if (f.hospedagem && f.hospedagem !== "Todas" && HOSPEDAGEM[f.hospedagem]) {
    cond.push(respostaOpcao("hospedagem", `o.rotulo ILIKE ANY(${add(HOSPEDAGEM[f.hospedagem])})`));
  }
  if (f.transporte && f.transporte !== "Todos" && TRANSPORTE[f.transporte]) {
    cond.push(respostaOpcao("transporte", `o.rotulo ILIKE ANY(${add(TRANSPORTE[f.transporte])})`));
  }
  if (f.localPesquisa && f.localPesquisa !== "Todos") {
    cond.push(
      `EXISTS (SELECT 1 FROM oto.local_coleta lc WHERE lc.id = p.local_coleta_id AND starts_with(lc.nome, ${add(f.localPesquisa)}))`
    );
  }
  return { where: cond.join(" AND "), params };
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

export async function calcularPanorama(filtros: AnalyticsFilters): Promise<PanoramaDados> {
  const db = getDbPool();
  const { where, params } = montarFiltro(filtros);
  const hoje = hojeLocal();
  const periodo = resolverPeriodo(filtros.periodo, hoje);
  const anterior = comparacao(periodo, hoje);
  const rAnterior = montarFiltro(filtros, anterior);
  // A sazonalidade mostra sempre o ano inteiro (o do fim do período), com os demais filtros.
  const ano = new Date(Date.parse(periodo.fim) - 1).getUTCFullYear();
  const rAno = montarFiltro(filtros, intervaloAno(ano));
  const base = `FROM oto.pesquisa p WHERE ${where}`;
  const respostasDe = (codigo: string) =>
    `FROM oto.pesquisa p JOIN oto.resposta r ON r.pesquisa_id = p.id AND ${VALIDA}
       JOIN oto.pergunta pg ON pg.id = r.pergunta_id AND pg.codigo = '${codigo}'
       JOIN oto.resposta_valor rv ON rv.resposta_id = r.id WHERE ${where}`;

  const [totais, totaisAnterior, sazonal, perm, nps, estados, recorrente, retorno] = await Promise.all([
    db.query(`SELECT count(*)::int AS total ${base}`, params),
    db.query(`SELECT count(*)::int AS total FROM oto.pesquisa p WHERE ${rAnterior.where}`, rAnterior.params),
    db.query(
      `SELECT extract(month FROM p.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::int AS mes, count(*)::int AS n
         FROM oto.pesquisa p WHERE ${rAno.where} GROUP BY 1`,
      rAno.params
    ),
    db.query(`SELECT avg(rv.valor_numero) AS media ${respostasDe("pernoites")} AND rv.valor_numero > 0`, params),
    db.query(
      `SELECT count(*) FILTER (WHERE rv.valor_numero >= 9)::int AS promotores,
              count(*) FILTER (WHERE rv.valor_numero BETWEEN 7 AND 8.99)::int AS neutros,
              count(*) FILTER (WHERE rv.valor_numero < 7)::int AS detratores
       ${respostasDe("nps")} AND rv.valor_numero IS NOT NULL`,
      params
    ),
    db.query(
      `SELECT o.rotulo, count(DISTINCT p.id)::int AS n
       ${respostasDe("estado").replace("WHERE", "JOIN oto.opcao o ON o.id = rv.opcao_id WHERE")} GROUP BY 1`,
      params
    ),
    db.query(
      `SELECT count(DISTINCT p.id) FILTER (WHERE o.rotulo ILIKE '%visitei%')::int AS sim,
              count(DISTINCT p.id) FILTER (WHERE o.rotulo ILIKE '1%vez%')::int AS nao
       ${respostasDe("costuma_visitar").replace("WHERE", "JOIN oto.opcao o ON o.id = rv.opcao_id WHERE")}`,
      params
    ),
    db.query(
      `SELECT count(DISTINCT p.id) FILTER (WHERE o.rotulo = 'Sim')::int AS sim, count(DISTINCT p.id)::int AS total
       ${respostasDe("voltaria").replace("WHERE", "JOIN oto.opcao o ON o.id = rv.opcao_id WHERE")}`,
      params
    ),
  ]);

  const total: number = totais.rows[0].total;
  const totalAnterior: number = totaisAnterior.rows[0].total;
  const variacao = totalAnterior === 0 ? 0 : Math.round(((total - totalAnterior) / totalAnterior) * 100);
  const crescimento = periodo.inicio > hoje
    ? "Este período ainda não começou"
    : totalAnterior === 0
      ? `Sem coletas no ${anterior.nome} para comparar`
      : `${variacao > 0 ? "+" : ""}${variacao}% em relação ao ${anterior.nome}`;

  const porMes = new Map<number, number>(sazonal.rows.map((r) => [r.mes, r.n]));
  const maior = Math.max(1, ...porMes.values());
  const sazonalidade = MESES.map((mes, i) => {
    const n = porMes.get(i + 1) ?? 0;
    const inicioMes = `${ano}-${String(i + 1).padStart(2, "0")}-01`;
    const fimMes = i === 11 ? `${ano + 1}-01-01` : `${ano}-${String(i + 2).padStart(2, "0")}-01`;
    const noPeriodo = inicioMes < periodo.fim && fimMes > periodo.inicio;
    return { mes, pesquisas: n, valor: Math.round((n / maior) * 100), noPeriodo };
  });

  if (total === 0) return { ...panoramaVazio, crescimento, sazonalidade, anoSazonalidade: ano };

  const { promotores = 0, neutros = 0, detratores = 0 } = nps.rows[0] ?? {};
  const baseNps = promotores + neutros + detratores;
  const pProm = pct(promotores, baseNps);
  const pDet = pct(detratores, baseNps);

  // UF extraída de "São Paulo (SP)"
  const origensEstados = agruparEstados(
    estados.rows.map((r) => ({ uf: /\(([A-Z]{2})\)\s*$/.exec(r.rotulo)?.[1] ?? "Exterior", n: r.n as number }))
  );

  const { sim = 0, nao = 0 } = recorrente.rows[0] ?? {};
  const baseRec = sim + nao;
  const media = perm.rows[0]?.media;

  return {
    pesquisasColetadas: total,
    crescimento,
    permanenciaMedia: media === null || media === undefined ? "—" : Number(media).toFixed(1).replace(".", ","),
    nps: baseNps ? pProm - pDet : 0,
    promotores: pProm,
    neutros: baseNps ? 100 - pProm - pDet : 0,
    detratores: pDet,
    respostasNps: baseNps,
    sazonalidade,
    anoSazonalidade: ano,
    origensEstados,
    visitanteRecorrente: { sim: pct(sim, baseRec), nao: baseRec ? 100 - pct(sim, baseRec) : 0 },
    intencaoRetorno: pct(retorno.rows[0]?.sim ?? 0, retorno.rows[0]?.total ?? 0),
  };
}
